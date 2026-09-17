import { router, Href } from 'expo-router';

// The app's first-ever deep-link handler - previously zero <Link>/Linking
// usage existed anywhere (see CLAUDE.md §10). FCM data payloads are flat,
// string-only key/value maps by construction (can't hold nested JSON without
// manual stringifying), and the shape here is deliberately kept flat since
// the founder hand-types this into Firebase Console's composer each time - a
// nested/stringified JSON blob would be a real human-error risk. Expected
// shape:
//   screen: /(main)/horoscope-detail
//   zodiacSign: aries
// Every key other than `screen` passes straight through as router.push's
// params.
//
// `screen` is checked against this explicit allowlist - NOT passed to
// router.push() unvalidated - for two real reasons, both confirmed via a real
// on-device test with a deliberately invalid screen value:
// 1. router.push() does NOT throw for an unresolvable pathname - Expo Router
//    treats it as a normal, successful navigation to its own built-in
//    generic "Unmatched Route" screen (this app has no custom
//    app/+not-found.tsx). A try/catch around router.push() can never catch
//    this - it's structurally dead code for this exact failure, which is
//    exactly what let a bad screen value reach Expo Router's own error
//    screen instead of our fallback-to-Home.
// 2. Several real screens (audio-player.tsx, legal-document.tsx,
//    delete-account.tsx, edit-profile.tsx) either need specific params to
//    render sensibly or genuinely shouldn't be reachable from a hand-typed
//    Firebase Console field at all - this list is a real safety boundary,
//    not just a typo-catcher, so it's deliberately a curated subset of the
//    app's routes, not every registered screen.
const ALLOWED_DEEP_LINK_SCREENS: readonly string[] = [
  '/(main)',
  '/(main)/horoscope',
  '/(main)/horoscope-detail',
  '/(main)/ringtones',
  '/(main)/mantras',
  '/(main)/daily-status',
  '/(main)/profile',
];

export function navigateFromNotificationData(data?: Record<string, string | object>): void {
  if (!data || typeof data.screen !== 'string' || !ALLOWED_DEEP_LINK_SCREENS.includes(data.screen)) {
    router.replace('/(main)');
    return;
  }

  const { screen, ...params } = data;

  try {
    // typedRoutes is enabled (app.config.js), which normally restricts
    // router.push to statically-known paths - screen is inherently a runtime
    // string from outside the app (Firebase Console's composer), so it can
    // never be one of those literal types. This cast is the deliberate,
    // narrow boundary where that dynamic value crosses into the router.
    // screen is already allowlist-validated above, so this push always
    // targets a real route - the try/catch here is defense-in-depth against
    // a genuinely different failure (e.g. a malformed params value), not the
    // invalid-route case, which is now prevented before reaching this line.
    router.push({ pathname: screen, params } as unknown as Href);
  } catch (error) {
    console.error('Failed to navigate from notification data:', error, data);
    router.replace('/(main)');
  }
}
