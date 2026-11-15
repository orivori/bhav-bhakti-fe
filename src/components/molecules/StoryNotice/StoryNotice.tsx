import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useStoryNoticeStore } from '@/store/storyNoticeStore';

// The centred story ad-lock notice (storyNoticeStore.ts), mounted once at the
// app root next to AdUnlockSheet. Same card as AdUnlockSheet's opt-in card -
// theme, colours, corners, fonts, spacing - with a message and one OK
// button; no logo or artwork. OK, a tap on the dimmed area outside the card
// and hardware back all dismiss it.
export const StoryNotice: React.FC = () => {
  const { t } = useTranslation();
  const messageKey = useStoryNoticeStore((state) => state.messageKey);
  const registerHost = useStoryNoticeStore((state) => state.registerHost);
  const dismiss = useStoryNoticeStore((state) => state.dismiss);

  useEffect(() => registerHost(), [registerHost]);

  return (
    <Modal visible={messageKey !== null} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.overlay} onPress={dismiss} accessibilityRole="button">
        {/* A tap on the card itself doesn't dismiss - only OK or outside. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text variant="body" align="center" style={styles.body}>
            {messageKey ? t(messageKey) : ''}
          </Text>
          <Button
            title={t('storyLock.ok')}
            onPress={dismiss}
            variant="primary"
            fullWidth
            textStyle={styles.buttonText}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Same values as AdUnlockSheet: explicit lineHeight/minHeight floors
// (CLAUDE.md §71) so Devanagari is never clipped, and the §132 Button label
// fix (flex 1, centred, line-height floor) so "ठीक है" isn't cut.
const BODY_FONT_SIZE = 18;
const BODY_LINE_HEIGHT = 30;
const BUTTON_LINE_HEIGHT = 26;

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
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    minHeight: BODY_LINE_HEIGHT,
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  buttonText: {
    flex: 1,
    textAlign: 'center',
    lineHeight: BUTTON_LINE_HEIGHT,
    minHeight: BUTTON_LINE_HEIGHT,
  },
});
