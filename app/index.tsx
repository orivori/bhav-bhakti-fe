import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useOnboardingStore } from '@/shared/stores/onboardingStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasCompletedOnboarding } = useOnboardingStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4824A" />
      </View>
    );
  }

  // If user is authenticated, go to main app
  if (isAuthenticated) {
    return <Redirect href="/(main)" />;
  }

  // If user hasn't completed onboarding, show language selection
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(auth)/language-onboarding" />;
  }

  // Otherwise, show login screen
  return <Redirect href="/(auth)/phone-login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff6da',
  },
});