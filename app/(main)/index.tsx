import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/atoms';
import FeedList from '@/components/molecules/FeedList';
import { useFeed } from '@/features/feed/hooks';
import { Feed } from '@/types/feed';
import { usePremiumStore } from '@/store/premiumStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useZodiacStore } from '@/store/zodiacStore';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

type ContentCategory = 'Mantras' | 'Ringtones' | 'Daily Status';

export default function HomeScreen() {
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t, language } = useTranslation();
  const { selectedZodiac, initializeZodiac } = useZodiacStore();

  // Initialize feed data
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
  } = useFeed({
    filters: {},
    limit: 10,
  });

  React.useEffect(() => {
    initializeZodiac();
  }, []);

  const categories: ContentCategory[] = ['Mantras', 'Ringtones', 'Daily Status'];

  const getCategoryInfo = (category: ContentCategory) => {
    switch (category) {
      case 'Mantras':
        return {
          name: 'Mantras',
          icon: 'musical-notes',
          gradient: goldenTempleTheme.gradients.sunrise,
        };
      case 'Ringtones':
        return {
          name: 'Ringtones',
          icon: 'notifications',
          gradient: goldenTempleTheme.gradients.meditation,
        };
      case 'Daily Status':
        return {
          name: 'Daily Status',
          icon: 'image',
          gradient: goldenTempleTheme.gradients.lotus,
        };
      default:
        return {
          name: category,
          icon: 'help-circle',
          gradient: goldenTempleTheme.gradients.divine,
        };
    }
  };

  const handleCategoryPress = (category: ContentCategory) => {
    // Navigate to category screen
    switch (category) {
      case 'Mantras':
        router.push('/(main)/mantras');
        break;
      case 'Ringtones':
        router.push('/(main)/ringtones');
        break;
      case 'Daily Status':
        router.push('/(main)/daily-status');
        break;
    }
  };

  const handleFeedPress = (feed: Feed) => {
    console.log('🎵 Home: Feed pressed:', {
      id: feed.id,
      type: feed.type,
      caption: feed.caption,
      mediaCount: feed.media?.length || 0
    });

    // Track view
    viewFeed(feed.id.toString());

    // Check if feed is a mantra with audio media
    if (feed.type === 'mantra') {
      console.log('🔍 Home: This is a mantra feed, checking for audio media');
      const audioMedia = feed.media.find(media => media.type === 'audio');

      if (audioMedia) {
        console.log('✅ Home: Found audio media, navigating to audio player:', {
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
        console.log('❌ Home: No audio media found in mantra feed');
      }
    }

    // For other feed types, you can add different navigation logic
    console.log('ℹ️ Home: Non-mantra feed or no audio media found');
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={goldenTempleTheme.colors.primary.DEFAULT}
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>
            Search mantras, ringtones...
          </Text>
          <TouchableOpacity style={styles.microphoneButton}>
            <Ionicons
              name="mic-outline"
              size={20}
              color={goldenTempleTheme.colors.primary.DEFAULT}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons
            name="person-circle"
            size={28}
            color={goldenTempleTheme.colors.primary.DEFAULT}
          />
        </TouchableOpacity>
      </View>

      {/* Category Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => {
          const categoryInfo = getCategoryInfo(category);
          return (
            <TouchableOpacity
              key={category}
              onPress={() => handleCategoryPress(category)}
            >
              <LinearGradient
                colors={categoryInfo.gradient}
                style={styles.categoryCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={categoryInfo.icon as any}
                  size={24}
                  color="#fff"
                />
                <Text
                  variant="body"
                  weight="medium"
                  style={styles.categoryCardText}
                >
                  {categoryInfo.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Horoscope Card */}
      <TouchableOpacity
        style={styles.horoscopeCard}
        onPress={() => router.push('/(main)/zodiac-selection')}
      >
        <View style={styles.horoscopeContent}>
          <View style={styles.horoscopeIcon}>
            <Text style={{ fontSize: 32 }}>✨</Text>
          </View>
          <View style={styles.horoscopeText}>
            <Text variant="body" weight="semibold" style={styles.horoscopeTitle}>
              {language === 'hi' ? 'आज का राशिफल' : 'Today\'s Horoscope'}
            </Text>
            <Text variant="caption" color="secondary">
              {selectedZodiac
                ? `${t('home.yourSign')}: ${selectedZodiac}`
                : t('home.checkDailyPrediction')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#6b7280" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <FeedList
        feeds={feeds}
        onLoadMore={loadMore}
        onRefresh={refresh}
        onFeedPress={handleFeedPress}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isRefreshing={isRefreshing}
        error={error}
        emptyTitle="No posts yet"
        emptySubtitle="Be the first to share something spiritual!"
        onRetry={retry}
        autoPlayVideo={true}
        ListHeaderComponent={renderHeader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Remove background to show image
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md + 4,
    backgroundColor: 'transparent',
    marginTop: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(218, 165, 32, 0.15)', // Golden glass effect
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm + 2,
    borderRadius: 25, // More rounded for golden pill shape
    marginRight: goldenTempleTheme.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(218, 165, 32, 0.4)', // Golden border
    shadowColor: goldenTempleTheme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: goldenTempleTheme.spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: goldenTempleTheme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  microphoneButton: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(218, 165, 32, 0.2)',
  },
  profileButton: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: goldenTempleTheme.colors.primary.DEFAULT,
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
  },
  categoriesContainer: {
    marginTop: goldenTempleTheme.spacing.md,
    backgroundColor: 'transparent', // Let background image show through
    paddingBottom: goldenTempleTheme.spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    gap: goldenTempleTheme.spacing.sm,
  },
  categoryCard: {
    width: 120,
    height: 80,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: goldenTempleTheme.spacing.md,
    marginRight: goldenTempleTheme.spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...goldenTempleTheme.shadows.lg,
  },
  categoryCardText: {
    color: goldenTempleTheme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  horoscopeCard: {
    marginHorizontal: goldenTempleTheme.spacing.md,
    marginTop: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: goldenTempleTheme.spacing.md,
  },
  horoscopeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  horoscopeIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horoscopeIconText: {
    fontSize: 24,
  },
  horoscopeText: {
    flex: 1,
  },
  horoscopeTitle: {
    marginBottom: 4,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.primary,
  },
  horoscopeSubtitle: {
    fontSize: 12,
    color: goldenTempleTheme.colors.text.secondary,
  },
});
