// Push-notification tracking - pure rules (no React Native, no path aliases,
// so pushAttribution.test.mjs can load this file directly in Node).
//
//   cleanCampaign            - the push data's `campaign` as an event value
//   notificationTargetLabel  - where a tapped push leads, as an event value
//   set/getPushCampaign      - "opened from push <campaign>", kept IN MEMORY
//                              only: gone 30 minutes after the tap, and on
//                              every cold start (a new JS process starts
//                              empty). Never stored on the phone.
//   notificationPermissionValue - the notif_permission user property

// Screens a push may open (deepLink.ts). A curated subset of the app's routes,
// not every screen - see deepLink.ts for why this is a safety boundary.
export const ALLOWED_DEEP_LINK_SCREENS: readonly string[] = [
  '/(main)',
  '/(main)/horoscope',
  '/(main)/horoscope-detail',
  '/(main)/ringtones',
  '/(main)/mantras',
  '/(main)/daily-status',
  '/(main)/stories',
  '/(main)/profile',
];

export const CAMPAIGN_MAX_LENGTH = 40;
export const PUSH_ATTRIBUTION_TTL_MS = 30 * 60 * 1000;

// Lower case, only a-z 0-9 _ -, at most 40 characters; missing/empty = 'none'.
export function cleanCampaign(raw: unknown): string {
  if (typeof raw !== 'string') return 'none';
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, CAMPAIGN_MAX_LENGTH);
  return cleaned || 'none';
}

// 'blocked' while maintenance mode or the forced-update screen is up (the tap
// can't navigate); 'invalid' for a screen not on the allow-list; otherwise
// the screen's short name: '/(main)' -> 'home', '/(main)/horoscope-detail'
// -> 'horoscope_detail'.
export function notificationTargetLabel(screen: unknown, blocked: boolean): string {
  if (blocked) return 'blocked';
  if (typeof screen !== 'string' || !ALLOWED_DEEP_LINK_SCREENS.includes(screen)) return 'invalid';
  const name = screen.replace(/^\/\(main\)\/?/, '');
  return name === '' ? 'home' : name.replace(/-/g, '_');
}

let attribution: { campaign: string; at: number } | null = null;

export function setPushCampaign(campaign: string, now: number = Date.now()): void {
  attribution = { campaign, at: now };
}

// The campaign of the push that opened the app, while still fresh.
export function getPushCampaign(now: number = Date.now()): string | undefined {
  if (!attribution) return undefined;
  if (now - attribution.at > PUSH_ATTRIBUTION_TTL_MS) {
    attribution = null;
    return undefined;
  }
  return attribution.campaign;
}

// { push_campaign } to spread into event params, or {} when not set.
export function pushCampaignParam(now: number = Date.now()): { push_campaign?: string } {
  const campaign = getPushCampaign(now);
  return campaign ? { push_campaign: campaign } : {};
}

export function clearPushCampaign(): void {
  attribution = null;
}

// notif_permission: granted when notifications can show; otherwise not_asked
// on Android 13+ before our one-time dialog was answered, else denied (the
// user said no, or turned notifications off in settings).
export type NotificationPermissionValue = 'granted' | 'denied' | 'not_asked';

export function notificationPermissionValue(input: {
  enabled: boolean;
  hasAsked: boolean;
  apiLevel: number;
}): NotificationPermissionValue {
  if (input.enabled) return 'granted';
  if (input.apiLevel >= 33 && !input.hasAsked) return 'not_asked';
  return 'denied';
}
