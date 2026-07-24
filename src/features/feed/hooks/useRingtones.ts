import { useState, useEffect, useCallback } from 'react';
import { Feed, FeedListResponse } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { DeityFilterSelection } from '@/components/molecules/DeityFilterRow';

export interface UseRingtonesResult {
  ringtones: Feed[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadRingtones: (cursor?: string, refresh?: boolean) => Promise<void>;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  handleLike: (feedId: string) => void;
  handleShare: (feedId: string) => void;
  handleDownload: (feedId: string) => void;
}

const PAGE_LIMIT = 20;
const TRENDING_DAYS = 7;

export function useRingtones(filter: DeityFilterSelection): UseRingtonesResult {
  const [ringtones, setRingtones] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Trending (a ranking view) and a deity selection (a stored filter) are
  // different query mechanics hitting different endpoints - kept as two
  // explicit branches here rather than one fetch function that silently
  // special-cases a flag, per the approved design.
  const fetchPage = useCallback(
    (offset: number): Promise<FeedListResponse> => {
      if (filter.kind === 'trending') {
        return feedService.getTrendingFeeds({
          type: 'ringtone',
          days: TRENDING_DAYS,
          limit: PAGE_LIMIT,
          offset,
        });
      }
      return feedService.getFeeds({
        type: 'ringtone',
        deityId: filter.deityId,
        limit: PAGE_LIMIT,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
    },
    [filter.kind, filter.kind === 'deity' ? filter.deityId : undefined]
  );

  const loadRingtones = useCallback(async (cursor?: string, refresh = false) => {
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

      // `type: 'ringtone'` is now sent server-side by fetchPage above, so
      // every row returned is already a ringtone - no client-side filtering
      // needed (that used to be the only thing scoping this list to ringtones).
      if (refresh || !cursor) {
        setRingtones(response.feeds);
      } else {
        setRingtones(prev => [...prev, ...response.feeds]);
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextOffset?.toString());

    } catch (err) {
      console.error('❌ Error loading ringtones:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ringtones';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [fetchPage]);

  const handleRefresh = useCallback(() => {
    loadRingtones(undefined, true);
  }, [loadRingtones]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && nextCursor) {
      loadRingtones(nextCursor);
    }
  }, [hasMore, isLoadingMore, nextCursor, loadRingtones]);

  const handleLike = useCallback(async (feedId: string) => {
    console.log('❤️ Handling like for ringtone:', feedId);

    // Optimistic update
    setRingtones(prev => prev.map(ringtone => {
      if (ringtone.id.toString() === feedId) {
        const wasLiked = ringtone.isLiked;
        return {
          ...ringtone,
          isLiked: !wasLiked,
          likesCount: wasLiked
            ? Math.max(0, ringtone.likesCount - 1)
            : ringtone.likesCount + 1
        };
      }
      return ringtone;
    }));

    try {
      // Find the current state to determine the API call
      const currentRingtone = ringtones.find(r => r.id.toString() === feedId);
      if (currentRingtone) {
        if (currentRingtone.isLiked) {
          await feedService.unlikeFeed(feedId);
          console.log('✅ Successfully unliked ringtone');
        } else {
          await feedService.likeFeed(feedId);
          console.log('✅ Successfully liked ringtone');
        }
      }
    } catch (error) {
      console.error('❌ Error with like API, reverting state:', error);

      // Revert optimistic update on error
      setRingtones(prev => prev.map(ringtone => {
        if (ringtone.id.toString() === feedId) {
          const wasLiked = !ringtone.isLiked; // Revert the change
          return {
            ...ringtone,
            isLiked: wasLiked,
            likesCount: wasLiked
              ? ringtone.likesCount + 1
              : Math.max(0, ringtone.likesCount - 1)
          };
        }
        return ringtone;
      }));
    }
  }, [ringtones]);

  const handleShare = useCallback(async (feedId: string) => {
    console.log('📤 Handling share for ringtone:', feedId);

    try {
      await feedService.shareFeed(feedId, { platform: 'native_share' });

      // Update share count
      setRingtones(prev => prev.map(ringtone => {
        if (ringtone.id.toString() === feedId) {
          return {
            ...ringtone,
            sharesCount: ringtone.sharesCount + 1
          };
        }
        return ringtone;
      }));

      console.log('✅ Successfully shared ringtone');
    } catch (error) {
      console.error('❌ Error sharing ringtone:', error);
    }
  }, []);

  const handleDownload = useCallback(async (feedId: string) => {
    console.log('💾 Handling download for ringtone:', feedId);

    try {
      await feedService.downloadFeed(feedId);

      // Update download count
      setRingtones(prev => prev.map(ringtone => {
        if (ringtone.id.toString() === feedId) {
          return {
            ...ringtone,
            downloadsCount: ringtone.downloadsCount + 1,
            isDownloaded: true
          };
        }
        return ringtone;
      }));

      console.log('✅ Successfully downloaded ringtone');
    } catch (error) {
      console.error('❌ Error downloading ringtone:', error);
    }
  }, []);

  // Fires on mount and whenever the filter changes (loadRingtones's identity
  // changes whenever fetchPage does, which changes whenever filter.kind/deityId
  // does). Resets pagination state synchronously first - trending and
  // deity-filtered lists are different result sets, not pages of one query,
  // so switching between them must not append onto the previous list.
  useEffect(() => {
    setRingtones([]);
    setHasMore(true);
    setNextCursor(undefined);
    loadRingtones();
  }, [loadRingtones]);

  return {
    ringtones,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    loadRingtones,
    handleRefresh,
    handleLoadMore,
    handleLike,
    handleShare,
    handleDownload,
  };
}
