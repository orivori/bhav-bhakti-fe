import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Feed } from '@/types/feed';
import {
  authorizeMediaAction,
  AuthorizeMediaActionOptions,
} from '@/features/feed/services/mediaAccess';
import { getMediaFileExtension } from './getMediaFileExtension';
import { ensureMediaLibraryPermission } from './mediaLibraryPermission';

// The one place every "save this wallpaper/video to the phone" button goes
// through (Wallpaper Hub download, Home's Set as Wallpaper, FeedCard's
// download). Ringtones are separate - they go to Music/Ringtones, not here.
//
// Saves into a "Bhav Bhakti" album - Pictures/Bhav Bhakti/ on Android -
// rather than plain saveToLibraryAsync(), which expo-media-library always
// puts in DCIM/, mixed in with the user's camera photos.
//
// One fixed filename per feed (bhav_bhakti_<feedId>.<ext>) so a repeat tap
// can be detected: if that file is already in the album, nothing is
// downloaded, saved or counted, and the caller shows "already saved".
// Before this, every tap saved another byte-identical copy, which gallery
// apps then collapsed into one (looking like a copy had vanished).
export const GALLERY_ALBUM_NAME = 'Bhav Bhakti';

export type SaveToGalleryResult =
  // Saved now - the caller counts it and shows its success message.
  | 'saved'
  // Already in the album - not saved again, not counted.
  | 'already_saved'
  // Stopped with nothing saved: no permission (its alert is already shown)
  // or the media gate said no (paywall/session prompt already shown).
  | 'cancelled';

interface SaveFeedToGalleryOptions {
  // i18n key (under `common`) for the permission explanation - see
  // ensureMediaLibraryPermission.
  permissionReasonKey: string;
  authorizeOptions?: AuthorizeMediaActionOptions;
}

export function getGalleryFileName(feed: Pick<Feed, 'id' | 'url' | 'mediaType'>): string {
  const extension = getMediaFileExtension(feed.url, feed.mediaType);
  return `bhav_bhakti_${feed.id}.${extension}`;
}

// Null when the album doesn't exist yet, or can't be looked up - e.g.
// Android 14's "selected photos only" access. Either way the caller just
// saves, so a failed lookup never blocks a download.
async function findAlbum(): Promise<MediaLibrary.Album | null> {
  try {
    return await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME);
  } catch (error) {
    console.warn('saveFeedToGallery: album lookup failed, saving without the duplicate check:', error);
    return null;
  }
}

async function albumHasFile(album: MediaLibrary.Album, filename: string): Promise<boolean> {
  try {
    let after: string | undefined;
    for (;;) {
      const page = await MediaLibrary.getAssetsAsync({
        album,
        after,
        first: 500,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      });
      if (page.assets.some((asset) => asset.filename === filename)) return true;
      if (!page.hasNextPage) return false;
      after = page.endCursor;
    }
  } catch (error) {
    console.warn('saveFeedToGallery: album listing failed, saving without the duplicate check:', error);
    return false;
  }
}

async function saveIntoAlbum(localUri: string, album: MediaLibrary.Album | null): Promise<void> {
  try {
    if (album) {
      await MediaLibrary.createAssetAsync(localUri, album);
    } else {
      // Android can't create an empty album - the first file creates it.
      // Passing the local file (not an existing asset) writes it straight
      // into the album, with no DCIM copy and no move-permission dialog.
      await MediaLibrary.createAlbumAsync(GALLERY_ALBUM_NAME, undefined, false, localUri);
    }
  } catch (error) {
    // Never lose the download over the album: fall back to a plain save
    // (DCIM/, as before this helper existed).
    console.error('saveFeedToGallery: album save failed, falling back to a plain gallery save:', error);
    await MediaLibrary.saveToLibraryAsync(localUri);
  }
}

// Throws on a failed download or save - callers show their own error alert.
export async function saveFeedToGallery(
  feed: Feed,
  { permissionReasonKey, authorizeOptions }: SaveFeedToGalleryOptions
): Promise<SaveToGalleryResult> {
  if (!feed.url) return 'cancelled';
  if (!(await ensureMediaLibraryPermission(permissionReasonKey, 'gallery'))) return 'cancelled';

  const filename = getGalleryFileName(feed);
  const album = await findAlbum();
  // Checked before the gate on purpose: the gate is also what counts the
  // download (POST /feed/:id/download), and a repeat isn't a new download.
  if (album && (await albumHasFile(album, filename))) return 'already_saved';

  if (!(await authorizeMediaAction(feed, 'download', authorizeOptions))) return 'cancelled';

  // The staging file's name becomes the gallery file's name, so it uses the
  // fixed filename. cacheDirectory, top level: deleted right after, and
  // cacheEviction.ts's startup sweep catches any copy a crash leaves behind.
  const stagingUri = `${FileSystem.cacheDirectory}${filename}`;
  const downloadResult = await FileSystem.downloadAsync(feed.url, stagingUri);
  try {
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    await saveIntoAlbum(downloadResult.uri, album);
  } finally {
    // Best-effort: the gallery copy is what matters.
    FileSystem.deleteAsync(stagingUri, { idempotent: true }).catch(() => {});
  }
  return 'saved';
}
