import { Alert } from 'react-native';
import Share from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import { Feed, FeedMedia } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { getMediaFileExtension, getMediaMimeType } from './getMediaFileExtension';

// Placeholder until a real app-store/download link exists - swap this one
// constant when it does, nothing else in the share flow below needs to
// change.
const APP_DOWNLOAD_LINK_PLACEHOLDER = 'https://bhavbhakti.app/download';

function buildShareCaption(): string {
  return `Shared via Bhav Bhakti — ${APP_DOWNLOAD_LINK_PLACEHOLDER}`;
}

// Share needs a real local file, not a remote URL - react-native-share's
// Share.open() only attaches actual image/video bytes to the share intent
// when given one (see ShareIntent.java's isFile() branch); a remote URL just
// gets appended as text. Downloads to cacheDirectory (not documentDirectory,
// which permanent gallery-bound downloads use) since this copy is
// share-only and temporary - react-native-share's bundled FileProvider
// already covers the full cache directory (see share_download_paths.xml),
// no extra native config needed.
// Deliberately not deleted right after Share.open() resolves: the receiving
// app can still be asynchronously reading the file's content URI after the
// promise settles, so an eager delete risks corrupting an in-flight share.
// The OS reclaims cacheDirectory on its own.
async function downloadForShare(
  mediaUrl: string,
  mediaType: string | undefined,
  feedId: string
): Promise<{ localUri: string; mimeType: string }> {
  const extension = getMediaFileExtension(mediaUrl, mediaType);
  const mimeType = getMediaMimeType(mediaUrl, mediaType);
  const fileUri = `${FileSystem.cacheDirectory}share_${feedId}_${Date.now()}.${extension}`;
  const downloadResult = await FileSystem.downloadAsync(mediaUrl, fileUri);

  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download media for sharing (status ${downloadResult.status})`);
  }

  return { localUri: downloadResult.uri, mimeType };
}

// Dispatch is based on content SHAPE (does this feed have an audio media
// item), not feed.type - a type-string whitelist is exactly the bug class
// this project has hit twice before (see CLAUDE.md's Home/Search Results
// isRepeatable-gating fixes), where a new/unlisted type silently fell
// through. image_audio is included since it's still audio content, just
// paired with an image (see resolveAudioThumbnailUrl below).
function resolveAudioMedia(feed: Feed): FeedMedia | undefined {
  return feed.media?.find((m) => m.type === 'audio' || m.type === 'image_audio');
}

function resolveVisualMedia(feed: Feed): FeedMedia | undefined {
  return (
    feed.media?.find((m) => m.type === 'video') ||
    feed.media?.find((m) => m.type === 'image') ||
    feed.media?.[0]
  );
}

// Mirrors AudioContentCard.tsx's resolveQueueItem: an image_audio row's own
// mediaUrl IS a usable image (distinct from audioUrl, the actual track)
// when there's no explicit thumbnailUrl. Returns null (not '') on a genuine
// miss - audio-player.tsx's isValidArtworkUrl guard exists specifically
// because expo-audio's native lock-screen call crashed on '' where
// undefined was expected; this function never produces that shape.
function resolveAudioThumbnailUrl(audioMedia: FeedMedia): string | null {
  if (audioMedia.thumbnailUrl) return audioMedia.thumbnailUrl;
  const audioUrl = audioMedia.audioUrl || audioMedia.mediaUrl;
  return audioMedia.mediaUrl && audioMedia.mediaUrl !== audioUrl ? audioMedia.mediaUrl : null;
}

// Per-feedId re-entrancy guard against a second share tap while one's
// already downloading/in-flight. Module-level (not component state) since
// this is a plain function with no component instance to hold it - mirrors
// audio-player.tsx's inFlightCancellations Map, the same pattern already
// used elsewhere in this codebase for exactly this kind of per-feedId
// in-flight tracking outside React state.
const inFlightShares = new Set<string>();

// Standalone, reusable share entry point for any feed - not tied to any
// component's React lifecycle. Internally reads ONLY our own Feed/FeedMedia
// data (thumbnailUrl, the caption built above) - it never opens or inspects
// the audio file itself, so it can't pick up embedded file metadata even by
// accident (see CLAUDE.md §18/§28's lock-screen artwork-mismatch bug, a
// real instance of that exact confusion elsewhere in this app).
//
// Visual content (wallpaper/video/thought - anything without an audio media
// item) shares the real file with a caption. Audio content (mantra/
// ringtone/aarti/bhajan - anything WITH an audio media item) shares only
// the thumbnail image, never the audio file; if no thumbnail resolves at
// all, it degrades to a text-only share (caption + link, no url) rather
// than substituting a fallback image or failing - a confirmed product
// decision, not an oversight.
//
// No mounted-check/cleanup equivalent needed: this function has no
// component-bound state of its own. feedService.shareFeed/incrementShare/
// downloadForShare/Share.open are all either global-store updates (safe
// post-unmount by construction, same reasoning the pre-extraction code in
// useWallpaperActions.ts already relied on) or native imperative calls with
// no React binding. The only residual risk - a caller's own `onShared`/
// `onSharePresenting` callback touching stale component state after this
// function resolves - is unchanged by this extraction; it existed
// identically before, and is each caller's responsibility (guard with their
// own isMountedRef, same as their other handlers), not this utility's.
export interface ShareContentOptions {
  // Fires once the share is actually recorded (result.success from
  // Share.open - i.e. the user picked a destination, not just dismissed the
  // sheet). For analytics/UI that should reflect a completed share.
  onShared?: (feedId: string) => void;
  // Fires right before Share.open() is invoked - the point where any
  // caller-side "downloading..." loading state should revert, since
  // Share.open()'s own promise doesn't resolve until the user dismisses the
  // native share sheet (which could be a while) and a spinner has no
  // business running through that. Also fires from the catch block if a
  // failure happens before reaching that point (the share-count API call or
  // the download itself), so a caller's loading state never gets stuck -
  // safe to call twice, callers' own revert should be idempotent.
  onSharePresenting?: () => void;
}

export async function shareContent(feed: Feed, options?: ShareContentOptions): Promise<void> {
  const { onShared, onSharePresenting } = options ?? {};
  const feedId = feed.id.toString();
  const audioMedia = resolveAudioMedia(feed);
  const visualMedia = audioMedia ? undefined : resolveVisualMedia(feed);
  if (!audioMedia && !visualMedia) return;

  if (inFlightShares.has(feedId)) return;
  inFlightShares.add(feedId);

  try {
    await feedService.shareFeed(feedId, { platform: 'native_share' });
    useFeedStore.getState().incrementShare(feedId);

    let fileToShare: { localUri: string; mimeType: string } | null = null;

    if (audioMedia) {
      const thumbnailUrl = resolveAudioThumbnailUrl(audioMedia);
      if (thumbnailUrl) {
        fileToShare = await downloadForShare(thumbnailUrl, 'image', feedId);
      }
    } else if (visualMedia) {
      fileToShare = await downloadForShare(visualMedia.mediaUrl, visualMedia.type, feedId);
    }

    onSharePresenting?.();

    const result = await Share.open({
      ...(fileToShare ? { url: fileToShare.localUri, type: fileToShare.mimeType } : {}),
      message: buildShareCaption(),
      failOnCancel: false,
    });

    if (result.success) {
      onShared?.(feedId);
    }
  } catch (error) {
    console.error('Error sharing content:', error);
    Alert.alert('Error', 'Failed to share. Please try again.');
    onSharePresenting?.();
  } finally {
    inFlightShares.delete(feedId);
  }
}
