import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from '@/shared/i18n/useTranslation';

const TARGET_PRESETS = [27, 54, 108];

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
    const { t } = useTranslation();
    const progress = targetCount > 0 ? (chantCount / targetCount) * 100 : 0;

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
          <Text style={styles.title}>{t('target')}</Text>

          <View style={styles.counterRow}>
            <TouchableOpacity onPress={onDecrement} style={styles.counterButton} activeOpacity={0.7}>
              <Ionicons name="remove" size={24} color={designSystemTheme.colors.primary} />
            </TouchableOpacity>

            <View style={styles.progressCircle}>
              <View
                style={[
                  styles.progressFillCircle,
                  { transform: [{ rotate: `${progress * 3.6}deg` }] },
                ]}
              />
              <View style={styles.progressInner}>
                <Text style={styles.currentCount}>{chantCount}</Text>
                <Text style={styles.targetCountText}>/ {targetCount}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onIncrement} style={styles.incrementButton} activeOpacity={0.7}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {isAutoLooping && (
            <View style={styles.autoLoopIndicator}>
              <Text style={styles.autoLoopText}>{t('autoLoopActive')}</Text>
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
  title: {
    fontSize: designSystemTheme.fontSizes.cardTitle,
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
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: designSystemTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFillCircle: {
    position: 'absolute',
    width: '100%',
    height: '50%',
    backgroundColor: designSystemTheme.colors.primary,
    top: 0,
    left: 0,
    transformOrigin: '50% 100%',
  },
  progressInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: designSystemTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  currentCount: {
    fontSize: designSystemTheme.fontSizes.h2,
    fontWeight: 'bold',
    color: designSystemTheme.colors.textPrimary,
  },
  targetCountText: {
    fontSize: 14,
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
