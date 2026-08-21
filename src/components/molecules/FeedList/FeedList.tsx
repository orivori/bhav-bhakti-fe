import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
  ViewToken,
} from 'react-native';
import { Text } from '@/components/atoms';
import FeedCard from '../FeedCard/FeedCard';
import RingtoneFeedCard from '../RingtoneFeedCard/RingtoneFeedCard';
import AudioContentCard from '../AudioContentCard/AudioContentCard';
import AutoplayFeedCard from '../AutoplayFeedCard/AutoplayFeedCard';
import { Feed, FeedFilters } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useFeedStore } from '@/store/feedStore';

interface FeedListProps {
  feeds: Feed[];
  onLoadMore: () => void;
  onRefresh: () => void;
  onFeedPress?: (feed: Feed) => void;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptySubtitle?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  autoPlayVideo?: boolean;
  estimatedItemSize?: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  contentContainerStyle?: any;
  /**
   * Opt-in, Home-scoped viewport autoplay election (Phase 1 infra only).
   * When false (default), no viewability tracking is attached at all —
   * every other FeedList consumer is completely unaffected.
   */
  enableViewportAutoplay?: boolean;
  /**
   * When provided, aarti/bhajan feeds render via the real AudioContentCard
   * (matching the Audio hub's own design) instead of FeedCard's generic
   * fallback card — passed straight through as AudioContentCard's
   * returnTo/returnParams override, with queue-seeding skipped (a single
   * item tapped out of a mixed-type list isn't a meaningful playback queue —
   * matches mantra's existing queue-less pattern). Opt-in and additive: when
   * audioCardReturnTo is omitted, aarti/bhajan feeds render exactly as
   * before via FeedCard's fallback, so every other FeedList consumer stays
   * unaffected. See search-results.tsx, its only consumer today.
   */
  audioCardReturnTo?: string;
  audioCardReturnParams?: Record<string, string>;
  /**
   * Opt-in uniform vertical gap (px) between items, overriding each card
   * type's own differing marginBottom (RingtoneFeedCard/WallpaperFeedCard/
   * AudioContentCard/MantraFeedCard/FeedCard's fallback all currently use
   * different values) purely within this list's rendering - no card's own
   * component/styles are touched, so its normal hub (Ringtones tab, Mantra
   * Explorer, Audio hub, Wallpaper hub - none of which render through
   * FeedList at all) is completely unaffected either way. See
   * search-results.tsx, its only consumer today.
   */
  itemSpacing?: number;
  /**
   * Opt-in horizontal margin (px) applied around each item only - not
   * ListHeaderComponent/ListFooterComponent, so a header with its own
   * matching padding (e.g. search-results.tsx's) doesn't get double-padded.
   */
  itemHorizontalPadding?: number;
}

// Each card type's own self-provided marginBottom today, needed to compute
// the exact cancelling offset for the itemSpacing override above. Coupled by
// hand to each card component's real style value - if any of those change
// their own marginBottom independently, this must be updated too, or the
// override becomes off by the difference (same "must stay in lockstep, no
// compiler check" trade-off already accepted elsewhere in this codebase,
// e.g. mantras.tsx's MOOD_ITEM_WIDTH comment).
function getCardOwnMarginBottom(feedType: Feed['type']): number {
  switch (feedType) {
    case 'ringtone':
      return 16;
    case 'wallpaper':
      return 20;
    case 'aarti':
    case 'bhajan':
      return 10;
    case 'mantra':
      return 16;
    default:
      // FeedCard's generic renderRegularCard fallback (general/thought).
      return 20;
  }
}

function FeedList({
  feeds,
  onLoadMore,
  onRefresh,
  onFeedPress,
  onLike,
  onShare,
  onDownload,
  hasMore,
  isLoading,
  isLoadingMore,
  isRefreshing,
  error,
  emptyTitle = "No posts yet",
  emptySubtitle = "Be the first to share something amazing!",
  showRetry = true,
  onRetry,
  autoPlayVideo = false,
  estimatedItemSize = 600,
  ListHeaderComponent,
  contentContainerStyle,
  enableViewportAutoplay = false,
  audioCardReturnTo,
  audioCardReturnParams,
  itemSpacing,
  itemHorizontalPadding,
}: FeedListProps, ref: React.Ref<FlatList>) {

  // --- Viewport autoplay election (Phase 1 — infra only, no card wiring yet) ---
  // One shared "elected" feedId: the topmost item currently ≥60% visible for ≥400ms.
  const ELECTION_DEBOUNCE_MS = 200; // hold time before committing a visibility change
  const MIN_NEW_PLAYER_INTERVAL_MS = 500; // hard floor: don't start a new player within this window of the last start (connection-pool sensitivity, see §25/§26)

  const enableViewportAutoplayRef = useRef(enableViewportAutoplay);
  useEffect(() => {
    enableViewportAutoplayRef.current = enableViewportAutoplay;
  }, [enableViewportAutoplay]);

  const [electedFeedId, setElectedFeedId] = useState<string | null>(null);
  const electedFeedIdRef = useRef<string | null>(null);
  const pendingCandidateRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNewPlayerStartRef = useRef<number>(0);

  const commitElection = useCallback((candidateId: string | null) => {
    if (candidateId === electedFeedIdRef.current) return;

    const now = Date.now();
    // The floor only guards STARTING a new player — clearing (candidateId === null,
    // e.g. nothing visible) is never delayed.
    if (candidateId !== null) {
      const sinceLastStart = now - lastNewPlayerStartRef.current;
      if (sinceLastStart < MIN_NEW_PLAYER_INTERVAL_MS) {
        const remaining = MIN_NEW_PLAYER_INTERVAL_MS - sinceLastStart;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          // Only proceed if this candidate is still the current pending one —
          // a later scroll may have already superseded it.
          if (pendingCandidateRef.current === candidateId) {
            commitElection(candidateId);
          }
        }, remaining);
        return;
      }
      lastNewPlayerStartRef.current = now;
    }

    electedFeedIdRef.current = candidateId;
    setElectedFeedId(candidateId);

    if (__DEV__) {
      console.log('[FeedList][viewportAutoplay] elected feedId:', candidateId);
    }
  }, []);

  // Stable function identity across renders (required — FlatList throws if
  // viewabilityConfigCallbackPairs changes after the initial render). Reads
  // live state only through refs, so it never needs to be recreated.
  const handleViewableItemsChangedRef = useRef((info: { viewableItems: ViewToken[] }) => {
    if (!enableViewportAutoplayRef.current) return;

    const topVisible = info.viewableItems.find((v) => v.isViewable);
    const candidateId = topVisible?.item ? String((topVisible.item as Feed).id) : null;

    pendingCandidateRef.current = candidateId;
    if (candidateId === electedFeedIdRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (pendingCandidateRef.current === candidateId) {
        commitElection(candidateId);
      }
    }, ELECTION_DEBOUNCE_MS);
  });

  const viewabilityConfigCallbackPairsRef = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: 60,
        minimumViewTime: 400,
      },
      onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) =>
        handleViewableItemsChangedRef.current(info),
    },
  ]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const renderFeedItem = useCallback(({ item: feed, index }: ListRenderItemInfo<Feed>) => {
    const isActive = enableViewportAutoplay && String(feed.id) === electedFeedId;

    if (__DEV__ && isActive) {
      console.log('[FeedList][viewportAutoplay] active item rendered:', feed.id, feed.type);
    }

    // Phase 2: viewport-autoplay routing, gated on the opt-in prop so every other
    // FeedList consumer (Ringtones tab, Mantra Explorer, Wallpaper Hub, Search Results)
    // is completely unchanged — this branch is unreachable there since
    // enableViewportAutoplay is always false for them, leaving the existing
    // RingtoneFeedCard/FeedCard path as the only path, exactly as before Phase 2.
    // Routes on "has any media" rather than an enumerated type/audio check - video
    // isn't its own Feed.type (it's a FeedMedia.type value), so this already covers
    // wallpaper/thought/future-video with no per-type whitelist to maintain.
    if (enableViewportAutoplay) {
      const hasAnyMedia = feed.media && feed.media.length > 0;
      if (hasAnyMedia) {
        return <AutoplayFeedCard feed={feed} isActive={isActive} />;
      }
      // Feeds with zero media (defensive fallback only - not a designed case)
      // fall through to the existing path below, unchanged.
    }

    // Use RingtoneFeedCard for ringtone feeds, regular FeedCard for others
    let cardElement: React.ReactElement;
    if (feed.type === 'ringtone') {
      cardElement = (
        <RingtoneFeedCard
          feed={feed}
          onLike={onLike}
          onShare={onShare}
        />
      );
    } else if ((feed.type === 'aarti' || feed.type === 'bhajan') && audioCardReturnTo) {
      // Opt-in: use the real AudioContentCard (matching the Audio hub's own
      // design) for aarti/bhajan feeds when a caller has supplied a return
      // destination for it. See the audioCardReturnTo prop comment above.
      cardElement = (
        <AudioContentCard
          feed={feed}
          returnTo={audioCardReturnTo}
          returnParams={audioCardReturnParams}
          onLike={onLike}
        />
      );
    } else {
      cardElement = (
        <FeedCard
          feed={feed}
          onPress={onFeedPress}
          onLike={onLike}
          onShare={onShare}
          onDownload={onDownload}
          autoPlayVideo={autoPlayVideo && index === 0} // Auto-play only first video
        />
      );
    }

    if (itemSpacing === undefined && itemHorizontalPadding === undefined) {
      return cardElement;
    }

    // Cancels out this specific card type's own marginBottom and replaces it
    // with itemSpacing, so every item ends up with the exact same gap
    // regardless of which card rendered - without touching any card's own
    // component/styles.
    const itemWrapperStyle: { marginBottom?: number; marginHorizontal?: number } = {};
    if (itemSpacing !== undefined) {
      itemWrapperStyle.marginBottom = itemSpacing - getCardOwnMarginBottom(feed.type);
    }
    if (itemHorizontalPadding !== undefined) {
      itemWrapperStyle.marginHorizontal = itemHorizontalPadding;
    }

    return <View style={itemWrapperStyle}>{cardElement}</View>;
  }, [onFeedPress, onLike, onShare, onDownload, autoPlayVideo, enableViewportAutoplay, electedFeedId, audioCardReturnTo, audioCardReturnParams, itemSpacing, itemHorizontalPadding]);

  const renderFooter = useCallback(() => {
    if (!hasMore) {
      return (
        <View style={styles.endMessage}>
          <Text variant="caption" color="secondary" style={styles.endText}>
            🎉 You've reached the end! 🎉
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="caption" color="secondary" style={styles.loadingText}>
            Loading more posts...
          </Text>
        </View>
      );
    }

    return <View style={styles.footerSpacing} />;
  }, [hasMore, isLoadingMore]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading amazing posts...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorEmoji}>😕</Text>
          </View>
          <Text variant="h5" weight="semibold" style={styles.errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text variant="body" color="secondary" style={styles.errorMessage}>
            {error}
          </Text>
          {showRetry && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text variant="body" weight="semibold" style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>📱</Text>
        </View>
        <Text variant="h5" weight="semibold" style={styles.emptyTitle}>
          {emptyTitle}
        </Text>
        <Text variant="body" color="secondary" style={styles.emptySubtitle}>
          {emptySubtitle}
        </Text>
      </View>
    );
  }, [isLoading, error, emptyTitle, emptySubtitle, showRetry, onRetry]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading && feeds.length > 0) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, isLoading, feeds.length, onLoadMore]);

  const keyExtractor = useCallback((item: Feed, index: number) => `${item.type}-${item.id}-${index}`, []);

  const getItemLayout = useCallback(
    (data: ArrayLike<Feed> | null | undefined, index: number) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    }),
    [estimatedItemSize]
  );

  return (
    <FlatList
      ref={ref}
      data={feeds}
      renderItem={renderFeedItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmptyComponent}
      ListFooterComponent={renderFooter}
      style={styles.flatListStyle}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[goldenTempleTheme.colors.primary.DEFAULT]}
          tintColor={goldenTempleTheme.colors.primary.DEFAULT}
        />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      {...(enableViewportAutoplay
        ? { viewabilityConfigCallbackPairs: viewabilityConfigCallbackPairsRef.current }
        : {})}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        !ListHeaderComponent && styles.container,
        feeds.length === 0 && styles.emptyContainer,
        contentContainerStyle,
      ]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      updateCellsBatchingPeriod={16}
      // Phase 3: getItemLayout's estimatedItemSize assumption is wrong for
      // AutoplayFeedCard's two real shapes (fixed-height audio vs. 16:9-driven
      // visual) - passing a mismatched estimate was the root cause of the
      // pagination-blank-scroll bug found in Phase 2 testing (FlatList trusted a
      // fixed 600px/item virtual content size that no longer matched real
      // rendered heights). Dropped only for this path; every other consumer
      // keeps the existing fixed-size optimization unchanged.
      getItemLayout={enableViewportAutoplay ? undefined : getItemLayout}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
}

export default React.forwardRef(FeedList);

const styles = StyleSheet.create({
  flatListStyle: {
    backgroundColor: 'transparent', // Make FlatList transparent
  },
  container: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing['3xl'],
    paddingHorizontal: goldenTempleTheme.spacing.xl,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.lg,
    gap: goldenTempleTheme.spacing.sm,
  },
  footerSpacing: {
    height: goldenTempleTheme.spacing.xl,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: goldenTempleTheme.spacing.sm,
  },
  endMessage: {
    paddingVertical: goldenTempleTheme.spacing.lg,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Empty State
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  // Error State
  errorIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
    color: goldenTempleTheme.colors.text.primary,
  },
  errorMessage: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: goldenTempleTheme.spacing.lg,
  },
  retryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    borderRadius: goldenTempleTheme.borderRadius.md,
  },
  retryText: {
    color: '#fff',
  },
});