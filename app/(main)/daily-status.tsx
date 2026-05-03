import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import FeedCard from '@/components/molecules/FeedCard';
import { DeityCard } from '@/components/molecules/DeityCard';
import { useFeed } from '@/features/feed/hooks';
import { useDeities } from '@/features/feed/hooks/useDeities';
import { useTranslation } from '@/hooks/useTranslation';
import { Feed } from '@/types/feed';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import type { Deity } from '@/features/feed/hooks/useDeities';

// Isolated Search Component to prevent keyboard disappearing
const IsolatedSearchBar = ({ onSearchSubmit, currentLanguage }: {
  onSearchSubmit: (query: string) => void;
  currentLanguage: string;
}) => {
  const [localSearchText, setLocalSearchText] = React.useState('');

  const handleSubmit = () => {
    onSearchSubmit(localSearchText.trim());
  };

  return (
    <View style={styles.searchContainer}>
      <Ionicons
        name="search-outline"
        size={20}
        color="#333333"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={currentLanguage === 'hi' ? 'वॉलपेपर खोजें...' : 'Search wallpapers...'}
        placeholderTextColor="#8B7355"
        value={localSearchText}
        onChangeText={setLocalSearchText}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor="#D4824A"
      />
    </View>
  );
};

export default function DailyStatusScreen() {
  const { language: currentLanguage } = useTranslation();
  const { contentPadding } = useTabBarHeight();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeity, setSelectedDeity] = useState<Deity | null>(null);

  // Stop all audio when this screen becomes focused or unfocused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🖼️ Daily Status screen focused - stopping all audio');

      // Stop all audio when entering wallpapers screen
      if (global.globalAudioSessionManager) {
        global.globalAudioSessionManager.stopCurrentAudio('wallpapers');
        global.globalAudioSessionManager.stopAllRingtones();
      }

      return () => {
        console.log('🖼️ Daily Status screen unfocused');
      };
    }, [])
  );

  // Fetch deities for filter
  const {
    data: deities = [],
    isLoading: deitiesLoading,
    error: deitiesError,
  } = useDeities({ type: 'wallpaper' });

  // Build filters for wallpaper feeds
  const feedFilters: any = { type: 'wallpaper' as const };
  if (selectedDeity) {
    feedFilters.deityId = selectedDeity.id;
  }
  if (searchQuery && searchQuery.trim()) {
    feedFilters.search = searchQuery.trim();
  }

  // Initialize feed data with wallpaper type filter and deity filter
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
  } = useFeed({
    limit: 10,
    filters: feedFilters,
  });

  const handleSearchSubmit = (query: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(query);
  };

  const handleDeityPress = useCallback((deity: Deity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDeity(selectedDeity?.id === deity.id ? null : deity);
  }, [selectedDeity]);

  const handleFeedPress = (feed: Feed) => {
    // Add haptic feedback for feed press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('🖼️ Daily Status: Feed pressed:', {
      id: feed.id,
      type: feed.type,
      caption: feed.caption,
      mediaCount: feed.media?.length || 0
    });

    // Track view
    viewFeed(feed.id.toString());

    // For wallpaper feeds, you can add specific navigation logic
    // For now, just log the action
    console.log('ℹ️ Daily Status: Wallpaper feed pressed');
  };

  const renderDeityCard = ({ item }: { item: Deity }) => (
    <DeityCard
      deity={item}
      isSelected={selectedDeity?.id === item.id}
      onPress={handleDeityPress}
      language={currentLanguage}
    />
  );

  const renderFeed = useCallback(({ item: feed }: ListRenderItemInfo<Feed>) => (
    <View style={styles.feedWrapper}>
      <FeedCard
        feed={feed}
        onPress={handleFeedPress}
        onLike={likeFeed}
        onShare={shareFeed}
        onDownload={downloadFeed}
        autoPlayVideo={false}
      />
    </View>
  ), [handleFeedPress, likeFeed, shareFeed, downloadFeed]);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      return (
        <View style={styles.endMessage}>
          <Text variant="caption" style={styles.endText}>
            🖼️ You've seen all the wallpapers! 🖼️
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="caption" style={styles.loadingText}>
            Loading more wallpapers...
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
            Loading wallpapers...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="image-outline" size={48} color="#FF6B35" />
          </View>
          <Text variant="h4" style={styles.errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text variant="body" style={styles.errorMessage}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => retry()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="images" size={48} color="#FF8C42" />
        </View>
        <Text variant="h4" style={styles.emptyTitle}>
          {searchQuery ? 'No Wallpapers Found' : 'No Wallpapers Yet'}
        </Text>
        <Text variant="body" style={styles.emptySubtitle}>
          {searchQuery ? 'Try different search terms' : 'Beautiful wallpapers are coming soon!'}
        </Text>
      </View>
    );
  }, [isLoading, error, retry, searchQuery]);

  // Prepare data with header items (same as ringtones page)
  const listData = [
    { type: 'header', key: 'header' },
    { type: 'deities', key: 'deities' },
    ...feeds.map(item => ({ type: 'feed', key: item.id.toString(), data: item }))
  ];

  const renderItem = ({ item, index }: any) => {
    if (item.type === 'header') {
      return (
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <Text style={styles.appTitle}>Daily Status</Text>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/profile');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <IsolatedSearchBar
            onSearchSubmit={handleSearchSubmit}
            currentLanguage={currentLanguage}
          />
        </View>
      );
    }

    if (item.type === 'deities') {
      return (
        <View style={styles.fullWidthSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: goldenTempleTheme.spacing.lg }]}>
            {currentLanguage === 'hi' ? 'अपने भगवान को चुनें' : 'Choose your God'}
          </Text>

          {deitiesLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="secondary">Loading deities...</Text>
            </View>
          ) : deitiesError ? (
            <View style={styles.errorContainer}>
              <Text color="secondary">Failed to load deities</Text>
            </View>
          ) : (
            <View style={styles.fullWidthDeityContainer}>
              <FlatList
                data={deities}
                renderItem={renderDeityCard}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.deitiesList}
                style={styles.deityList}
              />
            </View>
          )}
        </View>
      );
    }

    // Feed item
    return (
      <View style={styles.feedItemContainer}>
        {renderFeed({
          item: item.data,
          index: index - 2,
          separators: {
            highlight: () => {},
            unhighlight: () => {},
            updateProps: () => {}
          }
        } as any)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        stickyHeaderIndices={[1]} // Make the deities section sticky
        style={styles.list}
        contentContainerStyle={{ paddingBottom: contentPadding }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.7}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        updateCellsBatchingPeriod={16}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da', // Same cream background as home screen
  },
  headerSection: {
    backgroundColor: '#fff6da',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingTop: goldenTempleTheme.spacing.lg,
    paddingBottom: 4,
    minHeight: 60,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 28,
    includeFontPadding: false,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4824A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: goldenTempleTheme.spacing.lg,
    marginVertical: goldenTempleTheme.spacing.sm,
    borderWidth: 1,
    borderColor: '#D4C4A8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
    padding: 0,
    margin: 0,
    height: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  fullWidthSection: {
    backgroundColor: '#fff6da',
    width: '100%',
    alignSelf: 'stretch',
    paddingTop: goldenTempleTheme.spacing.xs,
    paddingBottom: goldenTempleTheme.spacing.md,
  },
  fullWidthDeityContainer: {
    width: '100%',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CA3500',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  deitiesList: {
    paddingLeft: 0,
    paddingRight: goldenTempleTheme.spacing.lg,
    paddingVertical: 0,
    gap: 8,
  },
  deityList: {
    marginTop: 0,
    marginLeft: 0,
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B7355',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  feedWrapper: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  feedItemContainer: {
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  // Footer styles
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
  // Empty State
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
  // Error State
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