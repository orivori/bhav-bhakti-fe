import React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { feedService } from '../services/feedService';
import { FeedQueryParams, Feed, FeedFilters } from '@/types/feed';
import { useFeedStore } from '@/store/feedStore';

interface UseFeedOptions {
  filters?: FeedFilters;
  limit?: number;
  enabled?: boolean;
}

export function useFeed(options: UseFeedOptions = {}) {
  const { filters = {}, limit = 20, enabled = true } = options;
  const queryClient = useQueryClient();
  const {
    setFeeds,
    addFeeds,
    setIsLoading,
    setIsLoadingMore,
    setIsRefreshing,
    setError,
    setPagination,
    resetPagination,
    toggleLike,
    incrementDownload,
    incrementShare,
    incrementView,
  } = useFeedStore();

  // Create query key based on filters
  const queryKey = ['feeds', filters];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const params: FeedQueryParams = {
        ...filters,
        limit,
        offset: pageParam as number,
      };
      return await feedService.getFeeds(params);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextOffset || allPages.length * limit;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Flatten the paginated data
  const feeds = data?.pages.flatMap(page => page.feeds) || [];

  // Update store with current state
  React.useEffect(() => {
    setIsLoading(isLoading);
    setIsLoadingMore(isFetchingNextPage);
    setIsRefreshing(isRefetching);
    setError(error?.message || null);

    if (data) {
      const lastPage = data.pages[data.pages.length - 1];
      setPagination({
        hasMore: !!hasNextPage,
        totalCount: lastPage?.totalCount || 0,
        nextOffset: lastPage?.nextOffset,
        nextCursor: lastPage?.nextCursor,
      });
    }
  }, [
    isLoading,
    isFetchingNextPage,
    isRefetching,
    error,
    data,
    hasNextPage,
    setIsLoading,
    setIsLoadingMore,
    setIsRefreshing,
    setError,
    setPagination,
  ]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ feedId, isLiked }: { feedId: string; isLiked: boolean }) => {
      if (isLiked) {
        return await feedService.unlikeFeed(feedId);
      } else {
        return await feedService.likeFeed(feedId);
      }
    },
    onMutate: async ({ feedId }) => {
      // Optimistic update
      toggleLike(feedId);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      return { previousData };
    },
    onError: (err, { feedId }, context) => {
      // Rollback optimistic update
      toggleLike(feedId);

      // Restore previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSuccess: (data, { feedId }) => {
      // Update query cache
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            feeds: page.feeds.map((feed: Feed) => {
              if (feed.id === feedId) {
                // Check if it's a like response (has created property) or unlike response (has deleted property)
                const isLikeResponse = 'created' in data;
                const isUnlikeResponse = 'deleted' in data;

                return {
                  ...feed,
                  isLiked: isLikeResponse
                    ? (data as any).created
                    : isUnlikeResponse
                      ? !(data as any).deleted
                      : feed.isLiked,
                  likesCount: isLikeResponse && (data as any).created
                    ? feed.likesCount + 1
                    : isUnlikeResponse && (data as any).deleted
                      ? feed.likesCount - 1
                      : feed.likesCount,
                };
              }
              return feed;
            }),
          })),
        };
      });
    },
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: (feedId: string) => feedService.downloadFeed(feedId),
    onSuccess: (_, feedId) => {
      incrementDownload(feedId);
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: ({ feedId, platform }: { feedId: string; platform?: string }) =>
      feedService.shareFeed(feedId, { platform }),
    onSuccess: (_, { feedId }) => {
      incrementShare(feedId);
    },
  });

  // View mutation
  const viewMutation = useMutation({
    mutationFn: (feedId: string) => feedService.viewFeed(feedId),
    onSuccess: (_, feedId) => {
      incrementView(feedId);
    },
  });

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRefresh = () => {
    resetPagination();
    refetch();
  };

  const handleLike = (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId);
    if (feed) {
      likeMutation.mutate({ feedId, isLiked: feed.isLiked || false });
    }
  };

  const handleDownload = (feedId: string) => {
    downloadMutation.mutate(feedId);
  };

  const handleShare = (feedId: string, platform?: string) => {
    shareMutation.mutate({ feedId, platform });
  };

  const handleView = (feedId: string) => {
    viewMutation.mutate(feedId);
  };

  return {
    // Data
    feeds,
    totalFeeds: feeds.length,

    // Loading states
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isRefreshing: isRefetching,

    // Pagination
    hasMore: !!hasNextPage,

    // Error handling
    error: error?.message || null,

    // Actions
    loadMore: handleLoadMore,
    refresh: handleRefresh,
    retry: refetch,

    // Interactions
    likeFeed: handleLike,
    downloadFeed: handleDownload,
    shareFeed: handleShare,
    viewFeed: handleView,

    // Mutation states
    isLiking: likeMutation.isPending,
    isDownloading: downloadMutation.isPending,
    isSharing: shareMutation.isPending,
  };
}

// Hook for trending feeds
export function useTrendingFeeds(options: { limit?: number; days?: number; enabled?: boolean } = {}) {
  const { limit = 20, days = 7, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ['feeds', 'trending', { days }],
    queryFn: async ({ pageParam = 0 }) => {
      return await feedService.getTrendingFeeds({
        limit,
        offset: pageParam as number,
        days,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextOffset || allPages.length * limit;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for user's liked feeds
export function useUserLikedFeeds(options: { limit?: number; enabled?: boolean } = {}) {
  const { limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ['feeds', 'liked'],
    queryFn: async ({ pageParam = 0 }) => {
      return await feedService.getUserLikedFeeds({
        limit,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextOffset || allPages.length * limit;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for popular tags
export function usePopularTags(limit: number = 20) {
  return useQuery({
    queryKey: ['feeds', 'tags', 'popular'],
    queryFn: () => feedService.getPopularTags(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}