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
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import WallpaperFeedCard from '@/components/molecules/WallpaperFeedCard/WallpaperFeedCard';
import { useWallpaperFeed } from '@/features/feed/hooks/useWallpaperFeed';
import { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useViewingWindow } from '@/hooks/useViewingWindow';

interface WallpapersTabContentProps {
  filter: DeityFilterSelection;
}

// Extracted from the former daily-status.tsx (see CLAUDE.md's Wallpaper Hub
// notes) so it can be rendered as one sub-tab inside the new hub instead of a
// whole screen. Header/back-button intentionally not included here - that's
// the hub's chrome, not this content block's job.
//
// Renders its own 2-column FlatList directly (WallpaperFeedCard in
// 'grid-tile' mode) rather than the shared FeedList/FeedCard used by Home/
// Search Results - FeedList has no grid-layout or variant support, and this
// keeps those two screens' code path completely untouched, mirroring how
// RingtonesTabContent also builds its own dedicated list rather than reusing
// FeedList.
//
// Wallpapers is the general-purpose-only bucket: label: 'none' is a
// sentinel meaning "must have no occasion label" (IS NULL server-side) - this is
// what excludes Good Morning/Evening/Night/Festive content, unlike
// StatusTabContent which applies no label filter at all. `filter` is
// owned and shared by the hub (survives switching sub-tabs) - this component
// just forwards whatever it's given into useWallpaperFeed().
function WallpapersTabContent({ filter }: WallpapersTabContentProps, ref: React.Ref<FlatList>) {
  const { contentPadding } = useTabBarHeight();

  const {
    feeds,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    retry,
    viewFeed,
    likeFeed,
    shareFeed,
    downloadFeed,
  } = useWallpaperFeed(filter, 'none');

  const { open: openViewingWindow, ViewingWindow } = useViewingWindow({
    feeds,
    onLike: likeFeed,
    onShare: shareFeed,
    onDownload: downloadFeed,
  });

  const handleFeedPress = useCallback((feed: Feed) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    viewFeed(feed.id.toString());
    openViewingWindow(feed);
  }, [viewFeed, openViewingWindow]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Feed>) => (
    <WallpaperFeedCard
      feed={item}
      variant="grid-tile"
      onLike={likeFeed}
      onShare={shareFeed}
      onDownload={downloadFeed}
      onPress={handleFeedPress}
    />
  ), [likeFeed, shareFeed, downloadFeed, handleFeedPress]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={goldenTempleTheme.colors.primary.DEFAULT} />
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
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B35" />
          <Text variant="body" style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => retry()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="images-outline" size={48} color="#8E8E93" />
        <Text variant="body" style={styles.emptyText}>No wallpapers yet</Text>
      </View>
    );
  }, [isLoading, error, retry]);

  const keyExtractor = useCallback((item: Feed) => item.id.toString(), []);

  return (
    <>
      <FlatList
        ref={ref}
        data={feeds}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          { paddingBottom: contentPadding },
          styles.listContent,
          feeds.length === 0 && styles.emptyContainer,
        ]}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={['#FF6B35']} tintColor="#FF6B35" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.7}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      />
      {ViewingWindow}
    </>
  );
}

export default React.forwardRef(WallpapersTabContent);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  columnWrapper: {
    gap: 0,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerSpacing: {
    height: 20,
  },
  errorMessage: {
    textAlign: 'center',
    color: '#8E8E93',
  },
  emptyText: {
    color: '#8E8E93',
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
