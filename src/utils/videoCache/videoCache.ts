import * as FileSystem from 'expo-file-system/legacy';
import { storagePathFromSignedLink } from '@/utils/media/imageCacheKey';
import { createPartDownload, finishPartDownload } from '@/utils/safeDownload';
import {
  MAX_CONCURRENT_VIDEO_SAVES,
  VIDEO_CACHE_MAX_BYTES,
  parseVideoFileName,
  pickVideosToEvict,
  videoFileName,
  type SavedVideoFile,
} from './videoCacheRules';

// Video wallpapers saved on the phone by feed id, so a repeat view costs no
// download (rules and file naming: videoCacheRules.ts).
//
// - Stream first, save in the background: a tile plays the online link as
//   before; once it has really played for a moment, requestVideoSave() saves
//   a copy. The NEXT time that video is shown, getLocalVideoUri() hands back
//   the file and nothing is downloaded.
// - Safe saving (safeDownload.ts): a download goes to a .part file and is
//   renamed only when complete, so a file cut short is never played. The
//   startup sweep (cacheEviction.ts) removes leftover .part files.
// - Files live at the top level of the cache folder: the existing 14-day
//   sweep covers them, and Android may clear them under storage pressure. The
//   in-memory index is rebuilt at every start (initVideoCache) and a file that
//   fails to play is forgotten (forgetLocalVideo), so a missing file only
//   means streaming again.
// - At most VIDEO_CACHE_MAX_BYTES; oldest saves removed first, never a file
//   that is playing.
// - A link refused with 403 (expired signature) is never retried; the next
//   list fetch brings a new link, which may be saved.
// - Nothing here ever throws to a caller or changes what is playing.

interface IndexEntry {
  size: number;
  modifiedAt: number;
}

const index = new Map<string, IndexEntry>();
const inUse = new Map<string, number>();
const inFlight = new Set<string>();
const queue: { name: string; url: string }[] = [];
const refusedUrls = new Set<string>();
let activeSaves = 0;
let initRun: Promise<void> | null = null;

const cacheDir = (): string | null => FileSystem.cacheDirectory ?? null;

function fileNameFor(feedId: string | number, url: string): string | null {
  return videoFileName(feedId, storagePathFromSignedLink(url));
}

// Builds the index of saved videos from the cache folder, then applies the
// cap. Once per launch; call after the startup sweep. Never throws.
export function initVideoCache(): Promise<void> {
  if (!initRun) initRun = buildIndex();
  return initRun;
}

async function buildIndex(): Promise<void> {
  const dir = cacheDir();
  if (!dir) return;
  try {
    const names = await FileSystem.readDirectoryAsync(dir);
    for (const name of names) {
      if (!parseVideoFileName(name)) continue;
      try {
        const info = await FileSystem.getInfoAsync(`${dir}${name}`);
        if (info.exists && !info.isDirectory) {
          index.set(name, { size: info.size ?? 0, modifiedAt: info.modificationTime ?? 0 });
        }
      } catch {
        // Skip this file.
      }
    }
    await enforceVideoCap();
  } catch (error) {
    if (__DEV__) console.warn('videoCache: index failed', error);
  }
}

// The saved file for this video, or null (then stream the link). Instant: it
// only reads the in-memory index.
export function getLocalVideoUri(feedId: string | number, url: string | null | undefined): string | null {
  const dir = cacheDir();
  if (!dir || !url) return null;
  const name = fileNameFor(feedId, url);
  return name && index.has(name) ? `${dir}${name}` : null;
}

// While a saved file plays, it is never removed by the cap. Returns the
// release function.
export function holdLocalVideo(localUri: string): () => void {
  const name = localUri.split('/').pop() ?? '';
  inUse.set(name, (inUse.get(name) ?? 0) + 1);
  return () => {
    const count = (inUse.get(name) ?? 1) - 1;
    if (count <= 0) inUse.delete(name);
    else inUse.set(name, count);
  };
}

// A saved file that failed to play: delete it and forget it, so the next
// showing streams again.
export function forgetLocalVideo(localUri: string): void {
  const name = localUri.split('/').pop() ?? '';
  index.delete(name);
  FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
}

// Saves this video in the background (fire-and-forget). Ignored when it is
// already saved, being saved, waiting, or its link was refused before.
export function requestVideoSave(feedId: string | number, url: string | null | undefined): void {
  if (!url || refusedUrls.has(url)) return;
  const name = fileNameFor(feedId, url);
  if (!name || index.has(name) || inFlight.has(name) || queue.some((item) => item.name === name)) return;
  queue.push({ name, url });
  pump();
}

function pump(): void {
  while (activeSaves < MAX_CONCURRENT_VIDEO_SAVES && queue.length > 0) {
    const next = queue.shift()!;
    if (index.has(next.name) || inFlight.has(next.name)) continue;
    activeSaves += 1;
    inFlight.add(next.name);
    void save(next.name, next.url).finally(() => {
      activeSaves -= 1;
      inFlight.delete(next.name);
      pump();
    });
  }
}

async function save(name: string, url: string): Promise<void> {
  const dir = cacheDir();
  if (!dir) return;
  const finalUri = `${dir}${name}`;
  const resumable = createPartDownload(url, finalUri);
  try {
    const result = await resumable.downloadAsync();
    if (!result) return;
    if (result.status === 403) refusedUrls.add(url);
    await finishPartDownload(result, finalUri);
    const info = await FileSystem.getInfoAsync(finalUri);
    if (info.exists && !info.isDirectory) {
      index.set(name, { size: info.size ?? 0, modifiedAt: info.modificationTime ?? Date.now() / 1000 });
      await enforceVideoCap();
    }
  } catch (error) {
    if (__DEV__) console.warn('videoCache: save failed', name, error);
    FileSystem.deleteAsync(resumable.fileUri, { idempotent: true }).catch(() => {});
  }
}

async function enforceVideoCap(): Promise<void> {
  const dir = cacheDir();
  if (!dir) return;
  const files: SavedVideoFile[] = [...index.entries()].map(([name, entry]) => ({ name, ...entry }));
  for (const name of pickVideosToEvict(files, VIDEO_CACHE_MAX_BYTES, new Set(inUse.keys()))) {
    index.delete(name);
    await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(() => {});
  }
}
