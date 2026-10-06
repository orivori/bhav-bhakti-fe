/**
 * A duration in seconds as m:ss (or h:mm:ss from an hour up), e.g. 287 ->
 * "4:47". Null for a missing or non-positive value, so callers can simply
 * skip the label.
 */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}
