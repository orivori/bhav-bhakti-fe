import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from 'react-i18next';

const TARGET_COUNT_OPTIONS = [27, 54, 108, 216, 324, 540, 1008];

interface MoreTargetsSheetProps {
  targetCount: number;
  onSelectTarget: (target: number) => void;
}

// Replaces the old plain-View "Select Target Count" overlay, which lived
// directly in audio-player.tsx's own view tree and rendered BEHIND
// CounterSheet - CounterSheet/QueueSheet's BottomSheetModal content is
// portaled by BottomSheetModalProvider (mounted at app/_layout.tsx's root)
// to a top-level overlay layer entirely separate from the normal screen
// tree, so no zIndex value on a plain in-tree view could ever out-rank it.
// A real, second BottomSheetModal under the same provider is the fix -
// gorhom stacks nested/sequentially-presented sheets correctly by design.
export const MoreTargetsSheet = forwardRef<BottomSheetModal, MoreTargetsSheetProps>(
  ({ targetCount, onSelectTarget }, ref) => {
    const { t } = useTranslation('player');
    // A local ref drives the actual BottomSheetModal so this component can
    // call .dismiss() on itself after a selection; useImperativeHandle
    // still exposes that same instance to the parent's forwarded ref for
    // .present(), exactly like calling ref.current?.present() on
    // CounterSheet/QueueSheet today.
    const sheetRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal);

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

    // Select-and-confirm in one tap: updates the real target (the existing,
    // already-correctly-wired onSelectTarget/handleTargetCountChange, no
    // changes needed there) and dismisses immediately - no separate
    // confirm step. Tapping the backdrop dismisses too, via
    // pressBehavior="close" above - the same mechanism CounterSheet/
    // QueueSheet already rely on, so tap-outside-to-dismiss comes for free
    // from converting to a real BottomSheetModal, without needing a
    // hand-built two-layer Pressable backdrop.
    const handleSelect = (count: number) => {
      onSelectTarget(count);
      sheetRef.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.content}>
          <Text weight="semibold" style={styles.title}>{t('target')}</Text>

          <View style={styles.optionsGrid}>
            {TARGET_COUNT_OPTIONS.map((count) => (
              <TouchableOpacity
                key={count}
                onPress={() => handleSelect(count)}
                style={[styles.chip, targetCount === count && styles.chipSelected]}
                activeOpacity={0.7}
              >
                <Text
                  weight="semibold"
                  style={[styles.chipText, targetCount === count && styles.chipTextSelected]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

MoreTargetsSheet.displayName = 'MoreTargetsSheet';

// Chip styling (unselected/selected/text) matches CounterSheet's own
// targetChip/targetChipSelected/targetChipText exactly, and sheetBackground
// matches CounterSheet/QueueSheet's plain white surface - both replace the
// old mustard-yellow card with translucent-white pills, which predated the
// CounterSheet rebuild and never got updated to match.
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
  },
  // lineHeight explicit rather than inherited from the shared Text atom's
  // default `body` variant - the same descender-clipping bug class already
  // fixed on CounterSheet's own title, applied here from the start.
  title: {
    fontSize: designSystemTheme.fontSizes.cardTitle,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystemTheme.colors.textPrimary,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: goldenTempleTheme.spacing.sm,
  },
  chip: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    backgroundColor: designSystemTheme.colors.secondary,
  },
  chipSelected: {
    backgroundColor: designSystemTheme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: designSystemTheme.colors.primary,
  },
  chipTextSelected: {
    color: '#fff',
  },
});
