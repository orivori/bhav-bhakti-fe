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
    background: '#FFF8F0', // Warm cream/ivory background from your CSS
  },
};

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
        <View style={styles.container}>
          <NavigationThemeProvider value={MyTheme}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF8F0' } }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(main)" options={{ headerShown: false }} />
            </Stack>
          </NavigationThemeProvider>
        </View>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <PremiumPaywall />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Warm cream/ivory background
  },
});