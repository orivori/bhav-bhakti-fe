// Custom local Expo config plugin - the app's first hand-written one.
//
// Why this exists instead of installing `expo-notifications` or `notifee`:
// @react-native-firebase/messaging has no config-plugin option for a custom
// Android notification icon/color/channel, and RNFB's own docs explicitly
// point to Notifee for that - but both real alternatives (expo-notifications,
// Notifee) mean adding a second full notification library purely to
// configure three static assets, with a real risk of it registering its own
// native message-handling logic alongside RNFB's messaging service. This
// plugin does the same three things with zero new npm dependencies, using
// @expo/config-plugins (already an installed transitive dependency - other
// plugins in this project depend on it) directly.
//
// /android is gitignored in this repo (Continuous Native Generation - see
// CLAUDE.md), so nothing here can be done by hand-editing the generated
// android/ folder once; it must run through a config plugin on every
// prebuild, which is exactly what this is.
const {
  withDangerousMod,
  withAndroidManifest,
  withAndroidColors,
  withMainApplication,
  AndroidConfig,
} = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

const NOTIFICATION_ICON_DRAWABLE_NAME = 'ic_notification';
const NOTIFICATION_COLOR_RESOURCE_NAME = 'notification_color';
const CHANNEL_MERGE_TAG = 'bhav-bhakti-notification-channel';

// Copies the caller-supplied silhouette PNG into a single, non-density-
// qualified drawable folder. A notification icon doesn't need per-density
// precision the way a launcher icon does (see the app's adaptive-icon safe-
// zone gotcha, CLAUDE.md §39, for contrast) - Android scales this fine.
function withNotificationIconFile(config, { icon }) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const sourcePath = path.join(config.modRequest.projectRoot, icon);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(
          `[withNotifications] Notification icon not found at "${icon}". ` +
            `Add the white/transparent silhouette PNG there before running a prebuild/rebuild.`
        );
      }

      const drawableDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/drawable'
      );
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(sourcePath, path.join(drawableDir, `${NOTIFICATION_ICON_DRAWABLE_NAME}.png`));

      return config;
    },
  ]);
}

// Registers the accent color as a real Android color resource, since the
// manifest meta-data below can only point FCM at a `@color/...` reference,
// not a raw hex literal.
function withNotificationColorResource(config, { color }) {
  return withAndroidColors(config, (config) => {
    config.modResults = AndroidConfig.Colors.setColorItem(
      { _: color, $: { name: NOTIFICATION_COLOR_RESOURCE_NAME } },
      config.modResults
    );
    return config;
  });
}

// FCM's Android SDK reads default_notification_icon off <application> to
// pick the small status-bar icon - this is the actual, documented mechanism
// (react-native-firebase GitHub issue #1796), just wired up by hand instead
// of by a plugin belonging to a second notification library.
//
// default_notification_channel_id/default_notification_color are
// DELIBERATELY NOT written here, even though FCM reads them the same way -
// @react-native-firebase/messaging's own bundled AndroidManifest.xml already
// declares both (as Gradle manifest placeholders, `${firebaseJsonNotification
// ChannelId}`/`${firebaseJsonNotificationColor}`), resolved from a
// `firebase.json` file at the project root (see that file, and RNFB's own
// android/firebase-json.gradle + messaging/android/build.gradle). Writing
// them here too would mean two independent sources permanently claiming the
// same two meta-data keys - AGP's manifest merger only tolerates that when
// both sides declare the exact same value, so this file's hardcoded values
// would have to be kept manually in sync with firebase.json forever, and any
// drift between them (e.g. changing one file but forgetting the other) would
// silently reintroduce the original manifest-merger failure. firebase.json is
// the single, authoritative source for these two specific keys instead,
// matching RNFB's own intended configuration mechanism for them.
// No firebase.json equivalent exists for the icon, so it stays here as our
// app's only declaration of that one key - confirmed via RNFB's own
// bundled manifest, which never declares default_notification_icon at all.
function withNotificationManifestMetadata(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'com.google.firebase.messaging.default_notification_icon',
      `@drawable/${NOTIFICATION_ICON_DRAWABLE_NAME}`,
      'resource'
    );

    return config;
  });
}

// The manifest meta-data above only tells FCM which channel ID to post
// through - Android still requires that channel to have been created via
// NotificationManager.createNotificationChannel() at least once, or nothing
// will ever display on it (hard Android 8+ requirement). RNFB's messaging
// module exposes no JS API for this (channel management is explicitly out of
// its scope, per its own docs - see the icon plugin comment above for the
// same reasoning). Created natively here, once, at app startup instead -
// fully-qualified class names are used inline so no import lines need
// injecting into MainApplication.kt separately. Guarded by an SDK_INT check
// since NotificationChannel itself doesn't exist before API 26, and this
// project's minSdkVersion is lower than that.
function withNotificationChannelNative(config, { channelId, channelName }) {
  return withMainApplication(config, (config) => {
    const isKotlin = config.modResults.language === 'kt';

    const kotlinSnippet = `    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val channel = android.app.NotificationChannel(
        "${channelId}",
        "${channelName}",
        android.app.NotificationManager.IMPORTANCE_DEFAULT
      )
      val manager = getSystemService(android.app.NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }`;

    const javaSnippet = `    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      android.app.NotificationChannel channel = new android.app.NotificationChannel(
          "${channelId}", "${channelName}", android.app.NotificationManager.IMPORTANCE_DEFAULT);
      android.app.NotificationManager manager =
          (android.app.NotificationManager) getSystemService(android.app.NotificationManager.class);
      if (manager != null) {
        manager.createNotificationChannel(channel);
      }
    }`;

    config.modResults.contents = mergeContents({
      src: config.modResults.contents,
      newSrc: isKotlin ? kotlinSnippet : javaSnippet,
      tag: CHANNEL_MERGE_TAG,
      anchor: /super\.onCreate\(\);?/,
      offset: 1,
      comment: '//',
    }).contents;

    return config;
  });
}

module.exports = function withNotifications(config, { icon, color, channelId, channelName }) {
  config = withNotificationIconFile(config, { icon });
  config = withNotificationColorResource(config, { color });
  config = withNotificationManifestMetadata(config);
  config = withNotificationChannelNative(config, { channelId, channelName });
  return config;
};
