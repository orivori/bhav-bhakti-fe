import { logAnalyticsEvent } from './logEvent';
import { storyLinkLandedParams } from './storyLinkEventParams';

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

// A story link (pin or page form) was acted on at the Home landing
// (useHomePin.ts): {kind: pin|page, result: opened|not_found|type_mismatch|
// expired|error}. Once per link (the link is removed after a definitive
// result; an error keeps it, so a later launch may report again). Firebase
// only; story links only (storyLinkLandedParams).
export function logStoryLinkLanded(link: { type: string; kind: string }, result: string): void {
  const params = storyLinkLandedParams(link, result);
  if (params) logAnalyticsEvent('story_link_landed', params);
}

// A link came back. content_type is from the content-link allow-list, else
// 'other'; route is 'open' for a bhavbhakti://open/... link, 'story' for a
// bhavbhakti://story/... link (the story page form), else 'other'.
export function logDeferredLinkReceived(params: { content_type: string; route: 'open' | 'story' | 'other' }): void {
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
