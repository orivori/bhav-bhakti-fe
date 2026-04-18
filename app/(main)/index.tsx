import React, { useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  TextInput,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/atoms';
import FeedList from '@/components/molecules/FeedList';
import { useFeed } from '@/features/feed/hooks';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation as useI18n } from '@/shared/i18n/useTranslation';
import { SvgUri } from 'react-native-svg';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import * as Haptics from 'expo-haptics';

type ContentCategory = 'Mantras' | 'Rashifal' | 'Status' | 'Ringtones';


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
        placeholder={currentLanguage === 'hi' ? 'आरती, भजन या चालीसा खोजें...' : 'Search for Aarti, Bhajan, or Chalisa...'}
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

// Animated Category Button - defined OUTSIDE HomeScreen to prevent recreation on re-renders
const AnimatedCategoryButton = ({
  category,
  categoryInfo,
  onPress
}: {
  category: ContentCategory;
  categoryInfo: any;
  onPress: () => void;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.categoryGridItem}
    >
      <Animated.View
        style={[
          styles.categoryGridCard,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <SvgUri
            uri={categoryInfo.iconUrl}
            width={56}
            height={56}
          />
        </View>

        {/* Label */}
        <Text
          variant="body"
          weight="semibold"
          style={styles.categoryCardText}
        >
          {categoryInfo.name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { contentPadding } = useTabBarHeight();
  const { t: ti, currentLanguage } = useI18n();

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
  });


  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(main)/search-results',
        params: { query: query.trim() }
      });
    }
  };

  const categories: ContentCategory[] = ['Mantras', 'Rashifal', 'Status', 'Ringtones'];

  const getCategoryInfo = (category: ContentCategory) => {
    switch (category) {
      case 'Mantras':
        return {
          name: currentLanguage === 'hi' ? 'मंत्र' : 'Mantra',
          iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/mantras.svg',
          gradient: ['#E8D5C4', '#F5E6D3'] as const, // Light cream gradient
        };
      case 'Rashifal':
        return {
          name: currentLanguage === 'hi' ? 'राशिफल' : 'Rashifal',
          iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/rashifal.svg',
          gradient: ['#E8D5C4', '#F5E6D3'] as const, // Light cream gradient
        };
      case 'Status':
        return {
          name: currentLanguage === 'hi' ? 'स्टेटस' : 'Status',
          iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/status.svg',
          gradient: ['#E8D5C4', '#F5E6D3'] as const, // Light cream gradient
        };
      case 'Ringtones':
        return {
          name: currentLanguage === 'hi' ? 'रिंगटोन' : 'Ringtone',
          iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/ringtones.svg',
          gradient: ['#E8D5C4', '#F5E6D3'] as const, // Light cream gradient
        };
      default:
        return {
          name: category,
          iconUrl: 'https://d12b36sm0rczqk.cloudfront.net/app-assets/mantras.svg',
          gradient: ['#E8D5C4', '#F5E6D3'] as const,
        };
    }
  };

  const handleCategoryPress = (category: ContentCategory) => {
    // Add haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate to category screen
    switch (category) {
      case 'Mantras':
        router.push('/(main)/mantras');
        break;
      case 'Rashifal':
        router.push('/(main)/horoscope');
        break;
      case 'Status':
        router.push('/(main)/daily-status');
        break;
      case 'Ringtones':
        router.push('/(main)/ringtones');
        break;
    }
  };

  const handleFeedPress = (feed: Feed) => {
    // Add haptic feedback for feed press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      {/* App Title Header with Profile */}
      <View style={styles.appHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Bhav Bhakti</Text>
        </View>
        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(main)/profile');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <IsolatedSearchBar
          onSearchSubmit={handleSearchSubmit}
          currentLanguage={currentLanguage}
        />
      </View>

      {/* Choose where to start Header */}
      <View style={styles.chooseStartHeader}>
        <Text style={styles.chooseStartTitle}>
          {currentLanguage === 'hi' ? 'कहां से शुरू करना है चुनें' : 'Choose where to start'}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to choose-start screen or show all categories
            router.push('/(main)/choose-start');
          }}
          style={({ pressed }) => [
            styles.seeAllButton,
            {
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }]
            }
          ]}
        >
          <Text style={styles.seeAllText}>
            {currentLanguage === 'hi' ? 'सभी देखें' : 'See all'}
          </Text>
        </Pressable>
      </View>

      {/* Category Cards Grid */}
      <View style={styles.categoriesGrid}>
        {categories.map((category) => {
          const categoryInfo = getCategoryInfo(category);
          return (
            <AnimatedCategoryButton
              key={category}
              category={category}
              categoryInfo={categoryInfo}
              onPress={() => handleCategoryPress(category)}
            />
          );
        })}
      </View>

      {/* Today's Horoscope Section */}
      <View style={styles.horoscopeSectionContainer}>
        <Text style={styles.horoscopeSectionTitle}>
          {currentLanguage === 'hi' ? 'आज का राशिफल' : "Today's Horoscope"}
        </Text>

        <TouchableOpacity
          style={styles.todayHoroscopeCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(main)/horoscope');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.horoscopeCardContent}>
            <View style={styles.sunIconContainer}>
              <Ionicons name="sunny" size={32} color="#C41E3A" />
            </View>

            <View style={styles.horoscopeTextContainer}>
              <Text style={styles.horoscopeDateText}>
                {(() => {
                  const today = new Date();
                  const options: Intl.DateTimeFormatOptions = {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  };

                  if (currentLanguage === 'hi') {
                    return `आज, ${today.toLocaleDateString('hi-IN', options)}`;
                  } else {
                    return `Today, ${today.toLocaleDateString('en-US', options)}`;
                  }
                })()}
              </Text>
              <Text style={styles.horoscopeSubText} numberOfLines={1}>
                {currentLanguage === 'hi' ? 'आज के लिए अपना राशिफल जानें' : 'Know your rashifal for today'}
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color="#C41E3A" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Recommended Section Header */}
      {feeds.length > 0 && (
        <View style={styles.recommendedHeader}>
          <Text style={styles.recommendedTitle}>
            {currentLanguage === 'hi' ? 'आपके लिए सुझाया गया' : 'Recommended for You'}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Add navigation logic here if needed
            }}
            style={({ pressed }) => [
              styles.seeAllButton,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }]
              }
            ]}
          >
            <Text style={styles.seeAllText}>
              {currentLanguage === 'hi' ? 'सभी देखें' : 'See All'}
            </Text>
          </Pressable>
        </View>
      )}

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
        emptyTitle="No posts yet"
        emptySubtitle="Be the first to share something spiritual!"
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
    backgroundColor: '#fff6da', // Cream background like the design
  },
  content: {
    flex: 1,
  },

  // App title header styles
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingTop: goldenTempleTheme.spacing.lg,
    paddingBottom: 4,
    minHeight: 60,
  },
  titleContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4824A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 28,
    includeFontPadding: false,
  },

  // Search section styles
  searchSection: {
    paddingVertical: goldenTempleTheme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: goldenTempleTheme.spacing.lg,
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

  // Recommended section styles
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: goldenTempleTheme.colors.text.primary,
  },
  seeAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seeAllText: {
    fontSize: 14,
    color: goldenTempleTheme.colors.primary.DEFAULT,
    fontWeight: '500',
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
  // Choose where to start header styles
  chooseStartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  chooseStartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: goldenTempleTheme.colors.text.primary,
  },
  // Categories grid styles
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.sm,
    gap: 0,
  },
  categoryGridItem: {
    flex: 1,
  },
  categoryGridCard: {
    height: 100,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  categoryCardText: {
    color: '#1E1E1E',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    flex: 1,
  },

  // Today's Horoscope Section Styles
  horoscopeSectionContainer: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginTop: 0,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  horoscopeSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#C41E3A',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  todayHoroscopeCard: {
    backgroundColor: '#f7ebc4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4C4A8',
    paddingVertical: goldenTempleTheme.spacing.sm,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  horoscopeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(196, 30, 58, 0.1)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.md,
  },
  horoscopeTextContainer: {
    flex: 1,
  },
  horoscopeDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C41E3A',
    marginBottom: 4,
  },
  horoscopeSubText: {
    fontSize: 12,
    color: '#C41E3A',
    fontWeight: '400',
  },
  arrowContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
