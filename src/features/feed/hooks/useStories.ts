import { useInfiniteQuery, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { feedService } from '../services/feedService';
import { Feed, FeedListResponse } from '@/types/feed';

/**
 * Stories data (Bhav_Bhakti_Stories_Plan.md, phase 4). Same caching as the
 * rest of the app's feed lists (useFeed): 5 minutes fresh, no refetch on
 * mount or focus - every refetch returns newly signed cover URLs, which
 * re-downloads the images, so nothing here refetches more than it must.
 */

const PAGE_SIZE = 20;
// A series' episodes come back whole: the API allows up to 300 per page for
// ?seriesId= (backend §144; the Gita has 108). Longer series page on.
const EPISODES_LIMIT = 300;
// Safety stop for the paging loop (300 x 10 = 3000 episodes).
const EPISODES_MAX_PAGES = 10;
const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 10 * 60 * 1000;

export const storiesQueryKeys = {
  list: ['stories', 'list'] as const,
  series: (seriesId: number) => ['stories', 'series', seriesId] as const,
  episodes: (seriesId: number) => ['stories', 'episodes', seriesId] as const,
};

/**
 * The Stories page: series and one-off stories (the API never lists
 * episodes), newest first.
 */
export function useStoriesList() {
  const query = useInfiniteQuery({
    queryKey: storiesQueryKeys.list,
    queryFn: ({ pageParam = 0 }) =>
      feedService.getFeeds({
        type: 'stories',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        limit: PAGE_SIZE,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: FeedListResponse, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    stories: query.data?.pages.flatMap((page) => page.feeds) ?? [],
  };
}

/**
 * A series row by id. Starts from the Stories list's own copy when there is
 * one, so the header shows instantly and reuses the cover image already on
 * screen (same signed URL) instead of downloading it again.
 */
export function useStorySeries(seriesId: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: storiesQueryKeys.series(seriesId),
    queryFn: () => feedService.getFeedById(String(seriesId)),
    enabled: seriesId > 0,
    initialData: () =>
      queryClient
        .getQueryData<InfiniteData<FeedListResponse>>(storiesQueryKeys.list)
        ?.pages.flatMap((page) => page.feeds)
        .find((feed) => feed.id === seriesId),
    initialDataUpdatedAt: () => queryClient.getQueryState(storiesQueryKeys.list)?.dataUpdatedAt,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

// A series' episodes, in episode order (empty unless the series is active).
export function useSeriesEpisodes(seriesId: number) {
  return useQuery({
    queryKey: storiesQueryKeys.episodes(seriesId),
    queryFn: async (): Promise<Feed[]> => {
      const episodes: Feed[] = [];
      for (let page = 0; page < EPISODES_MAX_PAGES; page += 1) {
        const response = await feedService.getFeeds({ seriesId, limit: EPISODES_LIMIT, offset: episodes.length });
        episodes.push(...response.feeds);
        if (!response.hasMore || response.feeds.length === 0) break;
      }
      return episodes;
    },
    enabled: seriesId > 0,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

// A series row: a story with no media of its own (its episodes have it).
// Decided by mediaType, NOT by a missing url: with the ad-lock on, a locked
// single story also comes back with url null (backend §144), and must still
// open as a story, not as an empty series.
export function isStorySeries(feed: Pick<Feed, 'type' | 'mediaType' | 'seriesId'>): boolean {
  return feed.type === 'stories' && !feed.mediaType && !feed.seriesId;
}
