import React from 'react';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/authentication/hooks/useAuth';
import { PremiumPaywall } from '@/components/molecules/PremiumPaywall';
import { LoginPromptModal } from '@/components/molecules/LoginPromptModal';
import { ErrorBoundary } from '@/components/molecules/ErrorBoundary';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { ToastProvider } from '@/components/atoms/Toast';
import { Audio } from 'expo-av';
import { getCrashlytics, setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics';
import { getMessaging, onNotificationOpenedApp, getInitialNotification } from '@react-native-firebase/messaging';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import {
  useFonts,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import i18n from '@/shared/i18n';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { runCacheEviction } from '@/utils/cacheEviction';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useNotificationPermissionStore } from '@/store/notificationPermissionStore';
import { requestNotificationPermissionAndSubscribe } from '@/utils/notifications/permission';
import { navigateFromNotificationData } from '@/utils/notifications/deepLink';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: goldenTempleTheme.colors.background, // Warm cream/ivory background from your CSS
  },
};

export default function RootLayout() {
  // Enable screenshot protection globally (non-blocking)
  useScreenshotProtection();

  // Bridges useI18nStore (the real language-selection source of truth) into
  // react-i18next's resolver. Re-fires on the zustand-persist rehydration
  // update too, since that's a normal state change through the same selector.
  const i18nLanguage = useI18nStore((state) => state.language);
  React.useEffect(() => {
    i18n.changeLanguage(i18nLanguage);
  }, [i18nLanguage]);

  // Loads the app's Devanagari font, one file per weight. The keys here are
  // load-time identifiers that expo-font resolves `fontFamily` styles against
  // by exact string match - see textUtils.ts's NOTO_SANS_DEVANAGARI_FONT_FAMILIES,
  // the single source of truth every fontFamily reference in the app reads
  // from, whose four values must name these same four keys.
  const [fontsLoaded, fontError] = useFonts({
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
  });

  React.useEffect(() => {
    // Initialize audio session for background playback
    const initializeAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true, // Enable background audio
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 2, // INTERRUPTION_MODE_IOS_DO_NOT_MIX
          interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
        });
        console.log('✅ Global audio session initialized for background playback');
      } catch (error) {
        console.error('❌ Failed to initialize audio session:', error);
      }
    };

    initializeAudioSession();
  }, []);

  React.useEffect(() => {
    // Basic cache eviction policy, run once per cold start - see
    // cacheEviction.ts for the full rationale. Fire-and-forget: doesn't gate
    // the splash screen or anything else below, since disk cleanup has no
    // reason to delay the app becoming usable.
    runCacheEviction();
  }, []);

  React.useEffect(() => {
    // Release builds collect by default, but debug builds (the `development`
    // EAS profile) don't - force it on regardless of build type so the
    // `.dev`/debug-client testing path also reports crashes.
    setCrashlyticsCollectionEnabled(getCrashlytics(), true).catch(console.error);
  }, []);

  React.useEffect(() => {
    // One remote fetch per cold start, merged over the hardcoded defaults
    // already in featureFlagStore's initial state - see that file for the
    // full rationale. Fire-and-forget, same as cache eviction above: never
    // gates the splash screen, and a failed/offline fetch silently keeps
    // the defaults already in effect.
    useFeatureFlagStore.getState().fetchRemoteFlags();
  }, []);

  // Requests push-notification permission + subscribes to the broadcast
  // topic at most once, ever, per install - fires the moment the user is
  // authenticated, whether via a fresh login (authStore.login()) or, for an
  // existing already-logged-in user opening the app for the first time after
  // this feature ships, authStore.initializeAuth() restoring a still-valid
  // session on cold start. Both set isAuthenticated the same way, so this one
  // check covers both cases with no special-casing - see
  // notificationPermissionStore.ts and CLAUDE.md's push-notification plan.
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const { hasRequestedPermission, markRequested } = useNotificationPermissionStore.getState();
    if (hasRequestedPermission) {
      return;
    }

    requestNotificationPermissionAndSubscribe().finally(markRequested);
  }, [isAuthenticated]);

  React.useEffect(() => {
    // The app's first-ever deep-link handler (see deepLink.ts). Two separate
    // lifecycle signals are needed since a notification tap can happen from
    // two different app states.
    const messagingInstance = getMessaging();

    // App was backgrounded, tap brought it back to the foreground.
    const unsubscribeOpenedApp = onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      navigateFromNotificationData(remoteMessage?.data);
    });

    // App was fully killed, tap cold-started it - checked once, on mount.
    getInitialNotification(messagingInstance).then((remoteMessage) => {
      if (remoteMessage) {
        navigateFromNotificationData(remoteMessage.data);
      }
    });

    return unsubscribeOpenedApp;
  }, []);

  React.useEffect(() => {
    // Don't reveal the app until the Devanagari font is ready (or has failed
    // to load) - hiding the splash screen earlier would let Hindi text flash
    // in the wrong font for a frame on every cold start.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <ToastProvider>
            <AuthProvider>
              <View style={styles.container}>
                <NavigationThemeProvider value={MyTheme}>
                  <ErrorBoundary>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: goldenTempleTheme.colors.background } }}>
                      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                      <Stack.Screen name="(main)" options={{ headerShown: false }} />
                    </Stack>
                  </ErrorBoundary>
                </NavigationThemeProvider>
              </View>
              <StatusBar style="dark" translucent backgroundColor="transparent" />
              <PremiumPaywall />
              <LoginPromptModal />
            </AuthProvider>
          </ToastProvider>
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background, // Warm cream/ivory background
  },
});