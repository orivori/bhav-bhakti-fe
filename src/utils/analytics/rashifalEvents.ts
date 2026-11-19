import { logAnalyticsEvent } from './logEvent';
import { pushCampaignParam } from '@/utils/notifications/pushAttribution';

// Rashifal ad-unlock events (Firebase only). The shared ad events
// (ad_unlock_offered, ad_watch_tapped, ad_reward_earned, ...) are logged by
// the flow with content_type 'rashifal' and action 'view' (CLAUDE.md §134
// action words); these add the Rashifal-specific steps. No ids or personal
// data. is_own_sign is sent only where the app knows it (Home's card, which
// always opens the user's own sign).

export type RashifalEventTrigger = 'home_card' | 'sign_grid' | 'notification' | 'reading_screen';

interface RashifalEventContext {
  trigger: RashifalEventTrigger;
  isOwnSign?: boolean;
}

// push_campaign: set while the app was opened from a push in the last 30
// minutes (pushAttribution.ts).
function baseParams(context: RashifalEventContext): Record<string, string | number> {
  return {
    trigger: context.trigger,
    ...(context.isOwnSign !== undefined ? { is_own_sign: context.isOwnSign ? 1 : 0 } : {}),
    ...pushCampaignParam(),
  };
}

// The ad prompt was about to be offered for a locked sign.
export function logRashifalLockShown(context: RashifalEventContext): void {
  logAnalyticsEvent('rashifal_lock_shown', baseParams(context));
}

// The server recorded the unlock (reward = Google's earned reward; no_fill =
// no ad could be loaded - unlocked anyway, never counted as a reward).
export function logRashifalUnlockCompleted(context: RashifalEventContext, source: 'reward' | 'no_fill'): void {
  logAnalyticsEvent('rashifal_unlock_completed', { ...baseParams(context), source });
}

// A sign already unlocked today was opened without a prompt.
export function logRashifalOpenedUnlocked(context: RashifalEventContext): void {
  logAnalyticsEvent('rashifal_opened_unlocked', baseParams(context));
}

// The reading actually showed (not merely the screen opening - that is
// rashifal_viewed, unchanged). Once per visit and sign. access = gate_off |
// ad | no_fill | already_unlocked | premium (rashifalReadingAccess in
// features/rashifal/rashifalLock.ts).
export function logRashifalReadingShown(access: string): void {
  logAnalyticsEvent('rashifal_reading_shown', { access, ...pushCampaignParam() });
}
