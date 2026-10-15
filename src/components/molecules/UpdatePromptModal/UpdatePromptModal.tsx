import React, { useEffect, useRef } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { useUpdatePromptStore } from '@/store/updatePromptStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { usePremiumStore } from '@/store/premiumStore';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { openStoreForUpdate } from '@/utils/appUpdate/openStoreForUpdate';
import { shouldShowSoftPrompt } from '@/utils/appUpdate/updateDecision';
import { useUpdateRequirement } from '@/utils/appUpdate/useUpdateRequirement';

// How long after a cold start or a return to the foreground the prompt may
// still appear. Outside it, nothing new is shown - the prompt never pops up
// in the middle of a session.
const CALM_MOMENT_WINDOW_MS = 15 * 1000;

// Soft "a new version is available" prompt - the installed build is below
// the backend's latest build (src/utils/appUpdate/). Same centred card as
// PremiumPaywall's coming-soon popup, mounted once at the app root.
//
// Only at a calm moment: shortly after a cold start or a return from the
// background, at most once per session, and only when shouldShowSoftPrompt
// agrees (logged in, on a main tab, nothing playing, no other modal, not the
// install's first session, not snoozed). Home's autoplay previews pause
// while it's open (AutoplayFeedCard reads isVisible).
//
// "Later" and Android back snooze it for 3 days for this latest build;
// "Update" opens the store and snoozes it the same way, so a user who comes
// back without updating isn't asked again straight away.
export function UpdatePromptModal() {
  const { t } = useTranslation();
  const requirement = useUpdateRequirement();
  const latestBuild = useFeatureFlagStore((state) => state.flags.latestBuild);
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSomethingPlaying = usePlaybackStore(
    (state) => !!(state.persistent?.nowPlaying.isPlaying || state.ephemeral?.nowPlaying.isPlaying)
  );
  const isPaywallOpen = usePremiumStore((state) => state.showPaywall);
  const isLoginPromptOpen = useAuthPromptStore((state) => state.showLoginPrompt);
  const isOtherModalOpen = isPaywallOpen || isLoginPromptOpen;
  const { hasHydrated, isFirstSession, hasShownThisSession, isVisible, dismissedForLatest, dismissedAt, show, dismiss } =
    useUpdatePromptStore();

  // Armed at mount (cold start) and on every return to the foreground.
  const armedAtRef = useRef(Date.now());
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active') {
        armedAtRef.current = Date.now();
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasHydrated || isVisible) return;
    const now = Date.now();
    if (now - armedAtRef.current > CALM_MOMENT_WINDOW_MS) return;
    const shouldShow = shouldShowSoftPrompt({
      requirement,
      latestBuild,
      isAuthenticated,
      pathname,
      isSomethingPlaying,
      isOtherModalOpen,
      isFirstSession,
      hasShownThisSession,
      dismissedForLatest,
      dismissedAt,
      now,
    });
    if (shouldShow) show();
  }, [
    hasHydrated,
    isVisible,
    requirement,
    latestBuild,
    isAuthenticated,
    pathname,
    isSomethingPlaying,
    isOtherModalOpen,
    isFirstSession,
    hasShownThisSession,
    dismissedForLatest,
    dismissedAt,
    show,
  ]);

  // Close it if the reason goes away while it's open (prompt switched off,
  // or the build turned out to need the hard block instead).
  useEffect(() => {
    if (isVisible && requirement !== 'soft') {
      useUpdatePromptStore.setState({ isVisible: false });
    }
  }, [isVisible, requirement]);

  const handleLater = () => {
    if (latestBuild !== null) dismiss(latestBuild);
    else useUpdatePromptStore.setState({ isVisible: false });
  };

  const handleUpdate = () => {
    handleLater();
    openStoreForUpdate();
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleLater}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="arrow-up-circle-outline" size={32} color={goldenTempleTheme.colors.primary.DEFAULT} />
          </View>

          {/* §71 line-height floors for Hindi. */}
          <Text variant="h4" weight="bold" align="center" style={styles.title}>
            {t('appUpdate.softTitle')}
          </Text>

          <Text variant="body" color="secondary" align="center" style={styles.message}>
            {t('appUpdate.softBody')}
          </Text>

          <Button
            title={t('appUpdate.update')}
            onPress={handleUpdate}
            variant="primary"
            fullWidth
            textStyle={styles.buttonText}
          />
          <Button
            title={t('appUpdate.later')}
            onPress={handleLater}
            variant="outline"
            fullWidth
            style={styles.laterButton}
            textStyle={styles.buttonText}
          />
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
    width: '100%',
    lineHeight: 30,
    minHeight: 30,
    marginBottom: 8,
  },
  message: {
    width: '100%',
    lineHeight: 22,
    minHeight: 22,
    marginBottom: 24,
  },
  laterButton: {
    marginTop: 12,
  },
  buttonText: {
    lineHeight: 24,
    minHeight: 24,
  },
});
