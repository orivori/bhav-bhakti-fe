import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useAppNoticeStore, type NoticeText } from '@/store/appNoticeStore';

// The general centred notice (appNoticeStore.ts), mounted once at the app
// root next to AdUnlockSheet and StoryNotice. Same cream card as the ad
// opt-in card (AdUnlockSheet): theme background, corners, padding, buttons.
// Optional title, body, numbered steps and a small hint; an optional orange
// main button and an "OK" button. Back or a tap on the dimmed area outside
// the card closes it ('dismissed').
export const AppNotice: React.FC = () => {
  const { t } = useTranslation();
  const content = useAppNoticeStore((state) => state.content);
  const registerHost = useAppNoticeStore((state) => state.registerHost);
  const answer = useAppNoticeStore((state) => state.answer);

  useEffect(() => registerHost(), [registerHost]);

  const say = (text: NoticeText | undefined): string => (text ? String(t(text.key, text.params)) : '');
  const hasPrimary = !!content?.primaryButton;

  return (
    <Modal
      visible={content !== null}
      transparent
      animationType="fade"
      onRequestClose={() => answer('dismissed')}
    >
      <Pressable style={styles.overlay} onPress={() => answer('dismissed')} accessibilityRole="button">
        {/* A tap on the card itself doesn't close it - only a button or outside. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {content?.title && (
            <Text variant="body" weight="bold" align="center" style={styles.title}>
              {say(content.title)}
            </Text>
          )}
          {content?.body && (
            <Text variant="body" align="center" style={styles.body}>
              {say(content.body)}
            </Text>
          )}
          {!!content?.steps?.length && (
            <View style={styles.steps}>
              {content.stepsTitle && (
                <Text variant="body" weight="bold" style={styles.stepsTitle}>
                  {say(content.stepsTitle)}
                </Text>
              )}
              {content.steps.map((step, index) => (
                <View key={`${index}-${step.key}`} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text variant="body" weight="bold" align="center" style={styles.stepNumberText}>
                      {String(index + 1)}
                    </Text>
                  </View>
                  <Text variant="body" style={styles.stepText}>
                    {say(step)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {content?.hint && (
            <Text variant="body" color="muted" style={styles.hint}>
              {say(content.hint)}
            </Text>
          )}
          <View style={styles.buttonsTop} />
          {hasPrimary && (
            <>
              <Button
                title={say(content?.primaryButton)}
                onPress={() => answer('primary')}
                variant="primary"
                fullWidth
                textStyle={styles.buttonText}
              />
              <View style={styles.buttonGap} />
            </>
          )}
          <Button
            title={say(content?.closeButton)}
            onPress={() => answer('close')}
            variant={hasPrimary ? 'outline' : 'primary'}
            fullWidth
            textStyle={styles.buttonText}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Every text has an explicit lineHeight AND minHeight floor (CLAUDE.md §71):
// Android's own text measurement clips Devanagari otherwise. Every Button
// uses the §132 label fix (flex 1, centred, line-height floor 26) - the same
// values as AdUnlockSheet and StoryNotice.
const TITLE_FONT_SIZE = 20;
const TITLE_LINE_HEIGHT = 32;
const BODY_FONT_SIZE = 17;
const BODY_LINE_HEIGHT = 28;
const STEP_FONT_SIZE = 16;
const STEP_LINE_HEIGHT = 26;
const STEP_NUMBER_SIZE = 26;
const HINT_FONT_SIZE = 14;
const HINT_LINE_HEIGHT = 22;
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
  title: {
    fontSize: TITLE_FONT_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    minHeight: TITLE_LINE_HEIGHT,
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  body: {
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    minHeight: BODY_LINE_HEIGHT,
    alignSelf: 'stretch',
  },
  steps: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  stepsTitle: {
    fontSize: STEP_FONT_SIZE,
    lineHeight: STEP_LINE_HEIGHT,
    minHeight: STEP_LINE_HEIGHT,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    width: STEP_NUMBER_SIZE,
    height: STEP_NUMBER_SIZE,
    borderRadius: STEP_NUMBER_SIZE / 2,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 20,
    minWidth: 12,
  },
  // flex 1: the step wraps onto a second line instead of being cut off.
  stepText: {
    flex: 1,
    fontSize: STEP_FONT_SIZE,
    lineHeight: STEP_LINE_HEIGHT,
    minHeight: STEP_LINE_HEIGHT,
  },
  hint: {
    alignSelf: 'stretch',
    fontSize: HINT_FONT_SIZE,
    lineHeight: HINT_LINE_HEIGHT,
    minHeight: HINT_LINE_HEIGHT,
    marginTop: 4,
  },
  buttonsTop: {
    height: 20,
  },
  buttonText: {
    flex: 1,
    textAlign: 'center',
    lineHeight: BUTTON_LINE_HEIGHT,
    minHeight: BUTTON_LINE_HEIGHT,
  },
  buttonGap: {
    height: 12,
  },
});
