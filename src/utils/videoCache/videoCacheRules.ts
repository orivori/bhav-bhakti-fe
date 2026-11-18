// Pure rules for saving video wallpapers on the phone (videoCache.ts).
// No imports, so Node's test runner loads it directly (videoCacheRules.test.mjs).
//
// Why: the signed link changes on every list fetch, so expo-video's own cache
// (keyed by the full link) misses on every launch. A video is saved instead as
//   video_<feedId>_<8-hex hash of its storage path>.mp4
// in the cache folder. A replaced file (the "v2" uploads) has a new path, so a
// new hash and a new file: an old copy is never played for a new video.
// Saving starts only once a tile has really played for a moment, so quick
// scroll-pasts never download anything extra.

export const VIDEO_FILE_PREFIX = 'video_';
export const VIDEO_FILE_EXTENSION = '.mp4';
// Oldest-saved files are removed past this total.
export const VIDEO_CACHE_MAX_BYTES = 150 * 1024 * 1024;
// A save starts after this much real playback (or at the end, for shorter clips).
export const VIDEO_SAVE_AFTER_MS = 2000;
// At most this many saves at once; the rest wait their turn.
export const MAX_CONCURRENT_VIDEO_SAVES = 2;

const FEED_ID_PATTERN = /^[1-9][0-9]{0,8}$/;
const FILE_NAME_PATTERN = /^video_([1-9][0-9]{0,8})_([0-9a-f]{8})\.mp4$/;

// FNV-1a, 32 bit, as 8 lower-case hex characters. Not security - only a short,
// stable fingerprint of the storage path. Hashes UTF-16 code units, so Hindi
// paths work without any encoding step.
export function hashStoragePath(storagePath: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < storagePath.length; i += 1) {
    hash ^= storagePath.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// The saved file's name, or null when the feed id or path isn't usable (then
// the video is simply streamed, as before).
export function videoFileName(feedId: unknown, storagePath: unknown): string | null {
  const id = typeof feedId === 'number' ? String(feedId) : feedId;
  if (typeof id !== 'string' || !FEED_ID_PATTERN.test(id)) return null;
  if (typeof storagePath !== 'string' || storagePath.length === 0) return null;
  return `${VIDEO_FILE_PREFIX}${id}_${hashStoragePath(storagePath)}${VIDEO_FILE_EXTENSION}`;
}

// A saved video's name read back; null for anything else (audio cache files,
// .part files, other apps' files).
export function parseVideoFileName(name: string): { feedId: string; hash: string } | null {
  const match = FILE_NAME_PATTERN.exec(name);
  return match ? { feedId: match[1], hash: match[2] } : null;
}

export interface SavedVideoFile {
  name: string;
  size: number;
  // Seconds or ms - only compared with each other.
  modifiedAt: number;
}

// Which saved files to delete so the total fits under capBytes: oldest first,
// never one in use (playing right now). May still be over the cap if the
// remaining files are all in use.
export function pickVideosToEvict(
  files: readonly SavedVideoFile[],
  capBytes: number,
  inUse: ReadonlySet<string> = new Set()
): string[] {
  let total = files.reduce((sum, file) => sum + Math.max(0, file.size), 0);
  if (total <= capBytes) return [];
  const oldestFirst = [...files].sort((a, b) => a.modifiedAt - b.modifiedAt || a.name.localeCompare(b.name));
  const evict: string[] = [];
  for (const file of oldestFirst) {
    if (total <= capBytes) break;
    if (inUse.has(file.name)) continue;
    evict.push(file.name);
    total -= Math.max(0, file.size);
  }
  return evict;
}

// Whether a playing tile should start saving its video now. Only a video
// streamed from the network, only once per player, and only after real
// playback of VIDEO_SAVE_AFTER_MS - or when a shorter clip reaches its end.
export function shouldStartVideoSave(state: {
  isRemote: boolean;
  alreadyRequested: boolean;
  isPlaying: boolean;
  positionMs: number;
  didFinish: boolean;
}): boolean {
  if (!state.isRemote || state.alreadyRequested) return false;
  if (state.didFinish) return true;
  return state.isPlaying && state.positionMs >= VIDEO_SAVE_AFTER_MS;
}
