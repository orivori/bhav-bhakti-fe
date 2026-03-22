import React from 'react';
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
import { OmIcon, BellIcon, DiyaIcon } from '@/components/atoms/MenuIcons';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import * as Haptics from 'expo-haptics';

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
  const { contentPadding } = useTabBarHeight();
  const { t: ti, currentLanguage } = useI18n();

  // Animated Category Button Component
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
      // Scale down and reduce opacity when pressed
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
      // Scale back up and restore opacity when released
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
        activeOpacity={1} // Disable default opacity change
        style={styles.categoryGridItem}
      >
        <Animated.View
          style={[
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }
          ]}
        >
          <LinearGradient
            colors={categoryInfo.gradient}
            style={styles.categoryGridCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
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
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

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
    // Add haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={24} color="#ffffff" />
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.appTitle}>Bhav Bhakti</Text>
            <Text style={styles.appSubtitle}>Your Spiritual Companion</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <IsolatedSearchBar
          onSearchSubmit={handleSearchSubmit}
          currentLanguage={currentLanguage}
        />
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

      {/* Horoscope Card - commented out as requested */}
      {/*
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
      */}
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
    backgroundColor: '#FFF8F0', // Cream background like the design
  },
  content: {
    flex: 1,
  },

  // App title header styles
  appHeader: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingTop: goldenTempleTheme.spacing.md,
    paddingBottom: goldenTempleTheme.spacing.sm,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.md,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    ...goldenTempleTheme.shadows.md,
  },
  titleSection: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: goldenTempleTheme.colors.text.secondary,
    fontWeight: '400',
  },

  // Search section styles
  searchSection: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5E6D3',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#4A2C2A',
    fontWeight: '400',
    padding: 0, // Remove all padding
    margin: 0, // Remove all margin
    height: 20,
  },
  // Categories grid styles
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.lg,
    gap: goldenTempleTheme.spacing.sm,
  },
  categoryGridItem: {
    flex: 1,
  },
  categoryGridCard: {
    height: 120,
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: goldenTempleTheme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...goldenTempleTheme.shadows.lg,
  },
  categoryCardText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.5,
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

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

});
