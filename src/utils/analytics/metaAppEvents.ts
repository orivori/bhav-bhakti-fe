import Constants from 'expo-constants';

// Meta (Facebook) App Events for v10 (Bhav_Bhakti_v10_Meta_Events_Plan): the
// first-session actions Meta's ad delivery can later optimise for. Same
// rules as metaEvents.ts / metaAdEvents.ts:
// - production package only (the Meta App is registered for it alone);
// - the SDK is required lazily, inside try/catch, on the first event - never
//   at app start (CLAUDE.md §123: an eager import hung the .dev splash);
// - no parameters (no ids, titles, deity names or personal data). The only
//   parameterised Meta events are the ad ones, in metaAdEvents.ts.

const IS_META_ENABLED = Constants.expoConfig?.extra?.appVariant === 'production';

type MetaLogger = { logEvent: (name: string) => void };
let cachedLogger: MetaLogger | null | undefined; // undefined = not tried yet

function getMetaLogger(): MetaLogger | null {
  if (!IS_META_ENABLED) return null;
  if (cachedLogger !== undefined) return cachedLogger;
  try {
    cachedLogger = require('react-native-fbsdk-next').AppEventsLogger ?? null;
  } catch (error) {
    console.error('Meta SDK failed to load:', error);
    cachedLogger = null;
  }
  return cachedLogger ?? null;
}

function logMetaEvent(name: string): void {
  const logger = getMetaLogger();
  if (!logger) return;
  try {
    logger.logEvent(name);
  } catch (error) {
    console.error(`Meta event "${name}" failed:`, error);
  }
}

export type GateTapAction = 'download' | 'share' | 'set_ringtone';
export type GateTapContentType = 'wallpaper' | 'thought' | 'ringtone';

// The specific event for each gateable tap; anything not listed fires only
// the umbrella gate_action_tap (nothing else reaches here today).
const SPECIFIC_GATE_TAP_EVENTS: Partial<Record<`${GateTapContentType}:${GateTapAction}`, string>> = {
  'wallpaper:download': 'wallpaper_download',
  'wallpaper:share': 'wallpaper_share',
  'thought:download': 'thought_download',
  'thought:share': 'thought_share',
  'ringtone:set_ringtone': 'ringtone_set',
};

// A tap on a gateable action: the umbrella gate_action_tap plus its specific
// event. Called from gateTapEvents.ts only.
export function logMetaGateActionTap(contentType: GateTapContentType, action: GateTapAction): void {
  logMetaEvent('gate_action_tap');
  const specific = SPECIFIC_GATE_TAP_EVENTS[`${contentType}:${action}`];
  if (specific) logMetaEvent(specific);
}

// Mirrors of existing Firebase events - each called right next to its
// Firebase call, so both fire on exactly the same occurrences.
export function logMetaFirstContentCompleted(): void {
  logMetaEvent('first_content_completed');
}

export function logMetaRashifalViewed(): void {
  logMetaEvent('rashifal_viewed');
}

export function logMetaChantCounterUsed(): void {
  logMetaEvent('chant_counter_used');
}

export function logMetaContentShared(): void {
  logMetaEvent('content_shared');
}

// Once ever per install - see returnedDay2.ts.
export function logMetaReturnedDay2(): void {
  logMetaEvent('returned_day_2');
}
