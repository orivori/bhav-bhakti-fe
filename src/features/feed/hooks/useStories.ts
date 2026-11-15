import { useInfiniteQuery, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { feedService } from '../services/feedService';
import { Feed, FeedListResponse } from '@/types/feed';
import { storyKind } from '@/features/stories/storyLock';

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
 * A story (series row or single story) by id - the story page's header and,
 * for a single story, its one row. Starts from the Stories list's own copy when there is
 * one, so the header shows instantly and reuses the cover image already on
 * screen (same signed URL) instead of downloading it again.
 */
export function useStory(storyId: number) {
  const seriesId = storyId;
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

// Old name, same hook.
export const useStorySeries = useStory;

// A series' episodes, in episode order (empty unless the series is active).
// enabled: false skips the request (the story page for a single story).
export function useSeriesEpisodes(seriesId: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    ...seriesEpisodesQuery(seriesId),
    enabled: enabled && seriesId > 0,
    refetchOnWindowFocus: false,
  });
}

// Every page of a series' episodes, in order.
async function fetchSeriesEpisodes(seriesId: number): Promise<Feed[]> {
  const episodes: Feed[] = [];
  for (let page = 0; page < EPISODES_MAX_PAGES; page += 1) {
    const response = await feedService.getFeeds({ seriesId, limit: EPISODES_LIMIT, offset: episodes.length });
    episodes.push(...response.feeds);
    if (!response.hasMore || response.feeds.length === 0) break;
  }
  return episodes;
}

/**
 * The ONE definition of a series' episode-list query - the story page
 * (useSeriesEpisodes) and the Home card's Listen (queryClient.fetchQuery)
 * share it, so they share one cache entry and one request.
 */
export function seriesEpisodesQuery(seriesId: number) {
  return {
    queryKey: storiesQueryKeys.episodes(seriesId),
    queryFn: () => fetchSeriesEpisodes(seriesId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  };
}

// A series row: a story with no media of its own (its episodes have it).
// One rule for the whole app: storyKind() (storyLock.ts) - by mediaType,
// never by a missing url (a locked single story also has url null, and the
// server may send it episodeCount: 0).
export function isStorySeries(feed: Pick<Feed, 'type' | 'mediaType' | 'seriesId'> & { episodeNumber?: number | null }): boolean {
  return storyKind(feed) === 'series';
}
