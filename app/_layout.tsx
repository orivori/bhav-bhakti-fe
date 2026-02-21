import React from 'react';
import { Stack } from 'expo-router';
import { ImageBackground, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/authentication/hooks/useAuth';
import { PremiumPaywall } from '@/components/molecules/PremiumPaywall';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  // Enable screenshot protection globally (non-blocking)
  useScreenshotProtection();

  React.useEffect(() => {
    // Hide splash screen immediately since we're not loading fonts
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImageBackground
          source={require('../assets/app_main.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(main)" options={{ headerShown: false }} />
          </Stack>
        </ImageBackground>
        <StatusBar style="auto" />
        <PremiumPaywall />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
});