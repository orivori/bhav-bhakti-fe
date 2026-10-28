import Constants from 'expo-constants';

// Meta (Facebook) App Event for a watched rewarded ad: `ad_watched`, no
// parameters, production only - the Meta App is registered for the
// production package alone (see metaEvents.ts).
//
// Its own small file with its own lazy load of the Facebook SDK, so it is
// identical on dev and production and safe on any build: the SDK is required
// only when the first event is sent, inside try/catch (CLAUDE.md §123), and
// .dev builds - which don't have the Meta plugin - never load it.

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

// Only on Google's earned-reward event.
export function logMetaAdWatched(): void {
  const logger = getMetaLogger();
  if (!logger) return;
  try {
    logger.logEvent('ad_watched');
  } catch (error) {
    console.error('Meta event "ad_watched" failed:', error);
  }
}
