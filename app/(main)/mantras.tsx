import { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useMantraFeed } from '@/features/feed/hooks/useMantraFeed';
import { useDeities } from '@/features/feed/hooks/useDeities';
import DeityFilterRow, { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { MOOD_OPTIONS, MoodOption } from '@/data/moodData';
import { feedService } from '@/features/feed/services/feedService';
import { usePlaybackStore } from '@/store/playbackStore';
import type { Feed } from '@/types/feed';

// Mirrors horoscope.tsx's zodiac grid width calculation approach - 2 columns
// with even spacing, computed from screen width. The 64 = section's own
// paddingHorizontal:24 on each side (48 total) + a 16px gap between the two
// cards - this must be recalculated in lockstep with `section`'s
// paddingHorizontal above, or the grid's gap silently collapses (this is the
// exact bug class §49 hit once before with a different card's margin).
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MOOD_ITEM_WIDTH = (SCREEN_WIDTH - 64) / 2;

// Shared by handleMantraPress and handleMoodPress (CLAUDE.md §56 Phase 4b) -
// both navigate into the same shared player the same way, just reached via a
// different entry point (a tapped list card vs. a randomly-picked mantra).
function buildAudioPlayerParams(mantra: Feed) {
  return {
    feedId: mantra.id.toString(),
    title: mantra.caption || 'Mantra',
    audioUrl: mantra.media?.[0]?.audioUrl || mantra.media?.[0]?.mediaUrl || '',
    thumbnailUrl: mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || '',
    artist: mantra.user?.name || 'Unknown Artist',
    duration: mantra.media?.[0]?.duration?.toString() || '0',
    isLiked: mantra.isLiked ? 'true' : 'false',
    autoPlay: 'true',
    // See audio-player.tsx's back-button handling - without this, back
    // falls through to router.back(), which is the known bug (always
    // lands on Home instead of back onto Mantra Explorer).
    returnTo: '/(main)/mantras',
  };
}


export default function MantrasScreen() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { contentPadding } = useTabBarHeight();
  const [selectedFilter, setSelectedFilter] = useState<DeityFilterSelection>({ kind: 'trending' });
  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTopOnTabPress(useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []));

  const { data: deities = [] } = useDeities();

  // "Currently playing" card indicator - two narrow, read-only selectors,
  // subscribed once here (not inside renderMantraCard, which would violate
  // the Rules of Hooks since it runs once per row) and passed down as plain
  // data. Deliberately never touches any write/control path on the store -
  // pure display comparison against the persistent slot's already-existing
  // state. Selecting these two primitives individually (not the whole
  // `persistent` object) means this only re-renders when the feedId or
  // playing state actually changes, not on every position/progress tick.
  const nowPlayingFeedId = usePlaybackStore((s) => s.persistent?.nowPlaying.feedId);
  const nowPlayingIsPlaying = usePlaybackStore((s) => s.persistent?.nowPlaying.isPlaying);

  const {
    feeds: mantras,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    likeFeed,
    viewFeed,
    error,
  } = useMantraFeed(selectedFilter);

  // mantras.tsx is a bottom tab, reachable both via tab-bar switch (no
  // back-history) and via router.push from Home/choose-start.tsx/AutoplayFeedCard
  // (real back-history) - same root bug class already diagnosed and fixed for
  // audio-player.tsx (see CLAUDE.md §27/§56). Rather than depend on the Tabs
  // navigator's back-stack, navigate straight to Home explicitly.
  const handleBackToHome = useCallback(() => {
    router.replace('/(main)' as any);
  }, []);

  const handleMantraPress = useCallback((mantra: Feed) => {
    // Track view
    viewFeed(mantra.id.toString());

    // Navigate to audio player with mantra data
    router.push({
      pathname: '/(main)/audio-player',
      params: buildAudioPlayerParams(mantra),
    });
  }, [viewFeed]);

  const handleLikePress = useCallback((mantraId: string, event: any) => {
    event?.stopPropagation();
    likeFeed(mantraId);
  }, [likeFeed]);

  // Tracks which mood pill (by id) currently has a request in flight - used
  // both to guard against double-taps/overlapping requests and to show
  // per-card loading feedback. Deliberately a single value, not per-card
  // booleans: only one random-pick request should ever be in flight at a
  // time (CLAUDE.md §56 Phase 4b).
  const [loadingMoodId, setLoadingMoodId] = useState<string | null>(null);

  const handleMoodPress = useCallback(async (mood: MoodOption) => {
    if (loadingMoodId) return;
    setLoadingMoodId(mood.id);

    try {
      // Standard ORDER BY RAND() LIMIT 1 pattern (feed.service.js's getFeeds,
      // sortBy: 'random') - no existing precedent for DB-level random
      // selection in this codebase before this, confirmed working against
      // real data (both the found and empty-result paths) before this was
      // wired up here.
      const response = await feedService.getFeeds({
        type: 'mantra',
        label: mood.label,
        sortBy: 'random',
        limit: 1,
      });

      const randomMantra = response.feeds[0];

      if (!randomMantra) {
        Alert.alert(
          language === 'hi' ? 'कोई मंत्र नहीं मिला' : 'No Mantras Found',
          language === 'hi'
            ? 'अभी इस भाव के लिए कोई मंत्र टैग नहीं किया गया है।'
            : 'No mantras tagged with this mood yet.'
        );
        return;
      }

      viewFeed(randomMantra.id.toString());

      router.push({
        pathname: '/(main)/audio-player',
        params: buildAudioPlayerParams(randomMantra),
      });
    } catch (err) {
      console.error('❌ Error fetching random mantra for mood:', mood.label, err);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi'
          ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoadingMoodId(null);
    }
  }, [loadingMoodId, language, viewFeed]);

  const renderMantraCard = useCallback(({ item: mantra }: { item: Feed }) => {
    // Currently-playing tap distinction (CLAUDE.md §56 Phase 4c): navigating
    // to an already-loaded feedId is already a safe no-op restart-wise, per
    // audio-player.tsx's own loadedFeedIdRef gate - nothing extra needed
    // here for that, this comparison is purely for the visual indicator.
    const isCurrentlyPlaying = nowPlayingFeedId === mantra.id.toString() && !!nowPlayingIsPlaying;
    const mood = mantra.label ? MOOD_OPTIONS.find((m) => m.label === mantra.label) : undefined;

    return (
      <TouchableOpacity
        style={[styles.mantraCard, isCurrentlyPlaying && styles.mantraCardPlaying]}
        onPress={() => handleMantraPress(mantra)}
        activeOpacity={0.8}
      >
        <Image
          source={{
            uri: mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || 'https://via.placeholder.com/80x80'
          }}
          style={styles.mantraImage}
          resizeMode="cover"
        />

        <View style={styles.mantraContent}>
          <Text variant="body" weight="semibold" style={styles.mantraTitle} numberOfLines={2}>
            {mantra.title ? (mantra.title[language] || mantra.title.en || 'Untitled Mantra') : 'Untitled Mantra'}
          </Text>
          {/* Renders only when the mantra actually has a label - no empty/
              placeholder pill for untagged content (CLAUDE.md §56 Phase 4c
              investigation: most real content will be untagged for a while
              yet, an empty pill on every card would just be noise). */}
          {mood && (
            <View style={[styles.labelPill, { backgroundColor: mood.gradientColors[0] }]}>
              <Text variant="caption" weight="semibold" style={styles.labelPillText}>
                {mood.name[language as 'en' | 'hi'] || mood.name.en}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => handleMantraPress(mantra)}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.likeButton, mantra.isLiked && styles.likeButtonActive]}
          onPress={(e) => handleLikePress(mantra.id.toString(), e)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={mantra.isLiked ? "heart" : "heart-outline"}
            size={18}
            color={mantra.isLiked ? "#e91e63" : goldenTempleTheme.colors.text.secondary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleMantraPress, handleLikePress, language, nowPlayingFeedId, nowPlayingIsPlaying]);

  const renderMoodCard = useCallback(({ item: mood }: { item: MoodOption }) => {
    const isThisMoodLoading = loadingMoodId === mood.id;
    return (
      <TouchableOpacity
        style={styles.moodCard}
        onPress={() => handleMoodPress(mood)}
        disabled={!!loadingMoodId}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={mood.gradientColors}
          style={styles.moodCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isThisMoodLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text variant="h4" weight="bold" style={styles.moodName}>
              {mood.name[language as 'en' | 'hi'] || mood.name.en}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [language, loadingMoodId, handleMoodPress]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonRow}
            onPress={handleBackToHome}
          >
            <Ionicons name="arrow-back" size={20} color={goldenTempleTheme.colors.text.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Mantra Explorer</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={goldenTempleTheme.colors.secondary.DEFAULT} />
          <Text variant="body" style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text variant="body" style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonRow}
          onPress={handleBackToHome}
        >
          <Ionicons name="arrow-back" size={20} color={goldenTempleTheme.colors.text.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Mantra Explorer</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
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
        {/* Find Perfect Mantra Card - hidden pending the mood-pill rework
            (CLAUDE.md §56, Phase 4). This was the quiz's sole navigational
            entry point; route/backend/data are intentionally left untouched. */}
        {/*
        <View style={[styles.section, styles.firstSection]}>
          <TouchableOpacity
            onPress={() => {
              console.log('🎯 Find Your Perfect Mantra clicked');
              router.push('/mantra-quiz' as any);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ff6b35', '#f7931e']}
              style={styles.promoCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.promoIconContainer}>
                <Ionicons name="star-outline" size={32} color="#ffffff" />
              </View>
              <View style={styles.promoContent}>
                <Text variant="h3" weight="bold" style={styles.promoTitle}>
                  Find Your Perfect Mantra
                </Text>
                <Text variant="body" style={styles.promoDescription}>
                  Based on your birth date, name and spiritual goals
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        */}

        {/* Mood pills (CLAUDE.md §56 Phase 4). Tapping fetches one random
            mantra tagged with that mood and opens it directly in the shared
            player - see handleMoodPress. Styling mirrors horoscope.tsx's
            zodiac grid exactly (same card sizing/spacing/radius/shadow/
            gradient-angle), minus the icon and arrow per a deliberate scope
            correction for this text-only treatment. */}
        <View style={[styles.section, styles.firstSection]}>
          <Text variant="h4" weight="bold" style={styles.sectionTitle}>
            {language === 'hi' ? 'मुझे चाहिए' : 'I am looking for'}
          </Text>
          <FlatList
            data={MOOD_OPTIONS}
            renderItem={renderMoodCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.moodRow}
          />
        </View>

        {/* Deity filter - replaces the old categoryId-based grid, which was
            filtering on a column the CSV import pipeline never populates
            (CLAUDE.md §56, Round 2). Mirrors the exact pattern already
            proven in the Audio and Wallpaper hubs. */}
        <View>
          <DeityFilterRow
            deities={deities}
            selected={selectedFilter}
            onSelect={setSelectedFilter}
          />
        </View>

        {/* All Mantras Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="bold" style={styles.sectionTitle}>
            {selectedFilter.kind === 'deity'
              ? t('mantras.selectedMantras')
              : t('mantras.allMantras')
            }
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text variant="body" color="secondary">
                {t('common.loading')}
              </Text>
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
                    <Text variant="caption" color="secondary">
                      {t('common.loading')}
                    </Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={goldenTempleTheme.colors.text.secondary} />
              <Text variant="body" style={styles.emptyText}>
                {t('mantras.noMantrasFound')}
              </Text>
              <Text variant="caption" color="secondary" style={styles.emptySubtext}>
                {t('mantras.tryDifferentCategory')}
              </Text>
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
    backgroundColor: goldenTempleTheme.colors.background,
  },
  header: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: goldenTempleTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  backText: {
    marginLeft: goldenTempleTheme.spacing.xs,
    color: goldenTempleTheme.colors.text.primary,
    fontSize: 16,
  },
  mainTitle: {
    color: goldenTempleTheme.colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  firstSection: {
    marginTop: goldenTempleTheme.spacing.lg,
  },
  sectionTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.md,
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: goldenTempleTheme.colors.text.secondary,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  // Mood pill grid (CLAUDE.md §56 Phase 4a) - mirrors horoscope.tsx's zodiac
  // grid sizing/spacing/radius/shadow/gradient-angle exactly, text-only
  // (no icon, no arrow) per a deliberate scope correction.
  moodRow: {
    justifyContent: 'space-between',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  moodCard: {
    width: MOOD_ITEM_WIDTH,
    borderRadius: goldenTempleTheme.borderRadius.lg,
    overflow: 'hidden',
    ...goldenTempleTheme.shadows.md,
  },
  moodCardGradient: {
    padding: goldenTempleTheme.spacing.md,
    minHeight: 93,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodName: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
  },
  promoCard: {
    borderRadius: 16,
    padding: goldenTempleTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.md,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: '#ffffff',
    marginBottom: goldenTempleTheme.spacing.xs,
    fontSize: 18,
    fontWeight: '600',
  },
  promoDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  mantrasContainer: {
    gap: goldenTempleTheme.spacing.md,
  },
  mantraCard: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderRadius: 16,
    padding: goldenTempleTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(212, 175, 55, 0.1)',
  },
  // "Currently playing" indicator (CLAUDE.md §56 Phase 4c) - border + tint
  // only, deliberately no glyph/marquee per this project's own animation-
  // performance history in scrolling lists (§26).
  mantraCardPlaying: {
    borderWidth: 1.5,
    borderColor: goldenTempleTheme.colors.primary.DEFAULT,
    backgroundColor: 'rgba(255, 107, 0, 0.06)',
  },
  mantraImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: goldenTempleTheme.colors.muted.DEFAULT,
  },
  mantraContent: {
    flex: 1,
    marginLeft: goldenTempleTheme.spacing.md,
    marginRight: goldenTempleTheme.spacing.sm,
  },
  mantraTitle: {
    color: goldenTempleTheme.colors.text.primary,
    marginBottom: goldenTempleTheme.spacing.xs / 2,
  },
  // Label/mood pill (CLAUDE.md §56 Phase 4c) - reuses moodData.ts's existing
  // per-mood color mapping rather than a separate color scheme, so a
  // mantra's pill visually matches the mood-pill grid above it.
  labelPill: {
    alignSelf: 'flex-start',
    borderRadius: goldenTempleTheme.borderRadius.full,
    paddingHorizontal: goldenTempleTheme.spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  labelPillText: {
    color: '#ffffff',
    fontSize: 11,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: goldenTempleTheme.spacing.md,
    shadowColor: goldenTempleTheme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: goldenTempleTheme.colors.primary[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  likeButtonActive: {
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderColor: '#e91e63',
    shadowColor: '#e91e63',
    shadowOpacity: 0.2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.xl * 2,
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.xl * 2,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
  },
  emptyText: {
    color: goldenTempleTheme.colors.text.primary,
    marginTop: goldenTempleTheme.spacing.sm,
    marginBottom: goldenTempleTheme.spacing.xs,
  },
  emptySubtext: {
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
  },
  errorText: {
    color: goldenTempleTheme.colors.text.primary,
    marginTop: goldenTempleTheme.spacing.md,
    marginBottom: goldenTempleTheme.spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});