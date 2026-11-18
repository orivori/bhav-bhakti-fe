import React, { forwardRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms';
import { FeedImage } from '@/components/atoms/FeedImage';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from 'react-i18next';
import type { QueueItem } from '@/store/playbackStore';
import { canPlayQueueItem, parseStoryState } from '@/features/stories/storyLock';

interface QueueSheetProps {
  // Already resolved into ACTIVE order by the caller (shuffled order when
  // shuffled, true order otherwise) - this component just renders whatever
  // list it's given and reports back the tapped position within THAT list.
  // Purely a list, per the corrected Phase 8 scope - no shuffle toggle or
  // other controls live here, those moved to the main control bar.
  items: QueueItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  // Open/closed reporting for Android back (useSheetBackStack).
  onChange?: (index: number) => void;
  onDismiss?: () => void;
}

export const QueueSheet = forwardRef<BottomSheetModal, QueueSheetProps>(
  ({ items, currentIndex, onSelectIndex, onChange, onDismiss }, ref) => {
    const { t } = useTranslation('player');

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
        // Stories ad-lock: a story row the server sent as next/locked (no
        // audio) shows a lock; 'locked' rows are greyed. Rows without a
        // state (lock off, any other content) look exactly as before.
        const storyState = parseStoryState(item.storyState);
        const isLockedStory = storyState !== null && !canPlayQueueItem(item);

        return (
          <TouchableOpacity
            style={[styles.row, isActive && styles.rowActive, isLockedStory && storyState === 'locked' && styles.rowLocked]}
            onPress={() => onSelectIndex(index)}
            activeOpacity={0.7}
          >
            {item.thumbnailUrl ? (
              <FeedImage uri={item.thumbnailUrl} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="musical-notes" size={18} color={goldenTempleTheme.colors.primary.DEFAULT} />
              </View>
            )}

            {/* Story episodes: number in front, and up to 2 lines (story
                titles are long; no lineHeight override, so Hindi keeps the
                Text atom's taller Devanagari line - CLAUDE.md §71). Every
                other row is unchanged. */}
            <Text
              numberOfLines={item.episodeNumber ? 2 : 1}
              weight={isActive ? 'bold' : 'normal'}
              style={[styles.title, isActive && styles.titleActive]}
            >
              {item.episodeNumber ? `${item.episodeNumber}. ${item.title}` : item.title}
            </Text>

            {isActive && (
              <Ionicons name="volume-medium" size={18} color={designSystemTheme.colors.primary} />
            )}
            {!isActive && isLockedStory && (
              <Ionicons
                name="lock-closed"
                size={18}
                color={storyState === 'next' ? designSystemTheme.colors.primary : goldenTempleTheme.colors.text.secondary}
              />
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
        onChange={onChange}
        onDismiss={onDismiss}
        enableDynamicSizing={false}
        snapPoints={['60%']}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <View style={styles.header}>
          <Text weight="semibold" style={styles.sheetTitle}>{t('upNext')}</Text>
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
  rowLocked: {
    opacity: 0.5,
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
