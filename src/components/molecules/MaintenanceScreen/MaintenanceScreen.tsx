import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeatureFlagStore } from '@/store/featureFlagStore';

// Full-screen "we'll be back soon" takeover, shown while the backend's
// MAINTENANCE_MODE flag is on. app/_layout.tsx renders this INSTEAD of the
// root <Stack> (not as an overlay on top of it), so no route, tab, modal,
// bottom sheet or deep link exists to get around it. When the flag goes back
// off, the navigator remounts fresh through app/index.tsx.
export function MaintenanceScreen() {
  const { t } = useTranslation();
  const maintenanceMessage = useFeatureFlagStore((state) => state.flags.maintenanceMessage);
  const isFetching = useFeatureFlagStore((state) => state.isFetching);

  // No navigator is mounted behind this screen, so hardware back has nowhere
  // to go - exit the app explicitly rather than rely on the default.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const handleRetry = () => {
    useFeatureFlagStore.getState().fetchRemoteFlags();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct-outline" size={36} color={goldenTempleTheme.colors.primary.DEFAULT} />
        </View>

        {/* Explicit width + lineHeight/minHeight floors on every text: the
            CLAUDE.md §71 fix for Android's Devanagari self-measurement
            clipping Hindi text. */}
        <Text variant="h4" weight="bold" align="center" style={styles.title}>
          {t('maintenance.title')}
        </Text>

        <Text variant="body" color="secondary" align="center" style={styles.body}>
          {t('maintenance.body')}
        </Text>

        {maintenanceMessage ? (
          <Text variant="body" align="center" style={styles.message}>
            {maintenanceMessage}
          </Text>
        ) : null}

        <Button
          title={isFetching ? t('maintenance.checking') : t('maintenance.retry')}
          onPress={handleRetry}
          variant="primary"
          disabled={isFetching}
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
  message: {
    width: '100%',
    lineHeight: 24,
    minHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    maxWidth: 320,
    marginTop: 8,
  },
  retryText: {
    lineHeight: 24,
    minHeight: 24,
  },
});
