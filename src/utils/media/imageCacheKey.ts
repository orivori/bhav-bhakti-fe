// The disk-cache key for a feed image (expo-image, via FeedImage).
//
// Every feed response carries freshly signed Cloud Storage links (V4, valid
// 72 hours), so the link's text changes on every fetch. Keyed by the link, the
// same image would be downloaded again and again. Keyed by the file's storage
// path, the same file always hits the same cache entry, whatever its
// signature. A replaced file always gets a new path (the "v2" uploads, and
// the standing rule: never replace a file at the same path), so a new file
// can never be confused with an old one.
//
// Pure, no imports - imageCacheKey.test.mjs runs it directly under Node.
//
// Signed links look like
//   https://storage.googleapis.com/<bucket>/<path>?X-Goog-Algorithm=...
// where every path segment is percent-encoded by the backend's Storage
// library (spaces as %20, Hindi as %E0..., and ! ' ( ) * as well). One
// decodeURIComponent gives back the exact storage path.
//
// The route-param problem (CLAUDE.md §68): a link that went through route
// params may arrive already decoded once (plain spaces and Hindi, no %).
// Decoding that again changes nothing, so it gets the same key. If decoding
// fails (a stray %), the raw path is used: at worst a second copy on disk,
// never a wrong image.
//
// Anything that isn't such a link gets no key (null): expo-image then keys it
// by the full link, exactly like an ordinary image.

const SIGNED_LINK_PREFIX = 'https://storage.googleapis.com/';
const MAX_LINK_LENGTH = 4096;
const KEY_PREFIX = 'img:';

export function imageCacheKey(url: unknown): string | null {
  const storagePath = storagePathFromSignedLink(url);
  return storagePath === null ? null : KEY_PREFIX + storagePath;
}

// The decoded storage path inside a signed Cloud Storage link, or null when
// the value isn't such a link. Shared by the image key above and the saved
// video file names (videoCache.ts), so both read a link the same way.
export function storagePathFromSignedLink(url: unknown): string | null {
  if (typeof url !== 'string' || url.length === 0 || url.length > MAX_LINK_LENGTH) return null;

  // The signature lives in the query string; the fragment is never part of the file.
  const cutAt = url.search(/[?#]/);
  const base = cutAt === -1 ? url : url.slice(0, cutAt);
  if (!base.startsWith(SIGNED_LINK_PREFIX)) return null;

  // <bucket>/<path>: the bucket is left out of the key (there is one bucket).
  const rest = base.slice(SIGNED_LINK_PREFIX.length);
  const slashAt = rest.indexOf('/');
  if (slashAt <= 0) return null;
  const path = rest.slice(slashAt + 1);
  if (path.length === 0) return null;

  try {
    return decodeURIComponent(path);
  } catch {
    // Malformed % - keep the raw path.
    return path;
  }
}
