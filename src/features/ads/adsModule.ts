import Constants from 'expo-constants';

// Google Mobile Ads (rewarded ads only - Revenue Model §5d/§5e).
//
// The library is required lazily inside try/catch, like metaEvents.ts does
// for the Meta SDK (CLAUDE.md §123): its JS throws at load time when the
// native half isn't in the installed build, and the app must then behave
// exactly as before (no ads, never gated - see canShowAds()).
//
// Loading the module does not start Google's SDK; initializeAds() does, and
// only on the first locked tap - never at launch.

type AdsLib = typeof import('react-native-google-mobile-ads');

const IS_PRODUCTION = Constants.expoConfig?.extra?.appVariant === 'production';

// Our real production rewarded ad unit (AdMob dashboard). If it is ever
// emptied, production builds behave as if the ads module were missing. Not a
// secret - it ships inside the APK.
const PRODUCTION_REWARDED_AD_UNIT_ID = 'ca-app-pub-2045583960519339/8937270797';

// Phones registered as AdMob test devices for Closed testing on the real
// production build (the ID is printed in logcat on the first ad request).
// Empty for .dev, which only ever uses Google's test ad unit.
const TEST_DEVICE_IDS: string[] = [];

// Google's own sample publisher - test ads only, never in production.
const SAMPLE_PUBLISHER = 'ca-app-pub-3940256099942544';

const isRealAdUnitId = (id: string): boolean =>
  /^ca-app-pub-\d{16}\/\d{10}$/.test(id) && !id.startsWith(`${SAMPLE_PUBLISHER}/`);

let cachedLib: AdsLib | null | undefined; // undefined = not tried yet

export function getAdsLib(): AdsLib | null {
  if (cachedLib !== undefined) return cachedLib;
  try {
    cachedLib = require('react-native-google-mobile-ads') as AdsLib;
  } catch (error) {
    // "TurboModuleRegistry.getEnforcing(...): 'RNGoogleMobileAdsModule' could
    // not be found" - a build without the ads module (v8 and older).
    if (__DEV__) console.warn('Google Mobile Ads module not available:', error);
    cachedLib = null;
  }
  return cachedLib;
}

/**
 * The rewarded ad unit for this app variant, or null when ads can't run:
 * the module is missing, or production has no real unit yet. .dev always
 * uses Google's test unit.
 */
export function getRewardedAdUnitId(): string | null {
  const lib = getAdsLib();
  if (!lib) return null;
  if (IS_PRODUCTION) {
    return isRealAdUnitId(PRODUCTION_REWARDED_AD_UNIT_ID) ? PRODUCTION_REWARDED_AD_UNIT_ID : null;
  }
  return lib.TestIds.REWARDED;
}

/**
 * True when this app can show a rewarded ad. Drives the X-Ads-Capable header:
 * without it the backend never ad-gates this app.
 */
export function canShowAds(): boolean {
  return getRewardedAdUnitId() !== null;
}

let initPromise: Promise<boolean> | null = null;

/**
 * Starts Google's SDK once, with our request settings: never child-directed,
 * not under the age of consent (Play audience 18+), maximum ad content rating
 * G. Resolves false (never throws) if anything fails - the caller then treats
 * it as "no ad".
 */
export function initializeAds(): Promise<boolean> {
  if (initPromise) return initPromise;
  const lib = getAdsLib();
  if (!lib) return Promise.resolve(false);
  initPromise = (async () => {
    try {
      await lib.default().setRequestConfiguration({
        maxAdContentRating: lib.MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: TEST_DEVICE_IDS,
      });
      await lib.default().initialize();
      return true;
    } catch (error) {
      console.error('Google Mobile Ads failed to initialize:', error);
      initPromise = null; // allow a later retry
      return false;
    }
  })();
  return initPromise;
}
