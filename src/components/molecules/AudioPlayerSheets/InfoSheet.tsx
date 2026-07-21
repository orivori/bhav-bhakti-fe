import React, { forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from '@/shared/i18n/useTranslation';

interface InfoSheetProps {
  title: string;
  description: string;
  deity: string;
  objective: string;
  tags: string[];
}

export const InfoSheet = forwardRef<BottomSheetModal, InfoSheetProps>(
  ({ title, description, deity, objective, tags }, ref) => {
    const { t } = useTranslation();

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
          <Text style={styles.sheetTitle}>{t('contentDetails')}</Text>

          <Text style={styles.contentTitle}>{title}</Text>

          {!!description && <Text style={styles.description}>{description}</Text>}

          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('deity')}</Text>
              <Text style={styles.infoValue}>{deity}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('objective')}</Text>
              <Text style={styles.infoValue}>{objective}</Text>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

InfoSheet.displayName = 'InfoSheet';

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
  sheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: designSystemTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  contentTitle: {
    fontSize: designSystemTheme.fontSizes.cardTitle,
    fontWeight: 'bold',
    color: designSystemTheme.colors.textPrimary,
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  description: {
    fontSize: designSystemTheme.fontSizes.body,
    color: designSystemTheme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: goldenTempleTheme.spacing.sm,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  tag: {
    backgroundColor: designSystemTheme.colors.secondary,
    borderRadius: goldenTempleTheme.borderRadius.md,
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: 6,
  },
  tagText: {
    color: designSystemTheme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: designSystemTheme.colors.secondary,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: designSystemTheme.colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: designSystemTheme.fontSizes.body,
    fontWeight: '600',
    color: designSystemTheme.colors.textPrimary,
    textAlign: 'center',
  },
});
