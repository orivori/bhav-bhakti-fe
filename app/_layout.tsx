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
// Removed react-native-gesture-handler dependency for smaller bundle size

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
    background: '#fff6da', // Warm cream/ivory background from your CSS
  },
};

export default function RootLayout() {
  // Enable screenshot protection globally (non-blocking)
  useScreenshotProtection();

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

    // Hide splash screen immediately since we're not loading fonts
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <View style={styles.container}>
            <NavigationThemeProvider value={MyTheme}>
              <Stack screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#fff6da' },
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal'
              }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="(main)"
                  options={{
                    headerShown: false,
                    gestureEnabled: false // Disable gesture for tabs
                  }}
                />
                {/* Detail Screens as Stack Screens */}
                <Stack.Screen
                  name="horoscope-detail"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    gestureEnabled: true,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="audio-player"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    gestureEnabled: true,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="profile"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    gestureEnabled: true,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="search-results"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    gestureEnabled: true,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="mantra-quiz"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    gestureEnabled: true,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="choose-start"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    gestureEnabled: true,
                    animation: 'slide_from_right'
                  }}
                />
              </Stack>
            </NavigationThemeProvider>
          </View>
          <StatusBar style="dark" translucent backgroundColor="transparent" />
          <PremiumPaywall />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da', // Warm cream/ivory background
  },
});