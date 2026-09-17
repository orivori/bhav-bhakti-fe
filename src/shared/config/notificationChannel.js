// Plain JS (not .ts) on purpose: this exact file is required directly, with
// zero transpilation, from BOTH app.config.js (a Node-only script that runs
// at prebuild time, outside Metro/TS entirely) and the app's own TS code
// (tsconfig's allowJs covers importing a plain .js file like this one). One
// literal source of truth for the Android notification channel id/name/color,
// so the values baked into the native manifest + MainApplication.kt at
// prebuild time (see plugins/withNotifications.js) can never drift from what
// the JS side subscribes to at runtime - and so it's obvious, in one place,
// what to type into Firebase Console's composer "Notification channel" field
// so a real campaign actually lands on the channel this app created.
module.exports = {
  ANDROID_NOTIFICATION_CHANNEL_ID: 'general',
  ANDROID_NOTIFICATION_CHANNEL_NAME: 'General',
  NOTIFICATION_ACCENT_COLOR: '#FF6B00',
  FCM_ALL_USERS_TOPIC: 'all-users',
};
