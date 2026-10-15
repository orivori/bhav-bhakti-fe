import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { openStoreForUpdate } from '@/utils/appUpdate/openStoreForUpdate';

// Full-screen "please update" hard block, shown while the installed build is
// below the backend's minimum (src/utils/appUpdate/). Same takeover as
// MaintenanceScreen: app/_layout.tsx renders this INSTEAD of the root
// <Stack>, so no route, modal, bottom sheet or deep link gets around it, and
// playback stops. Only way forward is Update. If the minimum is lowered (or
// the prompt switched off), the next foreground re-check - unthrottled while
// blocked, see app/_layout.tsx - lets the navigator remount fresh.
export function UpdateRequiredScreen() {
  const { t } = useTranslation();

  // No navigator is mounted behind this screen, so hardware back has nowhere
  // to go - exit the app explicitly rather than rely on the default.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="arrow-up-circle-outline" size={36} color={goldenTempleTheme.colors.primary.DEFAULT} />
        </View>

        {/* Explicit width + lineHeight/minHeight floors on every text: the
            CLAUDE.md §71 fix for Android's Devanagari self-measurement
            clipping Hindi text. */}
        <Text variant="h4" weight="bold" align="center" style={styles.title}>
          {t('appUpdate.requiredTitle')}
        </Text>

        <Text variant="body" color="secondary" align="center" style={styles.body}>
          {t('appUpdate.requiredBody')}
        </Text>

        <Button
          title={t('appUpdate.update')}
          onPress={openStoreForUpdate}
          variant="primary"
          fullWidth
          style={styles.updateButton}
          textStyle={styles.buttonText}
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
    marginBottom: 24,
  },
  updateButton: {
    maxWidth: 320,
  },
  buttonText: {
    lineHeight: 24,
    minHeight: 24,
  },
});
