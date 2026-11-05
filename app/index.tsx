import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/shared/stores/authStore';
import { useGuestStartStore } from '@/store/guestStartStore';
import { startGuestSession } from '@/features/authentication/services/guestSession';
import { GuestStartScreen } from '@/components/molecules/GuestStartScreen';

// Reading a stored login normally takes milliseconds. Past this, offer Retry
// rather than a spinner with no way out. It never starts a guest: only a
// finished read can decide that there's no stored login.
const STORAGE_STUCK_MS = 10000;

export default function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const guestStatus = useGuestStartStore((state) => state.status);
  const [isStorageStuck, setIsStorageStuck] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => setIsStorageStuck(true), STORAGE_STUCK_MS);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // A valid stored token always wins: this only runs once storage has been read
  // and found no usable login.
  useEffect(() => {
    if (!isLoading && !isAuthenticated && guestStatus === 'idle') {
      startGuestSession();
    }
  }, [isLoading, isAuthenticated, guestStatus]);

  if (isAuthenticated) {
    return <Redirect href="/(main)" />;
  }

  if (isLoading && isStorageStuck) {
    return (
      <GuestStartScreen
        reason="failed"
        onRetry={() => {
          setIsStorageStuck(false);
          useAuthStore.getState().initializeAuth();
        }}
      />
    );
  }

  if (!isLoading && (guestStatus === 'offline' || guestStatus === 'failed')) {
    return <GuestStartScreen reason={guestStatus} onRetry={startGuestSession} />;
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
