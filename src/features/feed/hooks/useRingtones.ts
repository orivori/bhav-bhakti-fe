import { useState, useEffect, useCallback } from 'react';
import { Feed, FeedListResponse } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';

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

export function useRingtones(): UseRingtonesResult {
  const [ringtones, setRingtones] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

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

      console.log('🎵 Loading ringtones with cursor:', cursor);

      // Create query parameters for ringtones
      const params = {
        limit: 20,
        offset: cursor ? parseInt(cursor) : 0,
        sortBy: 'createdAt' as const,
        sortOrder: 'DESC' as const,
      };

      const response = await feedService.getFeeds(params);
      console.log('✅ Feeds loaded, filtering for ringtones...');

      // Filter for ringtone feeds only
      const ringtoneFeeds = response.feeds.filter(feed => feed.type === 'ringtone');
      console.log(`🎼 Found ${ringtoneFeeds.length} ringtones out of ${response.feeds.length} total feeds`);

      if (refresh || !cursor) {
        setRingtones(ringtoneFeeds);
      } else {
        setRingtones(prev => [...prev, ...ringtoneFeeds]);
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
  }, []);

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

  useEffect(() => {
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
