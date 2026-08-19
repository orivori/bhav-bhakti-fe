import React, { forwardRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from 'react-i18next';

const TARGET_PRESETS = [27, 54, 108];

// Progress ring geometry - rebuild (CounterSheet full rebuild). Radius +
// half the stroke width (66) stays comfortably inside the 140px SVG
// (bounding box radius 70), leaving a few px of breathing room so the
// rounded stroke caps never get clipped at the edge.
const RING_SIZE = 140;
const RING_STROKE_WIDTH = 12;
const RING_RADIUS = 60;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface CounterSheetProps {
  chantCount: number;
  targetCount: number;
  isAutoLooping: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onSelectTarget: (target: number) => void;
  onOpenMoreTargets: () => void;
}

export const CounterSheet = forwardRef<BottomSheetModal, CounterSheetProps>(
  (
    {
      chantCount,
      targetCount,
      isAutoLooping,
      onIncrement,
      onDecrement,
      onSelectTarget,
      onOpenMoreTargets,
    },
    ref
  ) => {
    const { t } = useTranslation('player');
    // Clamped to 100 - targetCount can end up smaller than chantCount if a
    // shorter preset is picked after the count has already passed it (the
    // preset-selection handler doesn't reset/clamp chantCount), which would
    // otherwise push strokeDashoffset negative and visually break the ring.
    const rawProgress = targetCount > 0 ? (chantCount / targetCount) * 100 : 0;
    const progress = Math.min(Math.max(rawProgress, 0), 100);
    const ringDashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.content}>
          <Text weight="semibold" style={styles.title}>{t('target')}</Text>

          <View style={styles.counterRow}>
            <TouchableOpacity onPress={onDecrement} style={styles.counterButton} activeOpacity={0.7}>
              <Ionicons name="remove" size={24} color={designSystemTheme.colors.primary} />
            </TouchableOpacity>

            {/* Progress ring rebuild - a real SVG stroke arc replaces the old
                rotate-a-rectangle hack, which could only ever cover exactly
                50% of the circle's area regardless of the actual percentage
                (a fixed-size half-circle "blade" just spinning in place).
                strokeDasharray/strokeDashoffset genuinely represents any
                0-100% value. The SVG itself is rotated -90deg so progress
                starts at 12 o'clock and sweeps clockwise, matching the
                universal convention for this kind of ring - the text
                overlay is a separate, non-rotated sibling so it stays
                upright regardless of the ring's own rotation. */}
            <View style={styles.progressCircle}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringRotate}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={designSystemTheme.colors.secondary}
                  strokeWidth={RING_STROKE_WIDTH}
                  fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={designSystemTheme.colors.primary}
                  strokeWidth={RING_STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringDashOffset}
                  strokeLinecap="round"
                />
              </Svg>

              {/* Count/target text - single string per Text element
                  (template literals, not string+expression as separate JSX
                  children) - the simplest, least ambiguous form for the
                  native Text renderer, specifically because an earlier
                  two-child version showed an unexplained blank target
                  number on a real device that couldn't be traced to any
                  conditional/data bug in the surrounding code.

                  Divided into two stacked sections with a thin horizontal
                  line between them (style adjustment) - replaces the "/"
                  separator, which no longer fits at equal-weight styling:
                  bold count + bold "/ 108" together ran wider than the
                  ring's ~116px inner clear space (140px ring minus 2x the
                  12px stroke), confirmed on-device as a real regression.
                  Both numbers now 20px bold (down from 24px), same weight,
                  read as one unit via the divider rather than a "/". */}
              <View style={styles.progressTextOverlay} pointerEvents="none">
                <View style={styles.progressTextSection}>
                  <Text weight="bold" style={styles.currentCount}>{`${chantCount}`}</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressTextSection}>
                  <Text weight="bold" style={styles.targetCountText}>{`${targetCount}`}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={onIncrement} style={styles.incrementButton} activeOpacity={0.7}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {isAutoLooping && (
            <View style={styles.autoLoopIndicator}>
              <Text weight="semibold" style={styles.autoLoopText}>{t('autoLoopActive')}</Text>
            </View>
          )}

          <View style={styles.targetOptions}>
            {TARGET_PRESETS.map((count) => (
              <TouchableOpacity
                key={count}
                onPress={() => onSelectTarget(count)}
                style={[styles.targetChip, targetCount === count && styles.targetChipSelected]}
                activeOpacity={0.7}
              >
                <Text
                  weight="semibold"
                  style={[
                    styles.targetChipText,
                    targetCount === count && styles.targetChipTextSelected,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={onOpenMoreTargets} style={styles.moreTargetsButton} activeOpacity={0.7}>
              <Text style={styles.moreTargetsText}>{t('more')}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

CounterSheet.displayName = 'CounterSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: designSystemTheme.colors.surface,
    borderTopLeftRadius: goldenTempleTheme.borderRadius.xl,
    borderTopRightRadius: goldenTempleTheme.borderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: '#D9D9D9',
    width: 40,
  },
  content: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing['2xl'],
    alignItems: 'center',
  },
  // lineHeight explicitly set rather than left to the shared Text atom's
  // default `body` variant (lineHeight: 20) - fontSize 20 sitting inside a
  // 20px line box left zero buffer for the 'g' descender, a confirmed real
  // clipping bug (rebuild fix, item 4).
  title: {
    fontSize: designSystemTheme.fontSizes.cardTitle,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystemTheme.colors.textPrimary,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: designSystemTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: designSystemTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringRotate: {
    transform: [{ rotate: '-90deg' }],
  },
  // Absolutely positioned over the (rotated) Svg sibling rather than nested
  // inside it, so the rotation applied to the ring never touches the text.
  progressTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Each number's own section - just centers its single line, no fixed
  // height needed since the divider between them provides the visual
  // separation, not spacing.
  progressTextSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Replaces the "/" separator (style adjustment) - a fixed width narrower
  // than the ring's ~116px inner clear space, so it reads as a divider
  // between the two numbers without approaching the stroke on either side.
  progressDivider: {
    width: 40,
    height: 1,
    backgroundColor: designSystemTheme.colors.textSecondary,
    marginVertical: 4,
  },
  // fontSize reduced 24->20 (style adjustment - the prior 24px equal-weight
  // version, plus a "/" separator, ran wider than the ring's inner clear
  // space and clipped on-device). lineHeight kept with real headroom above
  // fontSize (the same clipping-bug class fixed elsewhere in this file).
  currentCount: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 'bold',
    color: designSystemTheme.colors.textPrimary,
  },
  // Matches currentCount's weight/size exactly, color deliberately still
  // textSecondary (not asked to change) so the two numbers stay visually
  // distinguishable as count vs. target despite reading as one unit.
  targetCountText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 'bold',
    color: designSystemTheme.colors.textSecondary,
  },
  autoLoopIndicator: {
    backgroundColor: designSystemTheme.colors.secondary,
    borderRadius: 12,
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: 4,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  autoLoopText: {
    fontSize: 12,
    fontWeight: '600',
    color: designSystemTheme.colors.primary,
  },
  targetOptions: {
    flexDirection: 'row',
    gap: goldenTempleTheme.spacing.sm,
    alignItems: 'center',
  },
  targetChip: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: designSystemTheme.colors.secondary,
  },
  targetChipSelected: {
    backgroundColor: designSystemTheme.colors.primary,
  },
  targetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: designSystemTheme.colors.primary,
  },
  targetChipTextSelected: {
    color: '#fff',
  },
  moreTargetsButton: {
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: goldenTempleTheme.spacing.sm,
  },
  moreTargetsText: {
    fontSize: 13,
    color: designSystemTheme.colors.textSecondary,
  },
});
