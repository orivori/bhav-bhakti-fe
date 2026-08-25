module.exports = {
  expo: {
    name: "Bhav Bhakti",
    slug: "bhav-bhakti",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "bhavbhakti",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.orivori.bhavbhakti",
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
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.orivori.bhavbhakti",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      softwareKeyboardLayoutMode: "pan",
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO",
        "READ_MEDIA_AUDIO",
        "RECORD_AUDIO",
        "WAKE_LOCK",
        "FOREGROUND_SERVICE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
        "android.permission.ACCESS_MEDIA_LOCATION",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.WAKE_LOCK",
        "android.permission.FOREGROUND_SERVICE",
      ],
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
          isAccessMediaLocationEnabled: true,
        },
      ],
      [
        "expo-av",
        {
          microphonePermission: "Allow this app to access your microphone for audio playback.",
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
    ],
    extra: {
      router: {},
      eas: {
        projectId: "565b0611-1665-4d59-b95e-33f4058e4144",
      },
    },
    owner: "hiorivoris-team",
  },
};
