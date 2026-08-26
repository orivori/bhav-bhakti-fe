import { useState, useEffect, useCallback } from 'react';
import { Feed, FeedListResponse } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';

export type AudioFeedType = 'aarti' | 'bhajan';

export interface UseAudioFeedResult {
  items: Feed[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadItems: (cursor?: string, refresh?: boolean) => Promise<void>;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  handleLike: (feedId: string) => void;
  handleShare: (feedId: string) => void;
  handleDownload: (feedId: string) => void;
}

const PAGE_LIMIT = 20;
const TRENDING_DAYS = 7;

// Parameterized version of useRingtones() (see that file) - same
// trending/deity branching, pagination, and reset-on-filter-change logic,
// just generic over `type` instead of hardcoded to 'ringtone'. Kept as one
// shared hook rather than two copies since Aarti and Bhajan need identical
// query mechanics, differing only in which `type` they send server-side.
export function useAudioFeed(type: AudioFeedType, filter: DeityFilterSelection): UseAudioFeedResult {
  const [items, setItems] = useState<Feed[]>([]);
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
          type,
          days: TRENDING_DAYS,
          limit: PAGE_LIMIT,
          offset,
        });
      }
      if (filter.kind === 'liked') {
        return feedService.getUserLikedFeeds({
          type,
          limit: PAGE_LIMIT,
          offset,
        });
      }
      return feedService.getFeeds({
        type,
        deityId: filter.deityId,
        limit: PAGE_LIMIT,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
    },
    [type, filter.kind, filter.kind === 'deity' ? filter.deityId : undefined]
  );

  const loadItems = useCallback(async (cursor?: string, refresh = false) => {
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
        setItems(response.feeds);
      } else {
        setItems(prev => [...prev, ...response.feeds]);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextOffset?.toString());

    } catch (err) {
      console.error(`❌ Error loading ${type} feed:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to load ${type} content`;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [fetchPage, type]);

  const handleRefresh = useCallback(() => {
    loadItems(undefined, true);
  }, [loadItems]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && nextCursor) {
      loadItems(nextCursor);
    }
  }, [hasMore, isLoadingMore, nextCursor, loadItems]);

  const handleLike = useCallback(async (feedId: string) => {
    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.id.toString() === feedId) {
        const wasLiked = item.isLiked;
        return {
          ...item,
          isLiked: !wasLiked,
          likesCount: wasLiked
            ? Math.max(0, item.likesCount - 1)
            : item.likesCount + 1
        };
      }
      return item;
    }));

    try {
      const currentItem = items.find(i => i.id.toString() === feedId);
      if (currentItem) {
        if (currentItem.isLiked) {
          await feedService.unlikeFeed(feedId);
        } else {
          await feedService.likeFeed(feedId);
        }
      }
    } catch (error) {
      console.error(`❌ Error with like API for ${type}, reverting state:`, error);

      // Revert optimistic update on error
      setItems(prev => prev.map(item => {
        if (item.id.toString() === feedId) {
          const wasLiked = !item.isLiked; // Revert the change
          return {
            ...item,
            isLiked: wasLiked,
            likesCount: wasLiked
              ? item.likesCount + 1
              : Math.max(0, item.likesCount - 1)
          };
        }
        return item;
      }));
    }
  }, [items, type]);

  const handleShare = useCallback(async (feedId: string) => {
    try {
      await feedService.shareFeed(feedId, { platform: 'native_share' });

      setItems(prev => prev.map(item => {
        if (item.id.toString() === feedId) {
          return {
            ...item,
            sharesCount: item.sharesCount + 1
          };
        }
        return item;
      }));
    } catch (error) {
      console.error(`❌ Error sharing ${type}:`, error);
    }
  }, [type]);

  const handleDownload = useCallback(async (feedId: string) => {
    try {
      await feedService.downloadFeed(feedId);

      setItems(prev => prev.map(item => {
        if (item.id.toString() === feedId) {
          return {
            ...item,
            downloadsCount: item.downloadsCount + 1,
            isDownloaded: true
          };
        }
        return item;
      }));
    } catch (error) {
      console.error(`❌ Error downloading ${type}:`, error);
    }
  }, [type]);

  // Fires on mount and whenever type/filter changes. Resets pagination state
  // synchronously first - trending and deity-filtered lists are different
  // result sets, not pages of one query.
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setNextCursor(undefined);
    loadItems();
  }, [loadItems]);

  return {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadItems,
    handleRefresh,
    handleLoadMore,
    handleLike,
    handleShare,
    handleDownload,
  };
}
