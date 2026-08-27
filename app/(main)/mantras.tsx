import { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useMantraFeed } from '@/features/feed/hooks/useMantraFeed';
import { useDeities } from '@/features/feed/hooks/useDeities';
import DeityFilterRow, { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';
import MantraFeedCard from '@/components/molecules/MantraFeedCard/MantraFeedCard';
import SearchBar from '@/components/molecules/SearchBar';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { MOOD_OPTIONS, MoodOption } from '@/data/moodData';
import { feedService } from '@/features/feed/services/feedService';
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
    // CLAUDE.md §56 Phase 0: the real bilingual title field, not caption -
    // this is just the pre-fetch fallback value shown before audio-player.tsx's
    // own fetch resolves and takes over via getLocalizedText; matches that
    // screen's own English-first resolution for consistency.
    title: mantra.title?.en || mantra.title?.hi || 'Mantra',
    // encodeURIComponent here, matching every other real entry point into
    // audio-player.tsx: these are Firebase Storage URLs that already contain
    // their own legitimate %2F/%20 sequences (folder-path slashes, filename
    // spaces) - useLocalSearchParams() unconditionally decodeURIComponent's
    // every string param exactly once on the way out, with no corresponding
    // encode ever applied to route params going in. Without this, that one
    // decode strips the URL's own percent-encoding, silently turning %2F
    // back into literal / and corrupting the request - confirmed via a real
    // on-device logcat capture (CLAUDE.md's route-param URL corruption
    // investigation). This encode is what makes that one guaranteed decode
    // correctly restore the original URL instead of corrupting it.
    audioUrl: encodeURIComponent(mantra.media?.[0]?.audioUrl || mantra.media?.[0]?.mediaUrl || ''),
    thumbnailUrl: encodeURIComponent(mantra.media?.[0]?.thumbnailUrl || mantra.media?.[0]?.mediaUrl || ''),
    // caption is the intended "artist" source going forward (§56 Phase 0) -
    // not mantra.user?.name, which was almost always the hardcoded
    // 'Unknown Artist' fallback in practice, never real per-content data.
    artist: mantra.caption || '',
    duration: mantra.media?.[0]?.duration?.toString() || '0',
    isLiked: mantra.isLiked ? 'true' : 'false',
    // Lets audio-player.tsx render the correct control layout from the
    // first frame instead of defaulting to mantra until its own fetch
    // resolves - see CLAUDE.md's playback-switch flash fix. Always 'mantra'
    // in practice on this screen, but sourced from the real field rather
    // than hardcoded, so this stays correct if this screen is ever reused
    // for other content types.
    type: mantra.type,
    isRepeatable: mantra.isRepeatable ? 'true' : 'false',
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

  // Mirrors Home's own handleSearchSubmit exactly, restricted to
  // type=mantra so results only ever contain mantra content - see CLAUDE.md
  // investigation on search reuse. feed.service.js already AND-combines
  // `type` with `search` server-side, so no backend change was needed.
  const handleSearchSubmit = useCallback((query: string) => {
    if (query.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(main)/search-results',
        params: {
          query: query.trim(),
          type: 'mantra',
          // Real bug found via testing: search-results.tsx's own back
          // button previously relied on router.back()'s implicit history,
          // which lands on Home when Mantra Explorer was reached via a
          // tab-bar switch (no real back-history entry). Explicit now,
          // matching the same returnTo pattern already used for
          // audio-player.tsx and mirrored on Home's own search submit.
          returnTo: '/(main)/mantras',
        },
      });
    }
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

  const handleLikePress = useCallback((mantraId: string) => {
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

  // CLAUDE.md §16/§56: this now renders the single, real MantraFeedCard
  // (extracted from this screen's own former inline design) instead of a
  // second, screen-local copy - the exact same component Home/Search Results
  // render for mantra feeds via FeedCard.tsx, closing the long-flagged
  // fragmentation between this screen's card and theirs.
  const renderMantraCard = useCallback(({ item: mantra }: { item: Feed }) => (
    <MantraFeedCard feed={mantra} onPress={handleMantraPress} onLike={handleLikePress} />
  ), [handleMantraPress, handleLikePress]);

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

  // Shared by both the error branch and the main render below, so the two
  // never drift the way this screen's old two-copy header briefly did -
  // replaces the former stacked "back row + title row" with a single row:
  // an icon-only back-chevron (matching audio-player.tsx's icon-only
  // precedent, §57) beside the search bar, since a text label would eat
  // into the search bar's width. Title is intentionally gone entirely -
  // the search bar replaces it, per the redesign.
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackToHome}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={26} color={goldenTempleTheme.colors.text.primary} />
      </TouchableOpacity>
      <SearchBar
        placeholder={t('mantras.searchPlaceholder')}
        onSearchSubmit={handleSearchSubmit}
        containerStyle={styles.headerSearchBar}
      />
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
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
      {renderHeader()}

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
              : selectedFilter.kind === 'liked'
              ? t('mantras.likedMantras')
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
          ) : selectedFilter.kind === 'liked' ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={48} color={goldenTempleTheme.colors.text.secondary} />
              <Text variant="body" style={styles.emptyText}>
                {t('common.noLikedContent')}
              </Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: goldenTempleTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    marginRight: goldenTempleTheme.spacing.sm,
  },
  // Overrides SearchBar's own default marginHorizontal:spacing.lg gutter -
  // this header row already provides that edge spacing via its own
  // paddingHorizontal above, and the bar needs flex:1 to fill the
  // remaining width beside the back button.
  headerSearchBar: {
    flex: 1,
    marginHorizontal: 0,
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