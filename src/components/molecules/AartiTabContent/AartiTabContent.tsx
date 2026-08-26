import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/atoms';
import AudioContentCard from '@/components/molecules/AudioContentCard';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useAudioFeed } from '@/features/feed/hooks/useAudioFeed';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';

interface AartiTabContentProps {
  filter: DeityFilterSelection;
}

// Same shape as RingtonesTabContent (see that file) - FlatList wrapper with
// loading/error/empty states, driven by useAudioFeed('aarti', filter)
// instead of useRingtones(filter). Cards navigate into the shared
// audio-player.tsx screen (persistent playback) rather than playing inline,
// unlike RingtoneFeedCard - see AudioContentCard for why.
function AartiTabContent({ filter }: AartiTabContentProps, ref: React.Ref<FlatList>) {
  const { t } = useTranslation();
  const { contentPadding } = useTabBarHeight();
  const {
    items: aartis,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadItems,
    handleRefresh,
    handleLoadMore,
    handleLike,
  } = useAudioFeed('aarti', filter);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<Feed>) => (
    <AudioContentCard feed={item} subTab="aarti" queueItems={aartis} queueIndex={index} onLike={handleLike} />
  ), [aartis, handleLike]);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      return (
        <View style={styles.endMessage}>
          <Text variant="caption" style={styles.endText}>
            🪔 You've reached the end! 🪔
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="caption" style={styles.loadingText}>
            Loading more aartis...
          </Text>
        </View>
      );
    }

    return <View style={styles.footerSpacing} />;
  }, [hasMore, isLoadingMore]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="body" style={styles.loadingText}>
            Loading aartis...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="musical-notes-outline" size={48} color="#FF6B35" />
          </View>
          <Text variant="h4" style={styles.errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text variant="body" style={styles.errorMessage}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadItems()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filter.kind === 'liked') {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color="#FF8C42" />
          </View>
          <Text variant="h4" style={styles.emptyTitle}>
            {t('common.noLikedContent')}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="musical-notes" size={48} color="#FF8C42" />
        </View>
        <Text variant="h4" style={styles.emptyTitle}>
          No Aartis Yet
        </Text>
        <Text variant="body" style={styles.emptySubtitle}>
          Aartis are coming soon!
        </Text>
      </View>
    );
  }, [isLoading, error, loadItems, filter.kind, t]);

  const keyExtractor = useCallback((item: Feed) => item.id.toString(), []);

  return (
    <FlatList
      ref={ref}
      data={aartis}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={renderEmptyComponent}
      ListFooterComponent={renderFooter}
      style={styles.list}
      contentContainerStyle={[{ paddingBottom: contentPadding },
        styles.listContent,
        aartis.length === 0 && styles.emptyContainer,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#FF6B35']}
          tintColor="#FF6B35"
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.7}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
      updateCellsBatchingPeriod={16}
    />
  );
}

export default React.forwardRef(AartiTabContent);

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingTop: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  footerSpacing: {
    height: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
  },
  endMessage: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#8E8E93',
    fontSize: 14,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    backgroundColor: '#FFF5F0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 280,
    color: '#8E8E93',
    lineHeight: 22,
  },
  errorIcon: {
    width: 100,
    height: 100,
    backgroundColor: '#FFF5F0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  errorMessage: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
    color: '#8E8E93',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
