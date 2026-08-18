import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  TextInput,
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Text } from '@/components/atoms';
import FeedList from '@/components/molecules/FeedList';
import BirthdateModal from '@/components/molecules/BirthdateModal/BirthdateModal';
import QuickLinkCard, { QUICK_LINK_CATEGORIES, QuickLinkCategory } from '@/components/molecules/QuickLinkCard';
import { LanguageToggle } from '@/components/molecules/LanguageToggle';
import { useFeed } from '@/features/feed/hooks';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import * as Haptics from 'expo-haptics';
import { profileService } from '@/features/profile/services/profileService';
import type { ZodiacSign } from '@/types/horoscope';


// Isolated Search Component to prevent keyboard disappearing
const IsolatedSearchBar = ({ onSearchSubmit }: {
  onSearchSubmit: (query: string) => void;
}) => {
  const { t } = useTranslation();
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
        placeholder={t('home.searchPlaceholder')}
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


export default function HomeScreen() {
  const { contentPadding } = useTabBarHeight();
  const { t } = useTranslation();
  const { language: currentLanguage } = useI18nStore();

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


  const [showBirthdateModal, setShowBirthdateModal] = React.useState(false);
  const [isCheckingHoroscopeProfile, setIsCheckingHoroscopeProfile] = React.useState(false);
  const feedListRef = React.useRef<FlatList>(null);

  useScrollToTopOnTabPress(React.useCallback(() => {
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []));

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(main)/search-results',
        params: { query: query.trim() }
      });
    }
  };

  const handleCategoryPress = (categoryId: QuickLinkCategory['id']) => {
    // Add haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate to category screen
    switch (categoryId) {
      case 'mantras':
        router.push('/(main)/mantras');
        break;
      case 'rashifal':
        router.push('/(main)/horoscope');
        break;
      case 'status':
        router.push({ pathname: '/(main)/daily-status', params: { subTab: 'status' } });
        break;
      case 'ringtones':
        router.push({ pathname: '/(main)/ringtones', params: { subTab: 'ringtones' } });
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

    // Navigate to the shared audio player for ANY feed that has audio
    // media - matches Mantra Explorer's handleMantraPress, which never
    // gated navigation on isRepeatable either. isRepeatable only controls
    // whether the chant-counter UI shows once inside the player
    // (audio-player.tsx reads it off the fetched Feed for that, separately)
    // - it's not a signal for whether this content is playable at all. This
    // also correctly covers Aarti/Bhajan content, which is isRepeatable:
    // false by design (sung-through, not chant-repeated) but still needs to
    // open in this same shared player. Ringtone-type feeds never reach this
    // handler in the first place - FeedList routes those to
    // RingtoneFeedCard directly, before onFeedPress is ever involved.
    const audioMedia = feed.media?.find(media => media.type === 'audio');

    if (audioMedia) {
      console.log('✅ Home: Found audio media, navigating to audio player:', {
        feedId: feed.id.toString(),
        audioUrl: audioMedia.mediaUrl,
        thumbnailUrl: audioMedia.thumbnailUrl
      });

      router.push({
        pathname: '/(main)/audio-player',
        params: {
          feedId: feed.id.toString(),
          title: feed.caption || 'Sacred Mantra',
          audioUrl: audioMedia.mediaUrl,
          thumbnailUrl: audioMedia.thumbnailUrl,
          tags: feed.tags?.join(',') || '',
          autoPlay: 'true',
          // See audio-player.tsx's back-button handling - Home is where
          // router.back()'s old always-lands-on-Home behavior happened to
          // already be correct, but this keeps it explicit/consistent with
          // every other entry point rather than relying on that coincidence.
          returnTo: '/(main)/',
        }
      });
      return;
    }

    console.log('ℹ️ Home: No audio media found on this feed');
  };

  // "Today's Horoscope" card only (see handleCategoryPress's separate
  // 'Rashifal' case, above - that quick-link pill is untouched and always
  // goes straight to the 12-sign grid). First-ever tap collects a real
  // birthdate via BirthdateModal; once dateOfBirth/zodiacSign already exist
  // on the profile, subsequent taps skip the modal and go straight to the
  // user's own sign. skipPaywall is forwarded to horoscope-detail.tsx as a
  // marker for whichever paywall gate Phase 4 eventually adds to the grid
  // path - this Home path must never be caught by it.
  const handleHoroscopeCardPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isCheckingHoroscopeProfile) return;
    setIsCheckingHoroscopeProfile(true);

    try {
      const profile = await profileService.getProfile();
      if (profile.profile?.dateOfBirth && profile.profile?.zodiacSign) {
        router.push({
          pathname: '/(main)/horoscope-detail',
          params: { zodiacSign: profile.profile.zodiacSign, skipPaywall: 'true' },
        });
      } else {
        setShowBirthdateModal(true);
      }
    } catch (error) {
      console.error('Failed to check horoscope profile:', error);
      // Network/auth failure on the check - fall back to the modal rather
      // than dead-ending the tap. Worst case for a user who already has a
      // birthdate saved is re-entering it, which is harmless.
      setShowBirthdateModal(true);
    } finally {
      setIsCheckingHoroscopeProfile(false);
    }
  };

  const handleBirthdateSuccess = (zodiacSign: ZodiacSign) => {
    setShowBirthdateModal(false);
    router.push({
      pathname: '/(main)/horoscope-detail',
      params: { zodiacSign, skipPaywall: 'true' },
    });
  };

  const renderHeader = () => (
    <View>
      {/* App Title Header with Profile */}
      <View style={styles.appHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Bhav Bhakti</Text>
        </View>
        <View style={styles.headerRightGroup}>
          <LanguageToggle />
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
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <IsolatedSearchBar
          onSearchSubmit={handleSearchSubmit}
        />
      </View>

      {/* Choose where to start Header */}
      <View style={styles.chooseStartHeader}>
        <Text style={styles.chooseStartTitle}>
          {t('chooseStart.headerTitle')}
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
            {t('chooseStart.seeAll')}
          </Text>
        </Pressable>
      </View>

      {/* Category Cards Grid */}
      <View style={styles.categoriesGrid}>
        {QUICK_LINK_CATEGORIES.map((category) => (
          <QuickLinkCard
            key={category.id}
            category={category}
            onPress={() => handleCategoryPress(category.id)}
          />
        ))}
      </View>

      {/* Today's Horoscope Section */}
      <View style={styles.horoscopeSectionContainer}>
        <TouchableOpacity
          style={styles.todayHoroscopeCard}
          onPress={handleHoroscopeCardPress}
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

                  const localeCode = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
                  return `${t('home.today')}, ${today.toLocaleDateString(localeCode, options)}`;
                })()}
              </Text>
              <Text style={styles.horoscopeSubText} numberOfLines={1}>
                {t('home.knowRashifalToday')}
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
            {t('home.recommendedForYou')}
          </Text>
        </View>
      )}

    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedList
        ref={feedListRef}
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
        enableViewportAutoplay={true}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingBottom: contentPadding
        }}
      />
      <BirthdateModal
        visible={showBirthdateModal}
        onDismiss={() => setShowBirthdateModal(false)}
        onSuccess={handleBirthdateSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background, // Cream background like the design
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
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    // Bumped from spacing.sm (8px) to spacing.md (16px) - the gap to the
    // horoscope card below, now that its header title is gone (RN doesn't
    // collapse adjacent margins, so this value is the full visible gap).
    marginBottom: goldenTempleTheme.spacing.md,
    gap: 10,
  },
  // Today's Horoscope Section Styles
  horoscopeSectionContainer: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginTop: 0,
    marginBottom: goldenTempleTheme.spacing.lg,
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
