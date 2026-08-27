import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms';
import FeedList from '@/components/molecules/FeedList';
import { useFeed } from '@/features/feed/hooks';
import { Feed, FeedFilters } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from 'react-i18next';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function SearchResultsScreen() {
  const { contentPadding } = useTabBarHeight();
  const { t } = useTranslation();
  // `type` is optional - present when a caller (e.g. Mantra Explorer's own
  // search bar) wants results restricted to one content type; absent for
  // Home's unscoped search. feed.service.js already AND-combines `type`
  // with `search` server-side, so no backend change was needed for this.
  //
  // `returnTo`/`returnParams` mirror the exact pattern audio-player.tsx
  // already uses for its own back button: this screen previously called a
  // bare router.back(), which "worked" only by accident from Home (Home is
  // also the Tabs navigator's implicit fallback target when there's no real
  // back-history - e.g. this screen was reached from a tab-bar switch, not
  // a push). That accident broke the moment a second caller (Mantra
  // Explorer) needed a different return target - confirmed via real
  // on-device testing. Every real entry point now explicitly passes where
  // "back" should go, same as audio-player.tsx; router.back() is kept as
  // the fallback for any caller that doesn't pass returnTo, so this is
  // purely additive.
  const { query, type, returnTo, returnParams } = useLocalSearchParams<{
    query: string;
    type?: string;
    returnTo?: string;
    returnParams?: string;
  }>();

  // Initialize feed data with search query
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
      search: query?.trim() || undefined,
      type: (type as FeedFilters['type']) || undefined,
    },
    limit: 10,
  });

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (returnTo) {
      let parsedReturnParams: Record<string, string> | undefined;
      if (returnParams) {
        try {
          parsedReturnParams = JSON.parse(returnParams);
        } catch (error) {
          console.error('Failed to parse returnParams, navigating without them:', error);
        }
      }
      router.replace({ pathname: returnTo as any, params: parsedReturnParams });
      return;
    }

    router.back();
  };

  const handleFeedPress = (feed: Feed) => {
    // Add haptic feedback for feed press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('🎵 SearchResults: Feed pressed:', {
      id: feed.id,
      type: feed.type,
      caption: feed.caption,
      mediaCount: feed.media?.length || 0
    });

    // Track view
    viewFeed(feed.id.toString());

    // Navigate to the shared audio player for ANY feed that has audio media -
    // matches Home's handleFeedPress (see CLAUDE.md §25), which used to gate
    // this on feed.isRepeatable the same way this file still did. isRepeatable
    // only controls whether the chant-counter UI shows once inside the player
    // (audio-player.tsx reads it off the fetched Feed for that, separately) -
    // it's not a signal for whether this content is playable at all. Fixes
    // Aarti/Bhajan search results silently no-opping, since that content is
    // isRepeatable: false by design (sung-through, not chant-repeated) but
    // still needs to open in this same shared player.
    const audioMedia = feed.media?.find(media => media.type === 'audio');

    if (audioMedia) {
      console.log('✅ SearchResults: Found audio media, navigating to audio player:', {
        feedId: feed.id.toString(),
        audioUrl: audioMedia.mediaUrl,
        thumbnailUrl: audioMedia.thumbnailUrl
      });

      // Navigate to audio player with feed data
      router.push({
        pathname: '/(main)/audio-player',
        params: {
          feedId: feed.id.toString(),
          // CLAUDE.md §56 Phase 0: real bilingual title field, not caption -
          // pre-fetch fallback only, matches audio-player.tsx's own
          // English-first resolution once its real fetch takes over.
          title: feed.title?.en || feed.title?.hi || 'Sacred Mantra',
          // caption is the intended "artist" source going forward.
          artist: feed.caption || '',
          // encodeURIComponent: these Firebase Storage URLs already contain
          // their own legitimate %2F/%20 sequences - useLocalSearchParams()
          // unconditionally decodeURIComponent's every string param once on
          // the way out with no matching encode on the way in, which
          // silently corrupts the URL (%2F -> literal /) without this - see
          // CLAUDE.md's route-param URL corruption investigation.
          audioUrl: encodeURIComponent(audioMedia.mediaUrl),
          thumbnailUrl: encodeURIComponent(audioMedia.thumbnailUrl || ''),
          tags: feed.tags?.join(',') || '',
          // Lets audio-player.tsx render the correct control layout from
          // the first frame instead of defaulting to mantra until its own
          // fetch resolves - see CLAUDE.md's playback-switch flash fix.
          type: feed.type,
          isRepeatable: feed.isRepeatable ? 'true' : 'false',
          autoPlay: 'true',
          // See audio-player.tsx's back-button handling - without this,
          // back falls through to router.back(), the known always-lands-
          // on-Home bug, instead of back onto Search Results.
          returnTo: '/(main)/search-results',
          // Without this, handleBack's router.replace(returnTo) carries no
          // params at all, landing on a fresh Search Results with an empty
          // query ("Results for ''") and a completely different feed list
          // instead of the one the user was actually viewing - found via
          // real on-device testing. JSON-stringified to match
          // audio-player.tsx's own JSON.parse(params.returnParams) handling.
          // `type` is included the same way - otherwise backing out of a
          // type-scoped search (e.g. from Mantra Explorer) would drop the
          // restriction and land on an unscoped results list instead.
          returnParams: JSON.stringify({ query: query || '', ...(type ? { type } : {}) }),
        }
      });
      return;
    }

    console.log('ℹ️ SearchResults: No audio media found on this feed');
  };

  const renderHeader = () => (
    <View>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="#5D4E37" />
          <Text style={styles.backButtonText}>
            {t('searchResults.back')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Results Header */}
      <View style={styles.searchResultsHeader}>
        <Text style={styles.searchResultsText}>
          {t('searchResults.resultsFor', { query })}
        </Text>
        {feeds.length > 0 && (
          <Text style={styles.searchResultsCount}>
            {feeds.length} {feeds.length === 1 ? 'result' : 'results'}
          </Text>
        )}
      </View>
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
        emptyTitle={t('searchResults.emptyTitle')}
        emptySubtitle={t('searchResults.emptySubtitle')}
        onRetry={retry}
        autoPlayVideo={true}
        ListHeaderComponent={renderHeader}
        // Renders aarti/bhajan results via the real AudioContentCard,
        // matching the Audio hub's own design, instead of the generic
        // fallback card - queue-seeding is skipped (see AudioContentCard),
        // and its own back-navigation is sent here with the current search
        // query, matching the returnTo/returnParams fix already applied to
        // handleFeedPress above for mantra/general audio taps.
        audioCardReturnTo="/(main)/search-results"
        audioCardReturnParams={{ query: query || '', ...(type ? { type } : {}) }}
        // 24px (spacing.lg) horizontal margin around each result card,
        // matching the header's own paddingHorizontal above; applied only to
        // items (not the header itself, which already has its own matching
        // padding - see FeedList's itemHorizontalPadding prop comment).
        // 16px uniform vertical gap between cards regardless of type - see
        // FeedList's itemSpacing prop comment for how this overrides each
        // card's own differing marginBottom.
        itemHorizontalPadding={goldenTempleTheme.spacing.lg}
        itemSpacing={16}
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
    backgroundColor: goldenTempleTheme.colors.background, // Cream background to match home screen
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D4E37', // Warm brown text to match the theme
    marginLeft: 4,
  },
  searchResultsHeader: {
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 241, 232, 0.8)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: goldenTempleTheme.colors.border,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  searchResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: goldenTempleTheme.colors.text.primary,
    flex: 1,
    lineHeight: 24,
  },
  searchResultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: goldenTempleTheme.colors.text.secondary,
  },
});
