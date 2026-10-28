import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useAdFlowStore } from '@/store/adFlowStore';

// Opt-in card for a rewarded-ad unlock (Revenue Model §5e section 4), driven
// by adFlowStore and mounted once at the app root next to PremiumPaywall.
//
// - 'offer': "Watch a short ad to unlock" with "Watch ad" / "Not now". Same
//   centred-card look as Premium's coming-soon popup. Back = "Not now".
// - 'loading': a full-screen overlay with a spinner that swallows every tap
//   until the ad is ready (or the 8 s timeout falls through). Back cancels.
// - 'showing': hidden - our card is gone before Google's ad opens, so
//   nothing of ours ever sits over or next to the ad.
//
// Nothing here asks or hints that the user should tap or interact with the
// ad itself (AdMob policy - Revenue Model §5d guardrails).
export const AdUnlockSheet: React.FC = () => {
  const { t } = useTranslation();
  const phase = useAdFlowStore((state) => state.phase);
  const registerHost = useAdFlowStore((state) => state.registerHost);
  const answerOptIn = useAdFlowStore((state) => state.answerOptIn);
  const cancelLoading = useAdFlowStore((state) => state.cancelLoading);

  useEffect(() => registerHost(), [registerHost]);

  const visible = phase === 'offer' || phase === 'loading';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => (phase === 'loading' ? cancelLoading() : answerOptIn('decline'))}
    >
      <View style={styles.overlay}>
        {phase === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
            <Text variant="body" align="center" style={styles.loadingText}>
              {t('adUnlock.loading')}
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text variant="body" align="center" style={styles.body}>
              {t('adUnlock.body')}
            </Text>
            <Button title={t('adUnlock.watch')} onPress={() => answerOptIn('watch')} variant="primary" fullWidth />
            <View style={styles.buttonGap} />
            <Button title={t('adUnlock.notNow')} onPress={() => answerOptIn('decline')} variant="outline" fullWidth />
          </View>
        )}
      </View>
    </Modal>
  );
};

// Explicit lineHeight/minHeight floors (CLAUDE.md §71): Android's own text
// measurement clips Devanagari, so the Hindi strings get guaranteed room.
const BODY_LINE_HEIGHT = 26;
const LOADING_LINE_HEIGHT = 24;

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
    alignItems: 'stretch',
  },
  body: {
    lineHeight: BODY_LINE_HEIGHT,
    minHeight: BODY_LINE_HEIGHT * 2,
    marginBottom: 20,
  },
  buttonGap: {
    height: 12,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: goldenTempleTheme.colors.background,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    lineHeight: LOADING_LINE_HEIGHT,
    minHeight: LOADING_LINE_HEIGHT,
  },
});
