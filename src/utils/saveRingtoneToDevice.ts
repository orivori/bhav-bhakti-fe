import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import i18n from 'i18next';
import { Feed } from '@/types/feed';
import {
  authorizeMediaAction,
  AuthorizeMediaActionOptions,
} from '@/features/feed/services/mediaAccess';
import { ensureMediaLibraryPermission } from './mediaLibraryPermission';
import { openSoundSettings } from './openSoundSettings';

// The one place "Set as Ringtone" saves a ringtone to the phone (Android) -
// Home's AutoplayFeedCard and the Ringtones tab's RingtoneFeedCard. Modelled
// on saveFeedToGallery.ts (wallpapers).
//
// Saves into an album named exactly "Ringtones". expo-media-library puts
// audio albums under Music/, so the file lands in Music/Ringtones/, and
// Android flags any audio file whose path contains a /Ringtones/ folder as a
// ringtone (IS_RINGTONE - MediaProvider's computeAudioTypeValuesFromData,
// applied by the scan that runs when the file is published). That is what
// makes it show up in the phone's own ringtone list. Any other album name
// would lose the flag.
//
// One readable, fixed name per ringtone ("Bhav Bhakti - <English title>.mp3"),
// the same from both cards and in both languages, so a repeat save is
// detected: if that file is already in the album, nothing is downloaded,
// saved or counted. (Android would otherwise save a second copy as "... (1)".)
// The ringtone list shows the file's name without ".mp3" - unless the audio
// file carries its own embedded title tag, which then wins.
export const RINGTONE_ALBUM_NAME = 'Ringtones';

const NAME_PREFIX = 'Bhav Bhakti - ';
const MAX_NAME_LENGTH = 80;

export type SaveRingtoneStatus =
  // Saved now - the caller counts it.
  | 'saved'
  // Already in the album - not saved again, not counted.
  | 'already_saved'
  // Stopped with nothing saved: no permission (its alert is already shown)
  // or the media gate said no (paywall/session prompt already shown).
  | 'cancelled';

export interface SaveRingtoneResult {
  status: SaveRingtoneStatus;
  // The ringtone's name on the phone, without the extension.
  name: string;
}

interface SaveRingtoneOptions {
  authorizeOptions?: AuthorizeMediaActionOptions;
}

function getAudioFileExtension(url: string | undefined): string {
  const extension = (url || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  return ['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(extension) ? extension : 'mp3';
}

// Characters that can't be in a file name (/ \ : * ? " < > | and control
// characters), plus ! ~ ' which Android leaves unencoded in a file URI and
// which would then fail expo-media-library's file-type check (it reads the
// extension with MimeTypeMap.getFileExtensionFromUrl, which only accepts
// letters, digits and _ . - ( ) %).
const UNSAFE_NAME_CHARACTERS = /[\/\\:*?"<>|!~'\u0000-\u001f\u007f]/g;

function cleanTitle(title: string): string {
  return title
    .replace(UNSAFE_NAME_CHARACTERS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// "Bhav Bhakti - <title>" (no extension): the English title, then the Hindi
// title, then the feed id - never the app's current language, so the name is
// the same for everyone.
export function getRingtoneName(feed: Pick<Feed, 'id' | 'title'>): string {
  const title = cleanTitle(feed.title?.en || '') || cleanTitle(feed.title?.hi || '');
  const name = title ? `${NAME_PREFIX}${title}` : `${NAME_PREFIX}Ringtone ${feed.id}`;
  return name.slice(0, MAX_NAME_LENGTH).replace(/[\s.]+$/, '').replace(/^[\s.]+/, '');
}

// Fallback name with no spaces or non-ASCII characters - only used if the
// readable name is ever rejected by the save (see saveRingtoneToDevice).
function toSafeAsciiName(name: string, feedId: Feed['id']): string {
  const safe = name
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_.\-()]/g, '')
    .replace(/_+/g, '_');
  return safe.replace(/^Bhav_Bhakti_-_?$/, '') ? safe : `Bhav_Bhakti_-_Ringtone_${feedId}`;
}

// Null when the album doesn't exist yet, or can't be looked up. Either way
// the caller just saves, so a failed lookup never blocks a download.
async function findAlbum(): Promise<MediaLibrary.Album | null> {
  try {
    return await MediaLibrary.getAlbumAsync(RINGTONE_ALBUM_NAME);
  } catch (error) {
    console.warn('saveRingtoneToDevice: album lookup failed, saving without the duplicate check:', error);
    return null;
  }
}

async function albumHasFile(album: MediaLibrary.Album, filenames: string[]): Promise<boolean> {
  try {
    let after: string | undefined;
    for (;;) {
      const page = await MediaLibrary.getAssetsAsync({
        album,
        after,
        first: 500,
        mediaType: MediaLibrary.MediaType.audio,
      });
      if (page.assets.some((asset) => filenames.includes(asset.filename))) return true;
      if (!page.hasNextPage) return false;
      after = page.endCursor;
    }
  } catch (error) {
    console.warn('saveRingtoneToDevice: album listing failed, saving without the duplicate check:', error);
    return false;
  }
}

async function saveIntoAlbum(localUri: string, album: MediaLibrary.Album | null): Promise<void> {
  if (album) {
    await MediaLibrary.createAssetAsync(localUri, album);
  } else {
    // Android can't create an empty album - the first file creates it.
    await MediaLibrary.createAlbumAsync(RINGTONE_ALBUM_NAME, undefined, false, localUri);
  }
}

// Throws on a failed download or save - callers show showRingtoneErrorAlert().
export async function saveRingtoneToDevice(
  feed: Feed,
  { authorizeOptions }: SaveRingtoneOptions = {}
): Promise<SaveRingtoneResult> {
  const name = getRingtoneName(feed);
  if (!feed.url) throw new Error('No audio file found for this ringtone.');
  if (!(await ensureMediaLibraryPermission('common.permissionReasonSetRingtone', 'ringtone'))) {
    return { status: 'cancelled', name };
  }

  const extension = getAudioFileExtension(feed.url);
  const filename = `${name}.${extension}`;
  const safeName = toSafeAsciiName(name, feed.id);
  const safeFilename = `${safeName}.${extension}`;

  const album = await findAlbum();
  // Checked before the gate on purpose: the gate is also what counts the
  // download (POST /feed/:id/download), and a repeat isn't a new download.
  if (album && (await albumHasFile(album, [filename, safeFilename]))) {
    return { status: 'already_saved', name };
  }

  if (!(await authorizeMediaAction(feed, 'download', authorizeOptions))) {
    return { status: 'cancelled', name };
  }

  // The staging file's name becomes the saved file's name. The destination
  // is percent-encoded and the library gets downloadResult.uri (also
  // encoded): expo-file-system writes the decoded name (with its spaces),
  // and the library's file-type check reads the encoded URI.
  const stagingUri = `${FileSystem.cacheDirectory}${encodeURIComponent(filename)}`;
  const downloadResult = await FileSystem.downloadAsync(feed.url, stagingUri);
  let savedUri = downloadResult.uri;
  try {
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    try {
      await saveIntoAlbum(downloadResult.uri, album);
      return { status: 'saved', name };
    } catch (error) {
      // Not expected (see above), but never lose the save over the name:
      // retry once under a plain ASCII name.
      console.warn(`saveRingtoneToDevice: saving as "${filename}" failed, retrying as "${safeFilename}":`, error);
      savedUri = `${FileSystem.cacheDirectory}${safeFilename}`;
      await FileSystem.moveAsync({ from: downloadResult.uri, to: savedUri });
      await saveIntoAlbum(savedUri, album);
      return { status: 'saved', name: safeName };
    }
  } finally {
    // Best-effort: the copy in Ringtones is what matters. cacheEviction.ts's
    // startup sweep catches anything a crash leaves behind.
    FileSystem.deleteAsync(savedUri, { idempotent: true }).catch(() => {});
  }
}

// The one alert after a ringtone save (both cards). Nothing to show for
// 'cancelled' - the permission or premium prompt was already shown.
export function showRingtoneSaveAlert(result: SaveRingtoneResult): void {
  if (result.status === 'cancelled') return;
  const saved = result.status === 'saved';
  Alert.alert(
    saved ? i18n.t('feedCard.ringtoneSaveTitle') : i18n.t('common.alreadySavedTitle'),
    i18n.t(saved ? 'feedCard.ringtoneSaveMessage' : 'feedCard.ringtoneAlreadySavedMessage', { name: result.name }),
    [
      { text: i18n.t('feedCard.openSoundSettings'), onPress: openSoundSettings },
      { text: i18n.t('feedCard.ok'), style: 'default' },
    ]
  );
}

export function showRingtoneErrorAlert(): void {
  Alert.alert(i18n.t('common.error'), i18n.t('feedCard.ringtoneErrorMessage'));
}
