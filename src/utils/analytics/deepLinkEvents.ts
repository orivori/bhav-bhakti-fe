import { logAnalyticsEvent } from './logEvent';

// Deferred-link probe (src/utils/deepLinks/deferredAppLink.ts): does Meta's
// deferred link reach the app, and on which launch? Production app only.
// Never a feed id, the raw link, an advertising ID or anything about the user.

export type DeferredLinkResult = 'received' | 'none' | 'error' | 'unavailable';

// Once per probed launch (at most the first 3 probed launches of an install).
export function logDeferredLinkChecked(params: {
  result: DeferredLinkResult;
  probe_launch: number;
  embedded_launch: boolean;
  ms: number;
}): void {
  logAnalyticsEvent('deferred_link_checked', params);
}

// A link came back. content_type is from the content-link allow-list, else
// 'other'; route is 'open' for a bhavbhakti://open/... link, else 'other'.
export function logDeferredLinkReceived(params: { content_type: string; route: 'open' | 'other' }): void {
  logAnalyticsEvent('deferred_link_received', params);
}

// Home pin (useHomePin.ts). content_type is the link's type (e.g. status).
export function logDeferredLinkPinned(params: { content_type: string }): void {
  logAnalyticsEvent('deferred_link_pinned', params);
}

// A pending link existed but no pin was shown. Never sent while the pin is
// switched off (nothing is read then).
export function logDeferredLinkPinSkipped(params: {
  reason: 'expired' | 'not_found' | 'type_mismatch' | 'error';
}): void {
  logAnalyticsEvent('deferred_link_pin_skipped', params);
}
