import { logAnalyticsEvent } from './logEvent';

// Rewarded-ad unlock funnel (Revenue Model §5e section 6). Every event
// carries what was locked: content_type (the feed's type), action (view /
// download / share) and trigger (the gate's analytics label, e.g.
// set_as_ringtone). ad_load_ms is a parameter, never its own event.
//
// ad_reward_earned is the ONLY success signal - it fires on Google's
// earned-reward event and nothing else. A no_fill fall-through is
// ad_unavailable, never a reward.

export type AdUnlockAction = 'view' | 'download' | 'share';

export interface AdEventContext {
  content_type: string;
  action: AdUnlockAction;
  trigger: string;
}

export type AdUnavailableReason = 'timeout' | 'no_fill' | 'load_error';
export type AdFailedReason = 'show_error' | 'backgrounded' | 'cancelled' | 'not_foreground';

// The opt-in card was shown.
export function logAdUnlockOffered(context: AdEventContext): void {
  logAnalyticsEvent('ad_unlock_offered', { ...context });
}

// "Not now" (or back) on the opt-in card.
export function logAdUnlockDeclined(context: AdEventContext): void {
  logAnalyticsEvent('ad_unlock_declined', { ...context });
}

// No ad could be loaded - the action goes ahead as a no_fill grant.
export function logAdUnavailable(context: AdEventContext, reason: AdUnavailableReason): void {
  logAnalyticsEvent('ad_unavailable', { ...context, reason });
}

// The ad couldn't be shown, or the flow was abandoned while loading.
export function logAdFailed(context: AdEventContext, reason: AdFailedReason, adLoadMs?: number): void {
  logAnalyticsEvent('ad_failed', { ...context, reason, ...(adLoadMs !== undefined ? { ad_load_ms: adLoadMs } : {}) });
}

// Google's earned-reward event fired.
export function logAdRewardEarned(context: AdEventContext, adLoadMs: number): void {
  logAnalyticsEvent('ad_reward_earned', { ...context, ad_load_ms: adLoadMs });
}

// The ad closed before the reward was earned - nothing unlocked.
export function logAdClosedNoReward(context: AdEventContext, adLoadMs: number): void {
  logAnalyticsEvent('ad_closed_no_reward', { ...context, ad_load_ms: adLoadMs });
}
