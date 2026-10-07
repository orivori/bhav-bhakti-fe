const {
  ANDROID_NOTIFICATION_CHANNEL_ID,
  ANDROID_NOTIFICATION_CHANNEL_NAME,
  NOTIFICATION_ACCENT_COLOR,
} = require("./src/shared/config/notificationChannel");

const APP_VARIANT = process.env.APP_VARIANT || "production";
const IS_DEV_VARIANT = APP_VARIANT !== "production";

const APP_NAME = IS_DEV_VARIANT ? "Bhav Bhakti (Dev)" : "Bhav Bhakti";
const PACKAGE_NAME = IS_DEV_VARIANT ? "com.orivori.bhavbhakti.dev" : "com.orivori.bhavbhakti";

const META_APP_ID = "957510006786328";
const META_CLIENT_TOKEN = "c84d393bf7fb6e3c92d591cdd2aacd5c";

module.exports = {
  expo: {
    name: APP_NAME,
    slug: "bhav-bhakti",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "bhavbhakti",
    updates: {
      url: "https://u.expo.dev/565b0611-1665-4d59-b95e-33f4058e4144",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: PACKAGE_NAME,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "This app needs access to your photo library to save wallpapers.",
        NSPhotoLibraryAddUsageDescription: "This app needs permission to save wallpapers to your photo library.",
        NSMicrophoneUsageDescription: "This app uses the microphone for audio playback controls.",
        ITSAppUsesNonExemptEncryption: false,
        UIAppFonts: [],
        UIBackgroundModes: ["audio"],
      },
    },
    android: {
      versionCode: 4,
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: PACKAGE_NAME,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      softwareKeyboardLayoutMode: "pan",
      // No photo/video read permissions: the app only saves wallpapers and
      // ringtones, which Android 13+ allows with no permission at all (Play's
      // Photo and Video Permissions policy rejected versionCode 7 for
      // declaring them). READ_MEDIA_AUDIO stays for the ringtone
      // "already saved" check; READ/WRITE_EXTERNAL_STORAGE for Android 10-12.
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_AUDIO",
        "WAKE_LOCK",
        "FOREGROUND_SERVICE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.WAKE_LOCK",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.POST_NOTIFICATIONS",
      ],
      // Stripped from the final manifest even when a library's own manifest
      // declares them (expo-screen-capture adds READ_MEDIA_IMAGES for
      // Android 13, expo-media-library READ_MEDIA_VISUAL_USER_SELECTED,
      // expo-audio RECORD_AUDIO). The app never reads the gallery or records.
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
        "android.permission.RECORD_AUDIO",
      ],
      // Android 11+ (API 30+) package-visibility restrictions can make
      // Linking.canOpenURL('mailto:...')/openURL() silently fail in a real
      // release build without this - needed for the account-deletion
      // screen's mailto: handoff.
      queries: {
        intent: [
          {
            action: "android.intent.action.SENDTO",
            data: { scheme: "mailto" },
          },
        ],
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    experiments: {
      typedRoutes: true,
    },
    plugins: [
      "expo-router",
      [
        "expo-media-library",
        {
          photosPermission: "Allow this app to access your photos to save wallpapers.",
          savePhotosPermission: "Allow this app to save wallpapers to your photos.",
          isAccessMediaLocationEnabled: false,
          // Audio only - no READ_MEDIA_IMAGES/VIDEO (see blockedPermissions).
          granularPermissions: ["audio"],
        },
      ],
      [
        "expo-av",
        {
          // The app never records - no RECORD_AUDIO.
          microphonePermission: false,
        },
      ],
      "expo-audio",
      "expo-build-properties",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          imageWidth: 210,
        },
      ],
      [
        "react-native-share",
        {
          android: ["com.whatsapp", "com.instagram.android", "com.facebook.katana"],
          ios: [],
        },
      ],
      "@react-native-community/datetimepicker",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/crashlytics",
      "@react-native-firebase/analytics",
      "@react-native-firebase/messaging",
      [
        "./plugins/withNotifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: NOTIFICATION_ACCENT_COLOR,
          channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
          channelName: ANDROID_NOTIFICATION_CHANNEL_NAME,
        },
      ],
      // Meta (Facebook) App Events SDK, production package only - the single
      // Meta App is registered for com.orivori.bhavbhakti alone, and .dev
      // builds must never send events into it (see Bhav_Bhakti_Meta_SDK_Plan.md,
      // decision #3). src/utils/analytics/metaEvents.ts no-ops to match.
      // Neither value is a secret: both ship inside every built APK.
      ...(IS_DEV_VARIANT
        ? []
        : [
            [
              "react-native-fbsdk-next",
              {
                appID: META_APP_ID,
                clientToken: META_CLIENT_TOKEN,
                displayName: APP_NAME,
                // Initializes on launch and logs installs/app opens with no
                // JS call needed.
                isAutoInitEnabled: true,
                autoLogAppEventsEnabled: true,
                advertiserIDCollectionEnabled: true,
              },
            ],
          ]),
    ],
    extra: {
      router: {},
      // Readable at runtime via Constants.expoConfig.extra.appVariant - lets
      // the app tell the backend it's the .dev variant (e.g. for the
      // isTestAccount signal on login) without needing an EXPO_PUBLIC_-
      // prefixed duplicate of the build-time-only APP_VARIANT above.
      appVariant: APP_VARIANT,
      eas: {
        projectId: "565b0611-1665-4d59-b95e-33f4058e4144",
      },
    },
    owner: "hiorivoris-team",
  },
};
