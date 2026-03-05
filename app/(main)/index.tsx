import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  TextInput,
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
import { OmIcon, BellIcon, DiyaIcon } from '@/components/atoms/MenuIcons';
import { useTranslation as useI18n } from '@/shared/i18n/useTranslation';

type ContentCategory = 'Mantras' | 'Ringtones' | 'Daily Status';

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
        color="#8B5A2B"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={currentLanguage === 'hi' ? 'मंत्र, रिंगटोन खोजें...' : 'Search mantras, ringtones...'}
        placeholderTextColor="#8B5A2B"
        value={localSearchText}
        onChangeText={setLocalSearchText}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor="#FF6B00"
      />
    </View>
  );
};


export default function HomeScreen() {
  const { isPremium, setShowPaywall } = usePremiumStore();
  const { t, language } = useTranslation();
  const { t: ti, currentLanguage } = useI18n();
  const { selectedZodiac, initializeZodiac } = useZodiacStore();
  const [activeSearchQuery, setActiveSearchQuery] = React.useState('');

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
    likeFeed,
    shareFeed,
    downloadFeed,
  } = useFeed({
    filters: {
      search: activeSearchQuery.trim() || undefined,
    },
    limit: 10,
  });

  React.useEffect(() => {
    initializeZodiac();
  }, []);

  const handleSearchSubmit = (query: string) => {
    setActiveSearchQuery(query);
  };

  const categories: ContentCategory[] = ['Mantras', 'Ringtones', 'Daily Status'];

  const getCategoryInfo = (category: ContentCategory) => {
    switch (category) {
      case 'Mantras':
        return {
          name: ti('mantras'),
          icon: <OmIcon size={48} color="#ffffff" />,
          gradient: ['#FF6B00', '#FF8533', '#FFA500'] as const, // Saffron/Orange gradient
          imageUrl: 'https://images.unsplash.com/photo-1625670413987-0ae649494c61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        };
      case 'Ringtones':
        return {
          name: ti('ringtones'),
          icon: <BellIcon size={48} color="#ffffff" />,
          gradient: ['#C41E3A', '#D4526E', '#E08699'] as const, // Temple red gradient
          imageUrl: 'https://images.unsplash.com/photo-1763809677179-f26bc3210791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        };
      case 'Daily Status':
        return {
          name: ti('dailyStatus'),
          icon: <DiyaIcon size={48} color="#ffffff" />,
          gradient: ['#D4AF37', '#E0C55B', '#ECDB80'] as const, // Gold gradient
          imageUrl: 'https://images.unsplash.com/photo-1764775086606-9b23aa61352a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
        };
      default:
        return {
          name: category,
          icon: <OmIcon size={48} color="#ffffff" />,
          gradient: goldenTempleTheme.gradients.divine,
          imageUrl: '',
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
        <IsolatedSearchBar
          onSearchSubmit={handleSearchSubmit}
          currentLanguage={currentLanguage}
        />
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
              activeOpacity={0.9}
              style={styles.categoryTouchable}
            >
              <LinearGradient
                colors={categoryInfo.gradient}
                style={styles.categoryCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Background image overlay */}
                {categoryInfo.imageUrl && (
                  <ImageBackground
                    source={{ uri: categoryInfo.imageUrl }}
                    style={styles.categoryBackground}
                    imageStyle={styles.categoryBackgroundImage}
                  />
                )}

                {/* Decorative border */}
                <View style={styles.decorativeBorder} />

                {/* Icon */}
                <View style={styles.iconContainer}>
                  {categoryInfo.icon}
                </View>

                {/* Label */}
                <Text
                  variant="body"
                  weight="semibold"
                  style={styles.categoryCardText}
                >
                  {categoryInfo.name}
                </Text>

                {/* Decorative corner elements */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search Results Header */}
      {activeSearchQuery.trim() && (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsText}>
            {currentLanguage === 'hi'
              ? `"${activeSearchQuery}" के लिए परिणाम`
              : `Results for "${activeSearchQuery}"`}
          </Text>
          {feeds.length > 0 && (
            <Text style={styles.searchResultsCount}>
              {feeds.length} {feeds.length === 1 ? 'result' : 'results'}
            </Text>
          )}
        </View>
      )}

      {/* Horoscope Card - hidden when searching */}
      {!activeSearchQuery.trim() && (
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
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
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
    backgroundColor: '#F5E6D3',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#4A2C2A',
    fontWeight: '400',
    padding: 0, // Remove all padding
    margin: 0, // Remove all margin
    height: 20,
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
    height: 140,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: goldenTempleTheme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...goldenTempleTheme.shadows.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  categoryCardText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26, // Increased from 18 to 26 for Hindi matra support
    letterSpacing: 0.5,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2,
    elevation: 3,
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

  // Enhanced menu card styles
  categoryTouchable: {
    marginRight: goldenTempleTheme.spacing.sm,
  },

  categoryBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },

  categoryBackgroundImage: {
    borderRadius: goldenTempleTheme.borderRadius.xl,
  },

  decorativeBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: goldenTempleTheme.borderRadius.xl,
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
  },

  topLeft: {
    top: 8,
    left: 8,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
  },

  topRight: {
    top: 8,
    right: 8,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
  },

  bottomLeft: {
    bottom: 8,
    left: 8,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 8,
  },

  bottomRight: {
    bottom: 8,
    right: 8,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 8,
  },

  // Search results styles
  searchResultsHeader: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 240, 0.8)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: goldenTempleTheme.colors.border,
  },

  searchResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: goldenTempleTheme.colors.text.primary,
    flex: 1,
    lineHeight: 24, // Added line height for better Hindi text rendering
  },

  searchResultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: goldenTempleTheme.colors.text.secondary,
  },
});
