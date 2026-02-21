import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Feed, FeedFilters, PopularTag } from '@/types/feed';

interface FeedState {
  // Feed data
  feeds: Feed[];
  trendingFeeds: Feed[];
  likedFeeds: Feed[];
  popularTags: PopularTag[];

  // Pagination
  hasMore: boolean;
  nextOffset: number;
  nextCursor: string | null;
  totalCount: number;

  // Pagination for trending feeds
  trendingHasMore: boolean;
  trendingNextOffset: number;
  trendingTotalCount: number;

  // Pagination for liked feeds
  likedHasMore: boolean;
  likedNextOffset: number;
  likedTotalCount: number;

  // Current filters and sorting
  currentFilters: FeedFilters;

  // UI State
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isLoadingTrending: boolean;
  isLoadingLiked: boolean;
  error: string | null;

  // Currently displayed feed (for detail view)
  currentFeed: Feed | null;

  // Actions - Feed Data Management
  setFeeds: (feeds: Feed[]) => void;
  addFeeds: (feeds: Feed[]) => void;
  prependFeed: (feed: Feed) => void;
  updateFeed: (feedId: string, updates: Partial<Feed>) => void;
  removeFeed: (feedId: string) => void;
  clearFeeds: () => void;

  // Actions - Trending Feeds
  setTrendingFeeds: (feeds: Feed[]) => void;
  addTrendingFeeds: (feeds: Feed[]) => void;
  clearTrendingFeeds: () => void;

  // Actions - Liked Feeds
  setLikedFeeds: (feeds: Feed[]) => void;
  addLikedFeeds: (feeds: Feed[]) => void;
  clearLikedFeeds: () => void;

  // Actions - Popular Tags
  setPopularTags: (tags: PopularTag[]) => void;

  // Actions - Pagination
  setPagination: (params: {
    hasMore?: boolean;
    nextOffset?: number;
    nextCursor?: string | null;
    totalCount?: number;
  }) => void;

  setTrendingPagination: (params: {
    hasMore?: boolean;
    nextOffset?: number;
    totalCount?: number;
  }) => void;

  setLikedPagination: (params: {
    hasMore?: boolean;
    nextOffset?: number;
    totalCount?: number;
  }) => void;

  // Actions - Filters
  setCurrentFilters: (filters: FeedFilters) => void;
  clearFilters: () => void;

  // Actions - UI State
  setIsLoading: (loading: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setIsLoadingTrending: (loading: boolean) => void;
  setIsLoadingLiked: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Current Feed
  setCurrentFeed: (feed: Feed | null) => void;

  // Actions - User Interactions
  toggleLike: (feedId: string) => void;
  incrementDownload: (feedId: string) => void;
  incrementShare: (feedId: string) => void;
  incrementView: (feedId: string) => void;

  // Actions - Reset
  reset: () => void;
  resetPagination: () => void;
}

const initialState = {
  feeds: [],
  trendingFeeds: [],
  likedFeeds: [],
  popularTags: [],
  hasMore: true,
  nextOffset: 0,
  nextCursor: null,
  totalCount: 0,
  trendingHasMore: true,
  trendingNextOffset: 0,
  trendingTotalCount: 0,
  likedHasMore: true,
  likedNextOffset: 0,
  likedTotalCount: 0,
  currentFilters: {},
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  isLoadingTrending: false,
  isLoadingLiked: false,
  error: null,
  currentFeed: null,
};

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Feed Data Management
      setFeeds: (feeds) => set({ feeds }),

      addFeeds: (newFeeds) => {
        const { feeds } = get();
        // Remove duplicates by ID
        const existingIds = new Set(feeds.map(f => f.id));
        const uniqueNewFeeds = newFeeds.filter(f => !existingIds.has(f.id));
        set({ feeds: [...feeds, ...uniqueNewFeeds] });
      },

      prependFeed: (feed) => {
        const { feeds } = get();
        // Remove if already exists and add to beginning
        const filteredFeeds = feeds.filter(f => f.id !== feed.id);
        set({ feeds: [feed, ...filteredFeeds] });
      },

      updateFeed: (feedId, updates) => {
        const { feeds, trendingFeeds, likedFeeds } = get();

        const updateFeedInArray = (feedArray: Feed[]) =>
          feedArray.map(feed =>
            feed.id === feedId ? { ...feed, ...updates } : feed
          );

        set({
          feeds: updateFeedInArray(feeds),
          trendingFeeds: updateFeedInArray(trendingFeeds),
          likedFeeds: updateFeedInArray(likedFeeds),
          currentFeed: get().currentFeed?.id === feedId
            ? { ...get().currentFeed!, ...updates }
            : get().currentFeed,
        });
      },

      removeFeed: (feedId) => {
        const { feeds, trendingFeeds, likedFeeds } = get();
        set({
          feeds: feeds.filter(f => f.id !== feedId),
          trendingFeeds: trendingFeeds.filter(f => f.id !== feedId),
          likedFeeds: likedFeeds.filter(f => f.id !== feedId),
          currentFeed: get().currentFeed?.id === feedId ? null : get().currentFeed,
        });
      },

      clearFeeds: () => set({ feeds: [] }),

      // Trending Feeds
      setTrendingFeeds: (feeds) => set({ trendingFeeds: feeds }),

      addTrendingFeeds: (newFeeds) => {
        const { trendingFeeds } = get();
        const existingIds = new Set(trendingFeeds.map(f => f.id));
        const uniqueNewFeeds = newFeeds.filter(f => !existingIds.has(f.id));
        set({ trendingFeeds: [...trendingFeeds, ...uniqueNewFeeds] });
      },

      clearTrendingFeeds: () => set({ trendingFeeds: [] }),

      // Liked Feeds
      setLikedFeeds: (feeds) => set({ likedFeeds: feeds }),

      addLikedFeeds: (newFeeds) => {
        const { likedFeeds } = get();
        const existingIds = new Set(likedFeeds.map(f => f.id));
        const uniqueNewFeeds = newFeeds.filter(f => !existingIds.has(f.id));
        set({ likedFeeds: [...likedFeeds, ...uniqueNewFeeds] });
      },

      clearLikedFeeds: () => set({ likedFeeds: [] }),

      // Popular Tags
      setPopularTags: (tags) => set({ popularTags: tags }),

      // Pagination
      setPagination: (params) => set({ ...params }),

      setTrendingPagination: (params) => {
        const updates: any = {};
        if (params.hasMore !== undefined) updates.trendingHasMore = params.hasMore;
        if (params.nextOffset !== undefined) updates.trendingNextOffset = params.nextOffset;
        if (params.totalCount !== undefined) updates.trendingTotalCount = params.totalCount;
        set(updates);
      },

      setLikedPagination: (params) => {
        const updates: any = {};
        if (params.hasMore !== undefined) updates.likedHasMore = params.hasMore;
        if (params.nextOffset !== undefined) updates.likedNextOffset = params.nextOffset;
        if (params.totalCount !== undefined) updates.likedTotalCount = params.totalCount;
        set(updates);
      },

      // Filters
      setCurrentFilters: (filters) => set({ currentFilters: filters }),
      clearFilters: () => set({ currentFilters: {} }),

      // UI State
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsLoadingMore: (loading) => set({ isLoadingMore: loading }),
      setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
      setIsLoadingTrending: (loading) => set({ isLoadingTrending: loading }),
      setIsLoadingLiked: (loading) => set({ isLoadingLiked: loading }),
      setError: (error) => set({ error }),

      // Current Feed
      setCurrentFeed: (feed) => set({ currentFeed: feed }),

      // User Interactions
      toggleLike: (feedId) => {
        get().updateFeed(feedId, (feed) => {
          const isLiked = feed.isLiked;
          return {
            isLiked: !isLiked,
            likesCount: isLiked ? feed.likesCount - 1 : feed.likesCount + 1,
          };
        });
      },

      incrementDownload: (feedId) => {
        get().updateFeed(feedId, (feed) => ({
          downloadsCount: feed.downloadsCount + 1,
        }));
      },

      incrementShare: (feedId) => {
        get().updateFeed(feedId, (feed) => ({
          sharesCount: feed.sharesCount + 1,
        }));
      },

      incrementView: (feedId) => {
        get().updateFeed(feedId, (feed) => ({
          viewsCount: feed.viewsCount + 1,
        }));
      },

      // Reset
      reset: () => set(initialState),

      resetPagination: () => set({
        hasMore: true,
        nextOffset: 0,
        nextCursor: null,
        totalCount: 0,
        trendingHasMore: true,
        trendingNextOffset: 0,
        trendingTotalCount: 0,
        likedHasMore: true,
        likedNextOffset: 0,
        likedTotalCount: 0,
      }),
    }),
    {
      name: 'feed-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist user preferences and current filters
        currentFilters: state.currentFilters,
        popularTags: state.popularTags,
        // Don't persist feeds as they change frequently
      }),
    }
  )
);