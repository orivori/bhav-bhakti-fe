import * as FileSystem from 'expo-file-system/legacy';
import { checkCompletedDownload, partPathFor } from './safeDownloadRules';

// Safe downloads into the cache: write to a temporary `.part` file, check it,
// then rename it to the final name (rules: safeDownloadRules.ts). The final
// file therefore only ever exists complete. A leftover `.part` file (app
// killed mid-download) is never read by anything and is deleted by the
// startup sweep (cacheEviction.ts).

const newToken = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// A resumable download that writes to a fresh `.part` file next to finalUri.
// Its `fileUri` is the `.part` file, so existing cancel code that deletes
// `resumable.fileUri` now deletes the temporary file, never the final one.
// Finish a successful result with finishPartDownload().
export function createPartDownload(url: string, finalUri: string): FileSystem.DownloadResumable {
  return FileSystem.createDownloadResumable(url, partPathFor(finalUri, newToken()));
}

// Checks a finished `.part` download and renames it to finalUri. Returns
// finalUri. Throws (after deleting the `.part` file) when the download is not
// acceptable. If a complete file already sits at finalUri (another download of
// the same file won the race), that file is kept - it may be playing - and
// this one's `.part` file is dropped.
export async function finishPartDownload(
  result: FileSystem.FileSystemDownloadResult,
  finalUri: string
): Promise<string> {
  const partUri = result.uri;
  try {
    const info = await FileSystem.getInfoAsync(partUri);
    const check = checkCompletedDownload({
      status: result.status,
      headers: result.headers,
      actualSize: info.exists && !info.isDirectory ? info.size : null,
    });
    if (!check.ok) {
      throw new Error(`Download rejected (${check.reason}, status ${result.status})`);
    }

    const existing = await FileSystem.getInfoAsync(finalUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(partUri, { idempotent: true });
      return finalUri;
    }

    await FileSystem.moveAsync({ from: partUri, to: finalUri });
    return finalUri;
  } catch (error) {
    await FileSystem.deleteAsync(partUri, { idempotent: true }).catch(() => {});
    throw error;
  }
}

// One-shot version (no cancel): download url to finalUri safely and return
// finalUri. Replaces a direct FileSystem.downloadAsync(url, finalUri).
export async function downloadToFileSafely(url: string, finalUri: string): Promise<string> {
  const partUri = partPathFor(finalUri, newToken());
  let result: FileSystem.FileSystemDownloadResult;
  try {
    result = await FileSystem.downloadAsync(url, partUri);
  } catch (error) {
    await FileSystem.deleteAsync(partUri, { idempotent: true }).catch(() => {});
    throw error;
  }
  return finishPartDownload(result, finalUri);
}
