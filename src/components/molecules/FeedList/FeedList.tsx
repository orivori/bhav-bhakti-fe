import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { Text } from '@/components/atoms';
import FeedCard from '../FeedCard/FeedCard';
import RingtoneFeedCard from '../RingtoneFeedCard/RingtoneFeedCard';
import { Feed, FeedFilters } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeedStore } from '@/store/feedStore';

interface FeedListProps {
  feeds: Feed[];
  onLoadMore: () => void;
  onRefresh: () => void;
  onFeedPress?: (feed: Feed) => void;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptySubtitle?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  autoPlayVideo?: boolean;
  estimatedItemSize?: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  contentContainerStyle?: any;
}

export default function FeedList({
  feeds,
  onLoadMore,
  onRefresh,
  onFeedPress,
  onLike,
  onShare,
  onDownload,
  hasMore,
  isLoading,
  isLoadingMore,
  isRefreshing,
  error,
  emptyTitle = "No posts yet",
  emptySubtitle = "Be the first to share something amazing!",
  showRetry = true,
  onRetry,
  autoPlayVideo = false,
  estimatedItemSize = 600,
  ListHeaderComponent,
  contentContainerStyle,
}: FeedListProps) {

  const renderFeedItem = useCallback(({ item: feed, index }: ListRenderItemInfo<Feed>) => {
    // Use RingtoneFeedCard for ringtone feeds, regular FeedCard for others
    if (feed.type === 'ringtone') {
      return (
        <RingtoneFeedCard
          key={feed.id}
          feed={feed}
          onLike={onLike}
          onShare={onShare}
          onDownload={onDownload}
        />
      );
    }

    return (
      <FeedCard
        key={feed.id}
        feed={feed}
        onPress={onFeedPress}
        onLike={onLike}
        onShare={onShare}
        onDownload={onDownload}
        autoPlayVideo={autoPlayVideo && index === 0} // Auto-play only first video
      />
    );
  }, [onFeedPress, onLike, onShare, onDownload, autoPlayVideo]);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      return (
        <View style={styles.endMessage}>
          <Text variant="caption" color="secondary" style={styles.endText}>
            🎉 You've reached the end! 🎉
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="caption" color="secondary" style={styles.loadingText}>
            Loading more posts...
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
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading amazing posts...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorEmoji}>😕</Text>
          </View>
          <Text variant="h5" weight="semibold" style={styles.errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text variant="body" color="secondary" style={styles.errorMessage}>
            {error}
          </Text>
          {showRetry && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text variant="body" weight="semibold" style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>📱</Text>
        </View>
        <Text variant="h5" weight="semibold" style={styles.emptyTitle}>
          {emptyTitle}
        </Text>
        <Text variant="body" color="secondary" style={styles.emptySubtitle}>
          {emptySubtitle}
        </Text>
      </View>
    );
  }, [isLoading, error, emptyTitle, emptySubtitle, showRetry, onRetry]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading && feeds.length > 0) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, isLoading, feeds.length, onLoadMore]);

  const keyExtractor = useCallback((item: Feed) => item.id.toString(), []);

  const getItemLayout = useCallback(
    (data: ArrayLike<Feed> | null | undefined, index: number) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    }),
    [estimatedItemSize]
  );

  return (
    <FlatList
      data={feeds}
      renderItem={renderFeedItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmptyComponent}
      ListFooterComponent={renderFooter}
      style={styles.flatListStyle}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[goldenTempleTheme.colors.primary.DEFAULT]}
          tintColor={goldenTempleTheme.colors.primary.DEFAULT}
        />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        !ListHeaderComponent && styles.container,
        feeds.length === 0 && styles.emptyContainer,
        contentContainerStyle,
      ]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      updateCellsBatchingPeriod={16}
      getItemLayout={getItemLayout}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
}

const styles = StyleSheet.create({
  flatListStyle: {
    backgroundColor: 'transparent', // Make FlatList transparent
  },
  container: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing['3xl'],
    paddingHorizontal: goldenTempleTheme.spacing.xl,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.lg,
    gap: goldenTempleTheme.spacing.sm,
  },
  footerSpacing: {
    height: goldenTempleTheme.spacing.xl,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: goldenTempleTheme.spacing.sm,
  },
  endMessage: {
    paddingVertical: goldenTempleTheme.spacing.lg,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Empty State
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  // Error State
  errorIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.text.primary,
  },
  errorMessage: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  retryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    borderRadius: goldenTempleTheme.borderRadius.md,
  },
  retryText: {
    color: '#fff',
  },
});