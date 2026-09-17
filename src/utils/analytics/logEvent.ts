import { getAnalytics, logEvent, logScreenView } from '@react-native-firebase/analytics';

// Every custom Firebase Analytics call in the app funnels through this one
// wrapper - a single place to swallow a logging failure so a dropped or
// malformed event can never become a real app crash, and a single place
// future buckets (Engagement/Conversion/Retention) can share instead of each
// re-wrapping logEvent directly.
export function logAnalyticsEvent(name: string, params?: Record<string, unknown>): void {
  try {
    logEvent(getAnalytics(), name, params);
  } catch (error) {
    console.error(`Analytics event "${name}" failed:`, error);
  }
}

// screen_view is a real, dedicated RNFB call (logScreenView), not a custom
// named event through logAnalyticsEvent above - see app/_layout.tsx's
// usePathname()-driven effect, the app's React Navigation/Expo Router
// integration point. Firebase's own recipe sets screen_name and screen_class
// to the same value for a router-driven integration like this one, rather
// than trying to derive a separate class name per screen.
export function logAnalyticsScreenView(screenName: string): void {
  try {
    logScreenView(getAnalytics(), { screen_name: screenName, screen_class: screenName });
  } catch (error) {
    console.error(`Analytics screen_view "${screenName}" failed:`, error);
  }
}
