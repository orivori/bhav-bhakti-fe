import React, { forwardRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { QueueItem } from '@/store/playbackStore';

interface QueueSheetProps {
  // Already resolved into ACTIVE order by the caller (shuffled order when
  // shuffled, true order otherwise) - this component just renders whatever
  // list it's given and reports back the tapped position within THAT list.
  // Purely a list, per the corrected Phase 8 scope - no shuffle toggle or
  // other controls live here, those moved to the main control bar.
  items: QueueItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export const QueueSheet = forwardRef<BottomSheetModal, QueueSheetProps>(
  ({ items, currentIndex, onSelectIndex }, ref) => {
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

    const renderItem = useCallback(
      ({ item, index }: { item: QueueItem; index: number }) => {
        const isActive = index === currentIndex;

        return (
          <TouchableOpacity
            style={[styles.row, isActive && styles.rowActive]}
            onPress={() => onSelectIndex(index)}
            activeOpacity={0.7}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="musical-notes" size={18} color={goldenTempleTheme.colors.primary.DEFAULT} />
              </View>
            )}

            <Text
              numberOfLines={1}
              style={[styles.title, isActive && styles.titleActive]}
            >
              {item.title}
            </Text>

            {isActive && (
              <Ionicons name="volume-medium" size={18} color={designSystemTheme.colors.primary} />
            )}
          </TouchableOpacity>
        );
      },
      [currentIndex, onSelectIndex]
    );

    const keyExtractor = useCallback((item: QueueItem, index: number) => `${item.feedId}-${index}`, []);

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing={false}
        snapPoints={['60%']}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <View style={styles.header}>
          <Text style={styles.sheetTitle}>{t('upNext')}</Text>
        </View>

        <BottomSheetFlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
        />
      </BottomSheetModal>
    );
  }
);

QueueSheet.displayName = 'QueueSheet';

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
  header: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing.sm,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: designSystemTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: goldenTempleTheme.borderRadius.md,
  },
  rowActive: {
    backgroundColor: designSystemTheme.colors.secondary,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: goldenTempleTheme.colors.muted[200],
  },
  thumbnailPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: designSystemTheme.fontSizes.body,
    color: designSystemTheme.colors.textPrimary,
  },
  titleActive: {
    fontWeight: '700',
    color: designSystemTheme.colors.primary,
  },
});
