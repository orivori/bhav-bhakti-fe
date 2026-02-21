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
import { spiritualTheme } from '@/styles/spiritualTheme';

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
          gradient: spiritualTheme.gradients.sunrise,
        };
      case 'Ringtones':
        return {
          name: 'Ringtones',
          icon: 'notifications',
          gradient: spiritualTheme.gradients.meditation,
        };
      case 'Daily Status':
        return {
          name: 'Daily Status',
          icon: 'image',
          gradient: spiritualTheme.gradients.lotus,
        };
      default:
        return {
          name: category,
          icon: 'help-circle',
          gradient: spiritualTheme.gradients.divine,
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
    // Track view
    viewFeed(feed.id);

    // Navigate to feed detail (you can implement this later)
    console.log('Feed pressed:', feed.id);
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={spiritualTheme.colors.text.muted}
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>
            Search for spiritual content...
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons
            name="person-circle-outline"
            size={32}
            color={spiritualTheme.colors.primary.DEFAULT}
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
    <SafeAreaView style={styles.container}>
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
    backgroundColor: spiritualTheme.colors.backgrounds.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spiritualTheme.spacing.md,
    paddingVertical: spiritualTheme.spacing.md,
    backgroundColor: spiritualTheme.colors.backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: spiritualTheme.colors.border,
    ...spiritualTheme.shadows.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: spiritualTheme.colors.backgrounds.muted,
    paddingHorizontal: spiritualTheme.spacing.md,
    paddingVertical: spiritualTheme.spacing.sm,
    borderRadius: spiritualTheme.borderRadius.xl,
    marginRight: spiritualTheme.spacing.md,
    borderWidth: 1,
    borderColor: spiritualTheme.colors.border,
  },
  searchIcon: {
    marginRight: spiritualTheme.spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: spiritualTheme.colors.text.muted,
  },
  profileButton: {
    padding: 4,
  },
  categoriesContainer: {
    marginTop: spiritualTheme.spacing.md,
    backgroundColor: spiritualTheme.colors.backgrounds.card,
    paddingBottom: spiritualTheme.spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spiritualTheme.spacing.lg,
    gap: spiritualTheme.spacing.sm,
  },
  categoryCard: {
    width: 120,
    height: 80,
    borderRadius: spiritualTheme.borderRadius.xl,
    padding: spiritualTheme.spacing.md,
    marginRight: spiritualTheme.spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...spiritualTheme.shadows.lg,
  },
  categoryCardText: {
    color: spiritualTheme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  horoscopeCard: {
    marginHorizontal: spiritualTheme.spacing.md,
    marginTop: spiritualTheme.spacing.md,
    marginBottom: spiritualTheme.spacing.sm,
    backgroundColor: spiritualTheme.colors.backgrounds.card,
    borderRadius: spiritualTheme.borderRadius.xl,
    padding: spiritualTheme.spacing.md,
    borderWidth: 2,
    borderColor: spiritualTheme.colors.primary[200],
    shadowColor: spiritualTheme.colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  horoscopeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spiritualTheme.spacing.sm,
  },
  horoscopeIcon: {
    width: 48,
    height: 48,
    backgroundColor: spiritualTheme.colors.primary[100],
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
    color: spiritualTheme.colors.text.primary,
  },
  horoscopeSubtitle: {
    fontSize: 12,
    color: spiritualTheme.colors.text.secondary,
  },
  feedContainer: {
    flex: 1,
    marginTop: spiritualTheme.spacing.sm,
    backgroundColor: spiritualTheme.colors.backgrounds.primary,
  },
});
