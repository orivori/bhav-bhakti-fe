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
// `screen` is a real Expo Router path string, typed in directly - no separate
// mapping table to keep in sync. Every other key passes straight through as
// router.push's params.
export function navigateFromNotificationData(data?: Record<string, string | object>): void {
  const screen = data?.screen;

  if (!screen || typeof screen !== 'string') {
    router.replace('/(main)');
    return;
  }

  const { screen: _screen, ...params } = data;

  try {
    // typedRoutes is enabled (app.config.js), which normally restricts
    // router.push to statically-known paths - screen is inherently a runtime
    // string from outside the app (Firebase Console's composer), so it can
    // never be one of those literal types. This cast is the deliberate,
    // narrow boundary where that dynamic value crosses into the router.
    router.push({ pathname: screen, params } as unknown as Href);
  } catch (error) {
    console.error('Failed to navigate from notification data:', error, data);
    router.replace('/(main)');
  }
}
