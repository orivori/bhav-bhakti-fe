import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import Text from '@/components/atoms/Text/Text';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

const AUTO_DISMISS_MS = 7000;
const FADE_MS = 200;
const TAIL_SIZE = 14;
// The counter button (roundControlButton in audio-player.tsx) is a fixed
// 80x80. The bubble is right-aligned to the button's own right edge (see
// `container`'s alignItems:'flex-end' below), so the button's true center
// sits BUTTON_WIDTH/2 in from that shared right edge - TAIL_INSET_FROM_RIGHT
// is the tail's own marginRight needed to land its center at that same
// point, regardless of the bubble's own (dynamic, text-length-dependent)
// width.
const BUTTON_WIDTH = 80;
const TAIL_INSET_FROM_RIGHT = BUTTON_WIDTH / 2 - TAIL_SIZE / 2;
// Same fill as SearchBar/RingtoneFeedCard/AudioContentCard/MantraFeedCard -
// no dedicated theme token exists for this value (confirmed via a repo-wide
// grep before building this), so this matches the established convention of
// repeating the raw hex with a comment rather than inventing a new token.
const FILL_COLOR = '#f7ebc4';

interface ChantHintBubbleProps {
  visible: boolean;
  onHide: () => void;
}

// Positioned by the caller (audio-player.tsx) as an absolutely-positioned
// sibling of the counter button, inside a wrapper with alignItems:'flex-end' -
// that wrapper's right-alignment is what flushes this bubble's right edge to
// the button's own right edge (= the page's standard right margin), rather
// than centering it over the button - a wide bubble ("Chant this mantra")
// centered on an 80px button would extend past that margin, potentially
// off-screen entirely. The tail is separately inset from that same right
// edge (see TAIL_INSET_FROM_RIGHT) so it still visually points at the
// button's true center even though the bubble itself no longer is.
// Deliberately non-interactive (pointerEvents="none") - a tap anywhere on
// screen DOES dismiss this bubble (per CLAUDE.md), but that's handled by
// audio-player.tsx's screen-level onStartShouldSetResponderCapture, not by
// this component intercepting touches itself; pointerEvents="none" here is
// what guarantees this bubble can never block a tap meant for the button (or
// anything else) underneath/behind it from reaching its real target.
const ChantHintBubble: React.FC<ChantHintBubbleProps> = ({ visible, onHide }) => {
  const { t } = useTranslation('player');
  // Tracks whether the component should still be in the tree, separately
  // from the `visible` prop - both the auto-dismiss timer AND an external
  // visible=false (the counter button being tapped) go through the same
  // fade-out animation before actually unmounting, rather than vanishing
  // instantly the moment `visible` flips.
  const [isRendered, setIsRendered] = React.useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      setIsRendered(true);
      opacity.setValue(0);
      scale.setValue(0.9);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
      ]).start();

      const timer = setTimeout(hide, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    } else if (isRendered) {
      hide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hide = () => {
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
      setIsRendered(false);
      onHide();
    });
  };

  if (!isRendered) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.bubble, { opacity, transform: [{ scale }] }]}>
        {/* Same proven fix from CLAUDE.md's Hindi-truncation investigation
            (Up Next/Logout/See-all): an explicit minWidth instead of relying
            on RN's own Devanagari text self-measurement, which that
            investigation confirmed silently clips the second word of short
            phrases like "जाप करें" with no ellipsis. Harmless for the
            English string too. */}
        <Text weight="semibold" style={styles.text}>
          {t('chantHint')}
        </Text>
      </Animated.View>
      {/* Tail: a plain rotated square in normal flow, pulled up with a
          negative marginTop to overlap/merge into the bubble's bottom edge -
          same fill color as the bubble so the seam is invisible, rendering
          on top of it (later sibling) fills the corner gap cleanly. */}
      <Animated.View style={[styles.tail, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  // bottom: 90 = the 80px counter button height + a ~10px gap so the tail
  // tip sits just above the button rather than touching it. Hand-tuned,
  // hardcoded to the button's own known size (CLAUDE.md-approved default,
  // not live-measured) - needs a quick on-device look to confirm it reads
  // right, not pixel-derived from a formula.
  // alignItems: 'flex-end' (not 'center') - flushes both children's right
  // edges to this container's own right edge, which the PARENT wrapper's own
  // alignItems:'flex-end' (counterButtonWrapper, in audio-player.tsx) in
  // turn flushes to the button's right edge = the page's standard right
  // margin. The tail then pulls itself back inward from that shared edge via
  // its own marginRight (see TAIL_INSET_FROM_RIGHT) to stay visually
  // centered on the button despite the bubble no longer being.
  container: {
    position: 'absolute',
    bottom: 90,
    alignItems: 'flex-end',
  },
  bubble: {
    backgroundColor: FILL_COLOR,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...goldenTempleTheme.shadows.md,
  },
  text: {
    fontSize: 13,
    color: goldenTempleTheme.colors.text.primary,
    minWidth: 90,
    textAlign: 'center',
    textAlignVertical: 'auto',
  },
  tail: {
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    backgroundColor: FILL_COLOR,
    transform: [{ rotate: '45deg' }],
    marginTop: -(TAIL_SIZE / 2) - 2,
    marginRight: TAIL_INSET_FROM_RIGHT,
    borderBottomRightRadius: 2,
  },
});

export default ChantHintBubble;
