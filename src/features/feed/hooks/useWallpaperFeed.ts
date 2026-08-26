import { useState, useEffect, useCallback } from 'react';
import { Feed, FeedListResponse } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
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
const TRENDING_DAYS = 7;

// Shared by StatusTabContent and WallpapersTabContent - the only difference
// between the two buckets is the label argument (undefined for Status's
// superset, 'none' for Wallpapers' general-purpose-only bucket).
// Architecture mirrors useRingtones exactly (Phase 6 of the Audio hub's
// deity-filter work): trending (a ranking view) and a deity selection (a
// stored filter) are different query mechanics hitting different endpoints,
// kept as two explicit branches rather than one fetch function silently
// special-casing a flag.
export function useWallpaperFeed(
  filter: DeityFilterSelection,
  label?: 'none'
): UseWallpaperFeedResult {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    (offset: number): Promise<FeedListResponse> => {
      if (filter.kind === 'trending') {
        return feedService.getTrendingFeeds({
          type: 'wallpaper',
          label,
          days: TRENDING_DAYS,
          limit: PAGE_LIMIT,
          offset,
        });
      }
      if (filter.kind === 'liked') {
        return feedService.getUserLikedFeeds({
          type: 'wallpaper',
          label,
          limit: PAGE_LIMIT,
          offset,
        });
      }
      return feedService.getFeeds({
        type: 'wallpaper',
        label,
        deityId: filter.deityId,
        limit: PAGE_LIMIT,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
    },
    [filter.kind, filter.kind === 'deity' ? filter.deityId : undefined, label]
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
      const response = await fetchPage(offset);

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

  const shareFeedHandler = useCallback(async (feedId: string) => {
    try {
      await feedService.shareFeed(feedId, { platform: 'native_share' });

      setFeeds(prev => prev.map(feed => {
        if (feed.id.toString() === feedId) {
          return { ...feed, sharesCount: feed.sharesCount + 1 };
        }
        return feed;
      }));
    } catch (error) {
      console.error('❌ Error sharing wallpaper feed:', error);
    }
  }, []);

  const downloadFeedHandler = useCallback(async (feedId: string) => {
    try {
      await feedService.downloadFeed(feedId);

      setFeeds(prev => prev.map(feed => {
        if (feed.id.toString() === feedId) {
          return { ...feed, downloadsCount: feed.downloadsCount + 1, isDownloaded: true };
        }
        return feed;
      }));
    } catch (error) {
      console.error('❌ Error downloading wallpaper feed:', error);
    }
  }, []);

  // Fires on mount and whenever the filter changes (loadFeeds's identity
  // changes whenever fetchPage does, which changes whenever filter.kind/
  // deityId does - label is fixed per component instance, not a
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
