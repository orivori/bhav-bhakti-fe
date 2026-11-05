import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import type { GuestStartFailure } from '@/features/authentication/utils/guestStartRules';

interface GuestStartScreenProps {
  reason: GuestStartFailure;
  onRetry: () => void;
}

// Shown by app/index.tsx when a session couldn't be started. There's no login
// to fall back on, and nothing behind this screen, so back exits the app.
export function GuestStartScreen({ reason, onRetry }: GuestStartScreenProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const isOffline = reason === 'offline';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isOffline ? 'cloud-offline-outline' : 'refresh-outline'}
            size={36}
            color={goldenTempleTheme.colors.primary.DEFAULT}
          />
        </View>

        {/* Width + lineHeight/minHeight floors: the CLAUDE.md §71 and §132 fix
            for Android clipping Devanagari text. */}
        <Text variant="h4" weight="bold" align="center" style={styles.title}>
          {t(isOffline ? 'guestStart.offlineTitle' : 'guestStart.failedTitle')}
        </Text>

        <Text variant="body" color="secondary" align="center" style={styles.body}>
          {t(isOffline ? 'guestStart.offlineBody' : 'guestStart.failedBody')}
        </Text>

        <Button
          title={t('guestStart.retry')}
          onPress={onRetry}
          variant="primary"
          fullWidth
          style={styles.retryButton}
          textStyle={styles.retryText}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    width: '100%',
    lineHeight: 32,
    minHeight: 32,
    marginBottom: 12,
  },
  body: {
    width: '100%',
    lineHeight: 24,
    minHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    maxWidth: 320,
    marginTop: 8,
  },
  // flex + centred: the §132 fix for a Button label under-measuring in Hindi.
  retryText: {
    flex: 1,
    textAlign: 'center',
    lineHeight: 26,
    minHeight: 26,
  },
});
