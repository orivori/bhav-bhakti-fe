import Constants from 'expo-constants';

// True only for the .dev app variant (development/preview builds) - never
// true in production, since app.config.js's APP_VARIANT defaults to
// "production" and only the .dev variant sets it otherwise. Read from
// Constants.expoConfig.extra rather than an EXPO_PUBLIC_ env var, since it's
// tied directly to the same APP_VARIANT that already decides the app's
// package name/identity, not a separately-maintained duplicate. The same check
// gates the .dev-only debug UI in profile.tsx.
export const IS_TEST_ACCOUNT = Constants.expoConfig?.extra?.appVariant !== 'production';
