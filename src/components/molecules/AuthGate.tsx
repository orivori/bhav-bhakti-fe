import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useOnboardingStore } from '@/shared/stores/onboardingStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasCompletedOnboarding } = useOnboardingStore();

  useEffect(() => {
    if (isLoading) {
      return; // Still checking auth status
    }

    // If user is authenticated, go to main app
    if (isAuthenticated) {
      router.replace('/(main)');
      return;
    }

    // If user hasn't completed onboarding, show language selection
    if (!hasCompletedOnboarding) {
      router.replace('/(auth)/language-onboarding');
      return;
    }

    // Otherwise, show login screen
    router.replace('/(auth)/phone-login');
  }, [isAuthenticated, isLoading, hasCompletedOnboarding]);

  // Show loading state while determining route
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4824A" />
        <Text variant="body" style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff6da',
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
  },
});