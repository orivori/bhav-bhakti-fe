import Constants from 'expo-constants';

// Meta (Facebook) App Events - the ad-attribution signal Meta's ad delivery
// trains on. See Bhav_Bhakti_Meta_SDK_Plan.md. Installs and app opens are
// logged automatically by the SDK (app.config.js); only login is logged here.
//
// Production package only, matching app.config.js, which leaves the SDK
// unconfigured in .dev builds - the single Meta App is registered for the
// production package alone, and .dev events must never reach it.
//
// No parameters on either event, on purpose: Meta flags (and can suspend ad
// accounts over) phone numbers or other personal data in event payloads.
const IS_META_ENABLED = Constants.expoConfig?.extra?.appVariant === 'production';

// react-native-fbsdk-next is loaded lazily, and only in production. Its main
// file creates the FBAccessToken native module as soon as it loads, and that
// module throws "The SDK has not been initialized" in .dev/preview builds
// (no Meta App ID in their manifest) - a top-level import kept the app on the
// splash screen. The variant check runs before the require, so no code from
// the library ever executes outside production; a failed load leaves every
// Meta call a silent no-op. Install/app-open events don't depend on this:
// the native SDK logs them on its own from the manifest.
type MetaLogger = { logEvent: (name: string) => void };
let cachedLogger: MetaLogger | null | undefined; // undefined = not tried yet

function getMetaLogger(): MetaLogger | null {
  if (!IS_META_ENABLED) {
    return null;
  }
  if (cachedLogger !== undefined) {
    return cachedLogger;
  }
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
  if (!logger) {
    return;
  }
  try {
    logger.logEvent(name);
  } catch (error) {
    console.error(`Meta event "${name}" failed:`, error);
  }
}

// Meta's standard CompleteRegistration event name, written out rather than
// read from AppEventsLogger.AppEvents: that object comes from the native
// module, which doesn't exist in builds made before the SDK was added. Those
// builds can still receive this code by OTA, and reading it there would throw
// outside logMetaEvent's try/catch - turning a successful login into an error.
const META_COMPLETE_REGISTRATION = 'fb_mobile_complete_registration';

// Every successful login, new or returning user. CompleteRegistration (Meta's
// standard sign-up event) is logged alongside it for genuinely new users only,
// using the backend's own isNewUser signal.
export function logMetaLoginSuccess(params: { isNewUser: boolean }): void {
  logMetaEvent('login_success');
  if (params.isNewUser) {
    logMetaEvent(META_COMPLETE_REGISTRATION);
  }
}
