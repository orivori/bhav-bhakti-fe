import Constants from 'expo-constants';

// Meta (Facebook) App Events for rewarded ads - `ad_watched` and
// `ad_watch_tapped`, each with content_type and action (the same values the
// Firebase ad events in adEvents.ts carry; never ids or personal data).
// Production only - the Meta App is registered for the production package
// alone (see metaEvents.ts).
//
// Its own small file with its own lazy load of the Facebook SDK, so it is
// identical on dev and production and safe on any build: the SDK is required
// only when the first event is sent, inside try/catch (CLAUDE.md §123), and
// .dev builds - which don't have the Meta plugin - never load it.

const IS_META_ENABLED = Constants.expoConfig?.extra?.appVariant === 'production';

type MetaParams = { [key: string]: string | number };
type MetaLogger = { logEvent: (name: string, params?: MetaParams) => void };
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

export interface MetaAdEventParams {
  content_type: string;
  action: string;
}

function logMetaAdEvent(name: string, params: MetaAdEventParams): void {
  const logger = getMetaLogger();
  if (!logger) return;
  try {
    logger.logEvent(name, { content_type: params.content_type, action: params.action });
  } catch (error) {
    console.error(`Meta event "${name}" failed:`, error);
  }
}

// Only on Google's earned-reward event.
export function logMetaAdWatched(params: MetaAdEventParams): void {
  logMetaAdEvent('ad_watched', params);
}

// "Watch ad" tapped on the opt-in card, before the ad loads or shows - so it
// counts even if the ad then fails, has no fill or is closed early.
export function logMetaAdWatchTapped(params: MetaAdEventParams): void {
  logMetaAdEvent('ad_watch_tapped', params);
}
