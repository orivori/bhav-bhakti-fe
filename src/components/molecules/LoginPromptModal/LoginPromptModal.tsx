import React, { useEffect, useRef } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useGlobalSearchParams } from 'expo-router';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { useAuthStore } from '@/shared/stores/authStore';

// Contextual "please log in again" prompt, shown in place over whatever screen the
// user was on when a genuinely login-gated action 401'd (see apiClient.ts) - the
// same architecture as PremiumPaywall (one global boolean in a Zustand store, one
// modal mounted once at the app root), not a full-app redirect.
export function LoginPromptModal() {
  const { showLoginPrompt, setShowLoginPrompt } = useAuthPromptStore();
  const { logout } = useAuthStore();

  // Tracked continuously (not just while visible) so that whenever the prompt
  // does appear, these refs already hold the screen/params the user was
  // actually on - usePathname()/useGlobalSearchParams() are read from outside
  // any specific route's own tree here (this component isn't a routed screen),
  // so the global variant is used rather than useLocalSearchParams(), which
  // would only ever see this component's own (nonexistent) route params.
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const pathnameRef = useRef(pathname);
  const paramsRef = useRef(params);

  useEffect(() => {
    pathnameRef.current = pathname;
    paramsRef.current = params;
  }, [pathname, params]);

  const handleLogin = async () => {
    // Direct store call, not useAuth()'s wrapped logout() - that shared
    // function is also Profile's own Logout button and always redirects with
    // no returnTo, which isn't what's wanted here. Awaited (matching
    // useAuth.tsx's own logout() sequencing) so tokens are actually cleared
    // before navigating away - no separate loading state needed for this,
    // since it's a single, fast, local storage clear, not a network call.
    await logout();
    setShowLoginPrompt(false);

    router.replace({
      pathname: '/(auth)/phone-login',
      params: {
        returnTo: pathnameRef.current,
        returnParams: JSON.stringify(paramsRef.current ?? {}),
      },
    });
  };

  return (
    <Modal
      visible={showLoginPrompt}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLoginPrompt(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={32} color={goldenTempleTheme.colors.primary.DEFAULT} />
          </View>

          <Text variant="h4" weight="bold" align="center" style={styles.title}>
            Session Expired
          </Text>

          <Text variant="body" color="secondary" align="center" style={styles.message}>
            Your login session has expired. Please login again to continue using the app.
          </Text>

          <Button title="Login" onPress={handleLogin} variant="primary" fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: goldenTempleTheme.colors.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
    lineHeight: 20,
  },
});
