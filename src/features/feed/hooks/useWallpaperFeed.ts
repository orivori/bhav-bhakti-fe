import { useState, useEffect, useCallback, useRef } from 'react';
import { Feed, FeedListResponse, TagGroup } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { newFeedSeed } from '@/utils/feedSeed';
import { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';

export interface UseWallpaperFeedResult {
  feeds: Feed[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
  viewFeed: (feedId: string) => void;
  likeFeed: (feedId: string) => void;
  shareFeed: (feedId: string) => void;
  downloadFeed: (feedId: string) => void;
}

const PAGE_LIMIT = 10;

// Shared by StatusTabContent and WallpapersTabContent - the only difference
// between the two buckets is the excludeTagGroup argument (undefined for
// Status's superset, 'occasion' for Wallpapers' general-purpose-only bucket -
// no tag from the occasion group). Applied the same way to the "All",
// liked and deity-filtered queries.
// Architecture mirrors useRingtones: "All" (the 'trending' chip) and a deity
// selection both use the weighted ranking (GET /feed?sortBy=weighted), the
// deity chip just adding deityId; Liked hits its own endpoint.
export function useWallpaperFeed(
  filter: DeityFilterSelection,
  excludeTagGroup?: TagGroup
): UseWallpaperFeedResult {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // The scroll session's seed for the weighted ranking - replaced whenever
  // the list starts over (first load, filter change, refresh), reused for
  // every following page.
  const seedRef = useRef(newFeedSeed());

  const fetchPage = useCallback(
    (offset: number, seed: string): Promise<FeedListResponse> => {
      if (filter.kind === 'liked') {
        return feedService.getUserLikedFeeds({
          type: 'wallpaper',
          excludeTagGroup,
          limit: PAGE_LIMIT,
          offset,
        });
      }
      return feedService.getFeeds({
        type: 'wallpaper',
        excludeTagGroup,
        deityId: filter.kind === 'deity' ? filter.deityId : undefined,
        limit: PAGE_LIMIT,
        offset,
        sortBy: 'weighted',
        seed,
      });
    },
    [filter.kind, filter.kind === 'deity' ? filter.deityId : undefined, excludeTagGroup]
  );

  const loadFeeds = useCallback(async (cursor?: string, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
        setError(null);
      } else if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const offset = cursor ? parseInt(cursor) : 0;
      if (!cursor) seedRef.current = newFeedSeed();
      const response = await fetchPage(offset, seedRef.current);

      if (refresh || !cursor) {
        setFeeds(response.feeds);
      } else {
        setFeeds(prev => [...prev, ...response.feeds]);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextOffset?.toString());
    } catch (err) {
      console.error('❌ Error loading wallpaper feed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [fetchPage]);

  const refreshHandler = useCallback(() => {
    loadFeeds(undefined, true);
  }, [loadFeeds]);

  const retryHandler = useCallback(() => {
    loadFeeds();
  }, [loadFeeds]);

  const loadMoreHandler = useCallback(() => {
    if (hasMore && !isLoadingMore && nextCursor) {
      loadFeeds(nextCursor);
    }
  }, [hasMore, isLoadingMore, nextCursor, loadFeeds]);

  const viewFeedHandler = useCallback((feedId: string) => {
    feedService.viewFeed(feedId).catch((err) => console.error('Error tracking view:', err));
  }, []);

  const likeFeedHandler = useCallback(async (feedId: string) => {
    // Optimistic update
    setFeeds(prev => prev.map(feed => {
      if (feed.id.toString() === feedId) {
        const wasLiked = feed.isLiked;
        return {
          ...feed,
          isLiked: !wasLiked,
          likesCount: wasLiked
            ? Math.max(0, feed.likesCount - 1)
            : feed.likesCount + 1
        };
      }
      return feed;
    }));

    try {
      const currentFeed = feeds.find(f => f.id.toString() === feedId);
      if (currentFeed) {
        if (currentFeed.isLiked) {
          await feedService.unlikeFeed(feedId);
        } else {
          await feedService.likeFeed(feedId);
        }
      }
    } catch (error) {
      console.error('❌ Error with like API, reverting state:', error);

      // Revert optimistic update on error
      setFeeds(prev => prev.map(feed => {
        if (feed.id.toString() === feedId) {
          const wasLiked = !feed.isLiked;
          return {
            ...feed,
            isLiked: wasLiked,
            likesCount: wasLiked
              ? feed.likesCount + 1
              : Math.max(0, feed.likesCount - 1)
          };
        }
        return feed;
      }));
    }
  }, [feeds]);

  // Called by the card AFTER a share/download already went through (and was
  // recorded by the backend) via authorizeMediaAction - only this list's
  // local counts are updated here. Calling the API again from here is what
  // used to count every hub share/download twice.
  const shareFeedHandler = useCallback((feedId: string) => {
    setFeeds(prev => prev.map(feed => {
      if (feed.id.toString() === feedId) {
        return { ...feed, sharesCount: feed.sharesCount + 1 };
      }
      return feed;
    }));
  }, []);

  const downloadFeedHandler = useCallback((feedId: string) => {
    setFeeds(prev => prev.map(feed => {
      if (feed.id.toString() === feedId) {
        return { ...feed, downloadsCount: feed.downloadsCount + 1, isDownloaded: true };
      }
      return feed;
    }));
  }, []);

  // Fires on mount and whenever the filter changes (loadFeeds's identity
  // changes whenever fetchPage does, which changes whenever filter.kind/
  // deityId does - excludeTagGroup is fixed per component instance, not a
  // runtime-changing value). Resets pagination state synchronously first -
  // trending and deity-filtered lists are different result sets, not pages
  // of one query, so switching between them must not append onto the
  // previous list.
  useEffect(() => {
    setFeeds([]);
    setHasMore(true);
    setNextCursor(undefined);
    loadFeeds();
  }, [loadFeeds]);

  return {
    feeds,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadMore: loadMoreHandler,
    refresh: refreshHandler,
    retry: retryHandler,
    viewFeed: viewFeedHandler,
    likeFeed: likeFeedHandler,
    shareFeed: shareFeedHandler,
    downloadFeed: downloadFeedHandler,
  };
}
