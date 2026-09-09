import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms';
import { LegalDocumentContent } from '@/components/molecules/LegalDocumentViewer';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { LEGAL_DOCUMENT_TITLES, LegalDocType } from '@/shared/config/legalDocuments';

const VALID_DOC_TYPES: LegalDocType[] = ['terms', 'privacy', 'refund'];

// Full-screen presentation mode for LegalDocumentViewer - pushed from
// Profile's three legal menu items (see profile.tsx's appOptions). This
// screen's only entry point is Profile, so "back" is hardcoded there rather
// than threaded through as a returnTo param, same reasoning as
// edit-profile.tsx.
export default function LegalDocumentScreen() {
  const { docType: rawDocType } = useLocalSearchParams<{ docType?: string }>();
  const { language } = useI18nStore();

  const docType: LegalDocType = VALID_DOC_TYPES.includes(rawDocType as LegalDocType)
    ? (rawDocType as LegalDocType)
    : 'terms';

  const title = LEGAL_DOCUMENT_TITLES[docType][language === 'hi' ? 'hi' : 'en'];

  const handleBack = useCallback(() => {
    router.replace('/(main)/profile');
  }, []);

  // Android's hardware back button and its edge-swipe gesture both dispatch
  // through 'hardwareBackPress' (app.config.js sets predictiveBackGestureEnabled:
  // false, so this isn't routed through Android 13+'s separate predictive-back
  // API) - without this listener, either one falls through to React
  // Navigation's own default pop, which lands on Home regardless of actual
  // entry point since it doesn't know this screen's back destination is
  // Profile. Same fix as audio-player.tsx's handleBack/BackHandler pairing -
  // returning true after calling handleBack keeps the chevron tap, hardware
  // button, and gesture in permanent lockstep. useFocusEffect (not a plain
  // mount/unmount effect) is required since Tabs screens in this app don't
  // unmount between navigations.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={goldenTempleTheme.colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <LegalDocumentContent docType={docType} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: goldenTempleTheme.spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
});
