import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeed } from '@/features/feed/hooks/useFeed';
import { useTrendingMantras } from '@/features/feed/hooks/useTrendingMantras';
import { useDeities } from '@/features/feed/hooks/useDeities';
import { useMantraCategories } from '@/features/feed/hooks/useCategories';
import { useTranslation } from '@/hooks/useTranslation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { TrendingMantraCard } from '@/components/molecules/TrendingMantraCard';
import { DeityCard } from '@/components/molecules/DeityCard';
import HorizontalMantraCard from '@/components/molecules/HorizontalMantraCard';
import type { Feed, Category } from '@/types/feed';
import type { Deity } from '@/features/feed/hooks/useDeities';


export default function MantrasScreen() {
  const { language: currentLanguage } = useTranslation();
  const { contentPadding } = useTabBarHeight();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeity, setSelectedDeity] = useState<Deity | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentTrendingIndex, setCurrentTrendingIndex] = useState(0);

  // Fetch trending mantras (top 5)
  const {
    data: trendingData,
    isLoading: trendingLoading,
    error: trendingError,
    refetch: refetchTrending,
    isFetching: trendingFetching,
  } = useTrendingMantras({ limit: 5 });

  // Debug trending data
  console.log('🔍 Trending Debug:', {
    loading: trendingLoading,
    fetching: trendingFetching,
    error: trendingError,
    data: trendingData,
    feedsCount: trendingData?.feeds?.length || 0,
    feeds: trendingData?.feeds?.map(feed => ({
      id: feed.id,
      caption: feed.caption,
      mediaUrl: feed.media?.[0]?.mediaUrl
    }))
  });

  // Log when data changes
  React.useEffect(() => {
    if (trendingData?.feeds?.length) {
      console.log('✅ Trending mantras loaded successfully:', trendingData.feeds.length, 'items');
    } else if (trendingError) {
      console.error('❌ Trending mantras error:', trendingError);
    } else if (!trendingLoading && !trendingData?.feeds?.length) {
      console.warn('⚠️ No trending mantras data available');
    }
  }, [trendingData, trendingError, trendingLoading]);
  // Fetch deities
  const {
    data: deities = [],
    isLoading: deitiesLoading,
    error: deitiesError,
  } = useDeities();

  // Fetch mantra categories for filter buttons
  const {
    data: mantraCategories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useMantraCategories();

  // Build filters for all mantras
  const feedFilters: any = { type: 'mantra' as const };
  if (selectedDeity) {
    feedFilters.deityId = selectedDeity.id;
  }
  if (selectedCategory) {
    feedFilters.categoryId = selectedCategory.id;
  }
  if (searchQuery.trim()) {
    feedFilters.search = searchQuery.trim();
  }

  // Fetch all mantras with filters
  const {
    feeds: mantras,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    viewFeed,
  } = useFeed({
    filters: feedFilters,
    limit: 20
  });

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // The search will automatically trigger via the feedFilters effect
    }
  };

  const handleTrendingMantraPress = useCallback((mantra: Feed) => {
    viewFeed(mantra.id.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    router.push({
      pathname: '/(main)/audio-player',
      params: {
        feedId: mantra.id.toString(),
        title: mantra.caption || 'Sacred Mantra',
        audioUrl: mantra.media?.[0]?.audioUrl || mantra.media?.[0]?.mediaUrl || '',
        thumbnailUrl: mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || '',
        artist: mantra.user?.name || 'Unknown Artist',
        duration: mantra.media?.[0]?.duration?.toString() || '0',
        isLiked: mantra.isLiked ? 'true' : 'false',
      },
    });
  }, [viewFeed]);

  const handleMantraPress = useCallback((mantra: Feed) => {
    viewFeed(mantra.id.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    router.push({
      pathname: '/(main)/audio-player',
      params: {
        feedId: mantra.id.toString(),
        title: mantra.caption || 'Sacred Mantra',
        audioUrl: mantra.media?.[0]?.audioUrl || mantra.media?.[0]?.mediaUrl || '',
        thumbnailUrl: mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || '',
        artist: mantra.user?.name || 'Unknown Artist',
        duration: mantra.media?.[0]?.duration?.toString() || '0',
        isLiked: mantra.isLiked ? 'true' : 'false',
      },
    });
  }, [viewFeed]);

  const handleDeityPress = useCallback((deity: Deity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDeity(selectedDeity?.id === deity.id ? null : deity);
  }, [selectedDeity]);

  const handleCategoryFilterPress = useCallback((category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(selectedCategory?.id === category.id ? null : category);
  }, [selectedCategory]);

  const handleFindMantraPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to mantra quiz page
    router.push('/(main)/mantra-quiz');
  };

  // Handle carousel scroll for pagination dots
  const handleTrendingScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const cardWidth = 300; // Approximate card width
    const index = Math.round(contentOffset / cardWidth);
    setCurrentTrendingIndex(index);
  };

  const renderTrendingMantraCard = ({ item }: { item: Feed }) => (
    <TrendingMantraCard
      mantra={item}
      onPress={handleTrendingMantraPress}
    />
  );

  const renderDeityCard = ({ item }: { item: Deity }) => (
    <DeityCard
      deity={item}
      isSelected={selectedDeity?.id === item.id}
      onPress={handleDeityPress}
      language={currentLanguage}
    />
  );

  const renderMantraCard = useCallback(({ item: mantra }: { item: Feed }) => (
    <HorizontalMantraCard
      mantra={mantra}
      onPress={handleMantraPress}
    />
  ), [handleMantraPress]);

  const renderCategoryFilterButton = ({ item: category }: { item: Category }) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.filterButton,
        selectedCategory?.id === category.id && styles.selectedFilterButton
      ]}
      onPress={() => handleCategoryFilterPress(category)}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.filterText,
        selectedCategory?.id === category.id && styles.selectedFilterText
      ]}>
        {category.displayName[currentLanguage as keyof typeof category.displayName] || category.displayName.en || category.categoryName}
      </Text>

      {/* Show cross icon when selected */}
      {selectedCategory?.id === category.id && (
        <View style={styles.crossIcon}>
          <Ionicons name="close" size={14} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Bhav Bhakti</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(main)/profile');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={goldenTempleTheme.colors.primary.DEFAULT}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#333333"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={currentLanguage === 'hi' ? 'आरती, भजन या चालीसा खोजें...' : 'Search for Aarti, Bhajan, or Chalisa...'}
            placeholderTextColor="#8B7355"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#D4824A"
          />
          <TouchableOpacity style={styles.micButton}>
            <Ionicons
              name="mic"
              size={18}
              color="#D4824A"
            />
          </TouchableOpacity>
        </View>

        {/* Right mantra for you - Trending Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentLanguage === 'hi' ? 'आपके लिए सही मंत्र' : 'Right mantra for you'}
          </Text>

          {trendingLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="secondary">Loading trending mantras...</Text>
            </View>
          ) : trendingError ? (
            <View style={styles.errorContainer}>
              <Text color="secondary">Failed to load trending mantras: {trendingError?.message || 'Unknown error'}</Text>
            </View>
          ) : !trendingData?.feeds?.length ? (
            <View style={styles.errorContainer}>
              <Text color="secondary">No trending mantras found (Empty data)</Text>
              <TouchableOpacity
                style={{ marginTop: 8, padding: 8, backgroundColor: '#CA3500', borderRadius: 6 }}
                onPress={() => {
                  console.log('🔄 Manual refresh triggered');
                  // Force refresh trending data specifically
                  refetchTrending();
                }}
              >
                <Text style={{ color: 'white' }}>Debug: Retry API Call</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={trendingData?.feeds || []}
                renderItem={renderTrendingMantraCard}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingList}
                onScroll={handleTrendingScroll}
                scrollEventThrottle={16}
                pagingEnabled={false}
                snapToInterval={300}
                decelerationRate="fast"
              />

              {/* Pagination Dots - Fixed below carousel */}
              {trendingData?.feeds && trendingData.feeds.length > 1 && (
                <View style={styles.paginationContainer}>
                  {trendingData.feeds.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentTrendingIndex && styles.paginationDotActive
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Find your mantra */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.findMantraCard}
            onPress={handleFindMantraPress}
            activeOpacity={0.8}
          >
            {/* Image on the left */}
            <View style={styles.findMantraImageContainer}>
              <Image
                source={{ uri: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/icons/right-mantra.png' }}
                style={styles.findMantraImage}
                resizeMode="contain"
                onError={(error) => {
                  console.log('❌ Image loading error:', error);
                }}
                onLoad={() => {
                  console.log('✅ Find mantra image loaded successfully');
                }}
              />
            </View>

            {/* Text content in the middle */}
            <View style={styles.findMantraContent}>
              <Text style={styles.findMantraTitle}>
                {currentLanguage === 'hi' ? 'अपना मंत्र खोजें' : 'Find your mantra'}
              </Text>
              <Text style={styles.findMantraSubtitle}>
                {currentLanguage === 'hi' ? 'आपके लिए सही मंत्र प्राप्त करें' : 'Get the right mantra for you'}
              </Text>
            </View>

            {/* Arrow on the right */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={28} color="#CA3500" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Choose your God */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {currentLanguage === 'hi' ? 'अपने भगवान को चुनें' : 'Choose your God'}
            </Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Ionicons name="options-outline" size={16} color="#CA3500" />
              <Text style={styles.seeAllText}>
                {currentLanguage === 'hi' ? 'सभी फ़िल्टर देखें' : 'See all filters'}
              </Text>
            </TouchableOpacity>
          </View>

          {deitiesLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="secondary">Loading deities...</Text>
            </View>
          ) : deitiesError ? (
            <View style={styles.errorContainer}>
              <Text color="secondary">Failed to load deities</Text>
            </View>
          ) : (
            <FlatList
              data={deities}
              renderItem={renderDeityCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.deitiesList}
            />
          )}

          {/* Filter Buttons - Dynamic Categories */}
          {categoriesLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="secondary">Loading categories...</Text>
            </View>
          ) : categoriesError ? (
            <View style={styles.errorContainer}>
              <Text color="secondary">Failed to load categories</Text>
            </View>
          ) : (
            <FlatList
              data={mantraCategories.slice(0, 6)} // Show first 6 categories
              renderItem={renderCategoryFilterButton}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            />
          )}
        </View>

        {/* All mantra section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentLanguage === 'hi' ? 'सभी मंत्र' : 'All mantra'}
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text color="secondary">Loading mantras...</Text>
            </View>
          ) : mantras.length > 0 ? (
            <FlatList
              data={mantras}
              renderItem={renderMantraCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.mantrasContainer}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() =>
                isLoadingMore ? (
                  <View style={styles.loadingMore}>
                    <Text color="secondary">Loading more...</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color="#8B7355" />
              <Text style={styles.emptyText}>No mantras found</Text>
              <Text style={styles.emptySubtext}>Try different filters</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6da', // Same as homepage
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
  scrollView: {
    flex: 1,
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
  micButton: {
    marginLeft: 8,
    padding: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CA3500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#CA3500',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  trendingList: {
    paddingLeft: 0, // Align with section content (20 - 8 margin = 12)
    paddingRight: 0,
    paddingTop: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 0,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8DDD1',
  },
  paginationDotActive: {
    backgroundColor: '#CA3500',
  },
  findMantraCard: {
    backgroundColor: '#F7EBC4',
    borderRadius: 24,
    padding: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 2,
    borderColor: '#CA3500',
    height: 75,
    overflow: 'hidden',
  },
  findMantraImageContainer: {
    width: 110,
    height: 75,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  findMantraImage: {
    width: 90,
    height: 75,
  },
  imagePlaceholder: {
    width: 120,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(202, 53, 0, 0.1)',
    borderRadius: 12,
  },
  findMantraContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  findMantraTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#CA3500',
    marginBottom: 4,
    height: 26,
    lineHeight: 26,
  },
  findMantraSubtitle: {
    fontSize: 14,
    color: '#CA3500',
    fontWeight: '500',
    height: 18,
    lineHeight: 18,
  },
  arrowContainer: {
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },
  deitiesList: {
    paddingLeft: 20,
    marginBottom: 12,
  },
  filtersContainer: {
    paddingLeft: 20,
    paddingRight: 12,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CA3500',
    marginHorizontal: 4,
    gap: 6,
  },
  selectedFilterButton: {
    backgroundColor: '#CA3500',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CA3500',
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },
  crossIcon: {
    marginLeft: 4,
  },
  mantrasContainer: {
    gap: 12,
    paddingHorizontal: 0,
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: 20,
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
});