// Pure rules behind safeDownload.ts (no Expo imports, so node --test can load
// this file directly - see safeDownloadRules.test.mjs).
//
// Why: the media cache used to download straight to the final file name and
// treat "the file exists" as "the file is complete". A download cut short
// (app killed, network dropped mid-write) left a truncated file that was then
// played as if it were whole. Now every download writes to a temporary
// `.part` file, is checked, and only then is renamed to the final name.

export const PART_SUFFIX = '.part';

// A unique temporary name next to the final file. Unique per download, so two
// downloads of the same file at the same moment (e.g. a ringtone's Play and
// its own background download) never write into the same temporary file.
export function partPathFor(finalUri: string, token: string): string {
  return `${finalUri}.${token}${PART_SUFFIX}`;
}

export function isPartFileName(name: string): boolean {
  return name.endsWith(PART_SUFFIX);
}

// The Content-Length header as a whole number, whatever its capitalisation;
// null when it's missing or not a valid non-negative whole number.
export function getContentLength(headers: Record<string, string> | null | undefined): number | null {
  if (!headers) return null;
  for (const name of Object.keys(headers)) {
    if (name.toLowerCase() !== 'content-length') continue;
    const raw = String(headers[name]).trim();
    if (!/^\d+$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isSafeInteger(value) ? value : null;
  }
  return null;
}

export type DownloadCheck =
  | { ok: true; verifiedLength: boolean }
  | { ok: false; reason: 'status' | 'missing_file' | 'empty' | 'size_mismatch' };

// Whether a finished download may become the cached file.
// - Only status 200 counts.
// - The temporary file must exist and must not be empty.
// - When the server sent a Content-Length, the file must be exactly that size.
//   When it didn't (Cloud Storage always does for our media, checked
//   2026-11-18), the download is still accepted: rejecting it would silently
//   switch the cache off for that file. A download cut short never reaches
//   this check anyway - it stays a `.part` file and is never used.
export function checkCompletedDownload(input: {
  status: number;
  headers: Record<string, string> | null | undefined;
  actualSize: number | null;
}): DownloadCheck {
  if (input.status !== 200) return { ok: false, reason: 'status' };
  if (input.actualSize === null) return { ok: false, reason: 'missing_file' };
  if (input.actualSize <= 0) return { ok: false, reason: 'empty' };
  const expected = getContentLength(input.headers);
  if (expected === null) return { ok: true, verifiedLength: false };
  if (expected !== input.actualSize) return { ok: false, reason: 'size_mismatch' };
  return { ok: true, verifiedLength: true };
}
