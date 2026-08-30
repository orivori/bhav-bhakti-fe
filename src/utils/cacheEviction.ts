import * as FileSystem from 'expo-file-system/legacy';

// Basic startup eviction policy for FileSystem.cacheDirectory - the OS's own
// "Clear Cache" already reclaims this directory at will (that's the whole
// point of using cacheDirectory over documentDirectory - see the directory
// fix applied alongside this file to audio-player.tsx, AutoplayFeedCard.tsx,
// RingtoneFeedCard.tsx, useWallpaperActions.ts, downloadWallpaper.ts, and
// FeedCard.tsx), but nothing forces a user to ever tap that before disk
// space genuinely runs low. This adds an app-level backstop: on every app
// startup, anything sitting directly in cacheDirectory older than
// CACHE_MAX_AGE_DAYS gets deleted, regardless of which of this app's own
// caching call sites created it.
//
// Deliberately NOT scoped to a known-filename-prefix allowlist. cacheDirectory
// is explicitly documented (and already relied on elsewhere in this codebase
// - see shareContent.ts's own comment) as private, app-scoped, ephemeral-by-
// contract storage: nothing should ever be placed there expecting it to
// survive indefinitely, so sweeping its entire top level by age alone is
// exactly what the directory's own contract already promises callers, not an
// overreach. documentDirectory is deliberately NOT touched by this sweep -
// it holds genuinely persistent app data, and (unlike cacheDirectory) isn't
// safe to sweep broadly; any pre-existing files that leaked into
// documentDirectory before the directory fix above are a separate, smaller,
// one-time cleanup - not attempted here.
const CACHE_MAX_AGE_DAYS = 14;
const CACHE_MAX_AGE_SECONDS = CACHE_MAX_AGE_DAYS * 24 * 60 * 60;

// Fire-and-forget from the root layout on every cold start (see
// app/_layout.tsx) - non-blocking, and startup is the one moment nothing in
// this app could legitimately have an in-flight read/write on a cache file
// yet (every download/share/playback flow that touches cacheDirectory is
// triggered by user action, none of which can have happened before this
// runs), so there's no risk of racing a genuinely-in-use file.
export async function runCacheEviction(): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return; // not available on this platform/runtime

  try {
    const entries = await FileSystem.readDirectoryAsync(cacheDir);
    if (entries.length === 0) return;

    const nowSeconds = Date.now() / 1000; // modificationTime is seconds-since-epoch, not ms
    let deletedCount = 0;

    await Promise.all(
      entries.map(async (name) => {
        const fileUri = `${cacheDir}${name}`;
        try {
          const info = await FileSystem.getInfoAsync(fileUri);
          // Non-recursive by design - none of this app's own caching call
          // sites create subdirectories under cacheDirectory, so skipping
          // any that do turn up (from this app or elsewhere) is the safe
          // default rather than guessing at recursive-delete correctness.
          if (!info.exists || info.isDirectory) return;

          const ageSeconds = nowSeconds - info.modificationTime;
          if (ageSeconds > CACHE_MAX_AGE_SECONDS) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
            deletedCount += 1;
          }
        } catch (error) {
          console.error('cacheEviction: failed to inspect/delete cache entry:', name, error);
        }
      })
    );

    if (deletedCount > 0) {
      console.log(`🧹 cacheEviction: removed ${deletedCount} cache file(s) older than ${CACHE_MAX_AGE_DAYS} days`);
    }
  } catch (error) {
    console.error('cacheEviction: failed to read cache directory:', error);
  }
}
