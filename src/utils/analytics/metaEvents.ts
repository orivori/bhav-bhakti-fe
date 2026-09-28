import Constants from 'expo-constants';
import { AppEventsLogger } from 'react-native-fbsdk-next';

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

function logMetaEvent(name: string): void {
  if (!IS_META_ENABLED) {
    return;
  }
  try {
    AppEventsLogger.logEvent(name);
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
