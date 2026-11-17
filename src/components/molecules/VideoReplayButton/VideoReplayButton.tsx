import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// The round replay button shown over a video wallpaper that has played once
// (usePlayOnceVideo). Centred over the video box it is placed in; the box
// must be the positioned parent. Icon only - the text is the screen-reader
// label ("Replay" / "फिर से चलाएँ"), so no Hindi line-height issues.
//
// It is its own touchable inside the tile's / card's touchable, so React
// Native gives the tap to it alone: tapping replay never opens the Viewing
// Window or the tile's other tap action.
interface VideoReplayButtonProps {
  onPress: () => void;
  size?: 'small' | 'large';
}

export function VideoReplayButton({ onPress, size = 'large' }: VideoReplayButtonProps) {
  const { t } = useTranslation();
  const isSmall = size === 'small';
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.button, isSmall ? styles.buttonSmall : styles.buttonLarge]}
        onPress={onPress}
        activeOpacity={0.8}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={t('feedCard.replayVideo')}
      >
        <Ionicons name="reload" size={isSmall ? 22 : 30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  buttonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  buttonLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});
