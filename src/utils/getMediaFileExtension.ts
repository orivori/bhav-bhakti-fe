const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];

// Shared by useWallpaperActions/AutoplayFeedCard/FeedCard's download handlers
// - all three previously hardcoded a .jpg extension regardless of the real
// media type, so a video download's bytes (correctly the actual video file)
// landed under a mismatched .jpg filename, which the OS's gallery then
// miscategorized/misrendered as a static image instead of a playable video.
// Mirrors RingtoneFeedCard.tsx's getAudioFileExtension (born from an
// identical real bug there - see CLAUDE.md - "was reading the URL's
// ?alt=media query string"): strip the query string, extract the real
// extension from the path, validate against a type-appropriate allowlist,
// fall back to a safe default per type if the URL's extension is missing or
// unrecognized.
export function getMediaFileExtension(mediaUrl: string, mediaType?: string): string {
  const isVideo = mediaType === 'video';
  const allowedExtensions = isVideo ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
  const fallback = isVideo ? 'mp4' : 'jpg';

  const pathWithoutQuery = mediaUrl.split('?')[0];
  const urlParts = pathWithoutQuery.split('.');
  const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : fallback;

  return allowedExtensions.includes(extension) ? extension : fallback;
}

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

// Companion to getMediaFileExtension above - needed by react-native-share's
// Share.open(), which requires a real MIME `type` (not just a file
// extension) to correctly attach a local image/video file to the share
// intent alongside caption text.
export function getMediaMimeType(mediaUrl: string, mediaType?: string): string {
  const extension = getMediaFileExtension(mediaUrl, mediaType);
  return MIME_TYPES[extension] ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
}
