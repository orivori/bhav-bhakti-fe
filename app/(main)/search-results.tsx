import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import FeedList from '@/components/molecules/FeedList';
import { useFeed } from '@/features/feed/hooks';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation as useI18n } from '@/shared/i18n/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function SearchResultsScreen() {
  const { contentPadding } = useTabBarHeight();
  const { t: ti, currentLanguage } = useI18n();
  const { query } = useLocalSearchParams<{ query: string }>();

  // Initialize feed data with search query
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
    filters: {
      search: query?.trim() || undefined,
    },
    limit: 10,
  });

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleFeedPress = (feed: Feed) => {
    // Add haptic feedback for feed press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('🎵 SearchResults: Feed pressed:', {
      id: feed.id,
      type: feed.type,
      caption: feed.caption,
      mediaCount: feed.media?.length || 0
    });

    // Track view
    viewFeed(feed.id.toString());

    // Check if feed is a mantra with audio media
    if (feed.type === 'mantra') {
      console.log('🔍 SearchResults: This is a mantra feed, checking for audio media');
      const audioMedia = feed.media.find(media => media.type === 'audio');

      if (audioMedia) {
        console.log('✅ SearchResults: Found audio media, navigating to audio player:', {
          feedId: feed.id.toString(),
          audioUrl: audioMedia.mediaUrl,
          thumbnailUrl: audioMedia.thumbnailUrl
        });

        // Navigate to audio player with feed data
        router.push({
          pathname: '/(main)/audio-player',
          params: {
            feedId: feed.id.toString(),
            title: feed.caption || 'Sacred Mantra',
            audioUrl: audioMedia.mediaUrl,
            thumbnailUrl: audioMedia.thumbnailUrl,
            tags: feed.tags?.join(',') || '',
          }
        });
        return;
      } else {
        console.log('❌ SearchResults: No audio media found in mantra feed');
      }
    }

    // For other feed types, you can add different navigation logic
    console.log('ℹ️ SearchResults: Non-mantra feed or no audio media found');
  };

  const renderHeader = () => (
    <View>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="#5D4E37" />
          <Text style={styles.backButtonText}>
            {currentLanguage === 'hi' ? 'वापस' : 'Back'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Results Header */}
      <View style={styles.searchResultsHeader}>
        <Text style={styles.searchResultsText}>
          {currentLanguage === 'hi'
            ? `"${query}" के लिए परिणाम`
            : `Results for "${query}"`}
        </Text>
        {feeds.length > 0 && (
          <Text style={styles.searchResultsCount}>
            {feeds.length} {feeds.length === 1 ? 'result' : 'results'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedList
        feeds={feeds}
        onLoadMore={loadMore}
        onRefresh={refresh}
        onFeedPress={handleFeedPress}
        onLike={likeFeed}
        onShare={shareFeed}
        onDownload={downloadFeed}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isRefreshing={isRefreshing}
        error={error}
        emptyTitle={currentLanguage === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No results found'}
        emptySubtitle={currentLanguage === 'hi' ? 'अपनी खोज बदलने का प्रयास करें' : 'Try adjusting your search terms'}
        onRetry={retry}
        autoPlayVideo={true}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingBottom: contentPadding
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Cream background to match home screen
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: '#F5F1E8',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D4E37', // Warm brown text to match the theme
    marginLeft: 4,
  },
  searchResultsHeader: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 241, 232, 0.8)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: goldenTempleTheme.colors.border,
  },
  searchResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: goldenTempleTheme.colors.text.primary,
    flex: 1,
    lineHeight: 24,
  },
  searchResultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: goldenTempleTheme.colors.text.secondary,
  },
});
