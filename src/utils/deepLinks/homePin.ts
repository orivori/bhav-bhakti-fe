// Pure decisions for the Home pin (useHomePin.ts): a pending content link
// (pendingContentLinkStore.ts) shown as the FIRST card on the first Home
// load. No imports from the app, so Node's test runner can load it directly
// (homePin.test.mjs).

// A link type -> the feed.type it must point at. status and wallpaper are
// both wallpaper feeds (the Status tab shows every wallpaper).
const FEED_TYPE_FOR_LINK: Record<string, string> = {
  wallpaper: 'wallpaper',
  status: 'wallpaper',
  thought: 'thought',
  ringtone: 'ringtone',
  aarti: 'aarti',
  bhajan: 'bhajan',
  mantra: 'mantra',
};

// The probe is only waited for on an install this new (the deferred link is
// only ever delivered to a fresh install).
export const FRESH_INSTALL_WINDOW_MS = 24 * 60 * 60 * 1000;

// Waits are capped so Home is never held up for long.
export const PROBE_WAIT_MAX_MS = 2000;
export const PIN_FETCH_TIMEOUT_MS = 5000;

export type PinSkipReason = 'expired' | 'not_found' | 'type_mismatch' | 'error';

export type PinOutcome<T> =
  | { kind: 'pin'; feed: T }
  // consume = remove the pending link now (a definitive answer); false keeps
  // it for a later Home load, until its 7 days run out.
  | { kind: 'skip'; reason: PinSkipReason; consume: boolean };

interface PinnableFeed {
  id: number | string;
  type?: unknown;
  url?: unknown;
}

export function isFreshInstall(installTime: number | null, now: number): boolean {
  if (installTime === null || !Number.isFinite(installTime)) return false;
  const age = now - installTime;
  return age >= 0 && age < FRESH_INSTALL_WINDOW_MS;
}

// A link saved by a different install (an Android backup restored onto a
// reinstall) is treated as expired. Unknown on either side = same install.
export function isFromOtherInstall(linkInstallTime: number | undefined, installTime: number | null): boolean {
  return typeof linkInstallTime === 'number' && installTime !== null && linkInstallTime !== installTime;
}

// GET /feed/:id answered with a feed.
export function classifyPinnedFeed<T extends PinnableFeed>(linkType: string, feed: T | null | undefined): PinOutcome<T> {
  const expectedType = FEED_TYPE_FOR_LINK[linkType];
  const isUsable =
    typeof feed === 'object' &&
    feed !== null &&
    expectedType !== undefined &&
    feed.type === expectedType &&
    typeof feed.url === 'string' &&
    feed.url.length > 0;
  if (!isUsable) return { kind: 'skip', reason: 'type_mismatch', consume: true };
  return { kind: 'pin', feed: feed as T };
}

// GET /feed/:id failed. Only a 404 is definitive (the backend answers 404
// for a missing AND an inactive item); anything else - no network, timeout,
// 5xx, 401 - keeps the link.
export function classifyPinFetchError(error: unknown): PinOutcome<never> {
  const statusCode = (error as { statusCode?: unknown } | null | undefined)?.statusCode;
  if (statusCode === 404) return { kind: 'skip', reason: 'not_found', consume: true };
  return { kind: 'skip', reason: 'error', consume: false };
}

// The pinned feed first, and never again further down (later pages may
// return it too). With no pin, the very same array comes back.
export function placePinnedFeed<T extends PinnableFeed>(feeds: T[], pinned: T | null): T[] {
  if (!pinned) return feeds;
  const pinnedId = String(pinned.id);
  return [pinned, ...feeds.filter((feed) => String(feed.id) !== pinnedId)];
}
