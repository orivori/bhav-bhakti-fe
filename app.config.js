const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default {
  expo: {
    name: "Bhav Bhakti",
    slug: "bhavbhakti",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "bhavbhakti",

    // Splash screen configuration
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#fff6da", // Match app's cream background
      hideAsync: true
    },

    // iOS Configuration
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.vivekpandit.bhavbhakti",
      buildNumber: "1",
      infoPlist: {
        NSPhotoLibraryUsageDescription: "This app needs access to your photo library to save wallpapers.",
        NSPhotoLibraryAddUsageDescription: "This app needs permission to save wallpapers to your photo library.",
        NSMicrophoneUsageDescription: "This app uses the microphone for audio playback controls.",
        ITSAppUsesNonExemptEncryption: false,
        UIAppFonts: [],
        UIBackgroundModes: ["audio"],
        // Performance optimizations
        UILaunchStoryboardName: "SplashScreen",
        UIRequiresPersistentWiFi: false,
        UIApplicationExitsOnSuspend: false,
      }
    },

    // Android Configuration
    android: {
      versionCode: 1,
      package: "com.vivekpandit.bhavbhakti",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: "pan",

      // Optimized adaptive icon
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#fff6da"
      },

      // Essential permissions only
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_AUDIO",
        "RECORD_AUDIO",
        "WAKE_LOCK",
        "FOREGROUND_SERVICE",
        "MODIFY_AUDIO_SETTINGS",
        "ACCESS_NETWORK_STATE",
        "INTERNET"
      ]
    },

    // Web configuration (if needed)
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro" // Use Metro for consistency
    },

    // Performance and optimization settings
    experiments: {
      typedRoutes: true
    },

    // Essential plugins only
    plugins: [
      "expo-router",
      [
        "expo-media-library",
        {
          photosPermission: "Allow this app to access your photos to save wallpapers.",
          savePhotosPermission: "Allow this app to save wallpapers to your photos.",
          isAccessMediaLocationEnabled: true
        }
      ],
      [
        "expo-av",
        {
          microphonePermission: "Allow this app to access your microphone for audio playbook."
        }
      ],
      "@react-native-community/datetimepicker"
    ],

    // Additional configuration
    extra: {
      router: {},
      eas: {
        projectId: "b829a0a4-75a5-4081-9cf7-68d5c987d199"
      }
    },
    owner: "vivekpandit",

    // Production optimizations
    ...(IS_PRODUCTION && {
      updates: {
        enabled: false // Disable OTA updates for production builds
      },
      assetBundlePatterns: [
        "**/*"
      ]
    })
  }
};