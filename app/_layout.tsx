import React from 'react';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/authentication/hooks/useAuth';
import { PremiumPaywall } from '@/components/molecules/PremiumPaywall';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { ToastProvider } from '@/components/atoms/Toast';
import { Audio } from 'expo-av';
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
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: goldenTempleTheme.colors.background } }}>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(main)" options={{ headerShown: false }} />
                  </Stack>
                </NavigationThemeProvider>
              </View>
              <StatusBar style="dark" translucent backgroundColor="transparent" />
              <PremiumPaywall />
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