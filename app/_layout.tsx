import React from 'react';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ImageBackground, StyleSheet, View, Dimensions } from 'react-native';
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

const { width, height } = Dimensions.get('window');

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

export default function RootLayout() {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  // Enable screenshot protection globally (non-blocking)
  useScreenshotProtection();

  React.useEffect(() => {
    // Hide splash screen immediately since we're not loading fonts
    SplashScreen.hideAsync();
  }, []);

  const handleImageLoad = () => {
    console.log('✅ Background image loaded successfully');
    setImageLoaded(true);
  };

  const handleImageError = (error: any) => {
    console.log('❌ Background image failed to load:', error);
    console.log('Error details:', error.nativeEvent);
    setImageLoaded(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImageBackground
          source={{
            uri: 'https://bhav-bhakti.s3.ap-south-1.amazonaws.com/assets/app_background_v1.png',
            cache: 'force-cache'
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          imageStyle={styles.imageStyle}
        >
          {!imageLoaded && (
            <View style={styles.fallbackBackground} />
          )}
          <ThemeProvider value={MyTheme}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(main)" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </ImageBackground>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <PremiumPaywall />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  imageStyle: {
    opacity: 1, // Ensure full opacity
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  fallbackBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});