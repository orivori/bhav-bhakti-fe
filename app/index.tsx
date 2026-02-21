import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(auth)/phone-login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});