import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import FeedList from '@/components/molecules/FeedList';
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
      <TouchableOpacity style={styles.micButton}>
        <Ionicons
          name="mic"
          size={18}
          color="#D4824A"
        />
      </TouchableOpacity>
    </View>
  );
};

export default function DailyStatusScreen() {
  const { language: currentLanguage } = useTranslation();
  const { contentPadding } = useTabBarHeight();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeity, setSelectedDeity] = useState<Deity | null>(null);

  // Fetch deities for filter
  const {
    data: deities = [],
    isLoading: deitiesLoading,
    error: deitiesError,
  } = useDeities();

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

  const renderHeader = () => (
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

      {/* Choose your God Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
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
          <FlatList
            data={deities}
            renderItem={renderDeityCard}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deitiesList}
            style={styles.deityList}
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
        emptyTitle="No wallpapers found"
        emptySubtitle="Try different filters or search terms"
        onRetry={retry}
        autoPlayVideo={false}
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
  micButton: {
    marginLeft: 8,
    padding: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 12,
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
    paddingLeft: 20,
    marginBottom: 12,
  },
  deityList: {
    marginBottom: 8,
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