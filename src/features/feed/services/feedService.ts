import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import {
  Feed,
  FeedListResponse,
  ApiFeedListResponse,
  ApiTrendingFeedsResponse,
  ApiUserLikedFeedsResponse,
  CreateFeedRequest,
  FeedQueryParams,
  LikeFeedResponse,
  UnlikeFeedResponse,
  ShareFeedRequest,
  ShareFeedResponse,
  DownloadFeedResponse,
  ViewFeedResponse,
  TrendingFeedsResponse,
  PopularTagsResponse,
  UserLikedFeedsResponse,
} from '@/types/feed';

class FeedService {
  /**
   * Get feeds with filters and pagination
   */
  async getFeeds(params: FeedQueryParams = {}): Promise<FeedListResponse> {
    const queryParams = new URLSearchParams();

    // Add pagination params
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    // Add filter params
    if (params.type) queryParams.append('type', params.type);
    if (params.categoryId) {
      queryParams.append('categoryId', params.categoryId.toString());
    }
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.createdBy) queryParams.append('createdBy', params.createdBy);

    // Handle tags array
    if (params.tags && params.tags.length > 0) {
      queryParams.append('tags', params.tags.join(','));
    }

    const url = `${API_ENDPOINTS.FEED.LIST}?${queryParams.toString()}`;

    // Get the API response
    const apiResponse = await apiClient.get<ApiFeedListResponse>(url);

    // Transform API response to client format
    return {
      feeds: apiResponse.data.feeds,
      totalCount: apiResponse.data.pagination.total,
      hasMore: apiResponse.data.pagination.hasMore,
      nextOffset: apiResponse.data.pagination.offset + apiResponse.data.pagination.limit,
    };
  }

  /**
   * Get feed by ID
   */
  async getFeedById(feedId: string): Promise<Feed> {
    return await apiClient.get<Feed>(API_ENDPOINTS.FEED.GET_BY_ID(feedId));
  }

  /**
   * Create new feed
   */
  async createFeed(feedData: CreateFeedRequest): Promise<Feed> {
    return await apiClient.post<Feed>(API_ENDPOINTS.FEED.CREATE, feedData);
  }

  /**
   * Update existing feed
   */
  async updateFeed(feedId: string, feedData: Partial<CreateFeedRequest>): Promise<Feed> {
    return await apiClient.put<Feed>(API_ENDPOINTS.FEED.UPDATE(feedId), feedData);
  }

  /**
   * Delete feed
   */
  async deleteFeed(feedId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FEED.DELETE(feedId));
  }

  /**
   * Like a feed
   */
  async likeFeed(feedId: string): Promise<LikeFeedResponse> {
    return await apiClient.post<LikeFeedResponse>(API_ENDPOINTS.FEED.LIKE(feedId), {});
  }

  /**
   * Unlike a feed
   */
  async unlikeFeed(feedId: string): Promise<UnlikeFeedResponse> {
    return await apiClient.delete<UnlikeFeedResponse>(API_ENDPOINTS.FEED.UNLIKE(feedId));
  }

  /**
   * Track feed download
   */
  async downloadFeed(feedId: string): Promise<DownloadFeedResponse> {
    return await apiClient.post<DownloadFeedResponse>(API_ENDPOINTS.FEED.DOWNLOAD(feedId), {});
  }

  /**
   * Track feed share
   */
  async shareFeed(feedId: string, shareData: ShareFeedRequest = {}): Promise<ShareFeedResponse> {
    return await apiClient.post<ShareFeedResponse>(API_ENDPOINTS.FEED.SHARE(feedId), shareData);
  }

  /**
   * Track feed view
   */
  async viewFeed(feedId: string): Promise<ViewFeedResponse> {
    return await apiClient.post<ViewFeedResponse>(API_ENDPOINTS.FEED.VIEW(feedId), {});
  }

  /**
   * Get user's liked feeds
   */
  async getUserLikedFeeds(params: { limit?: number; offset?: number } = {}): Promise<UserLikedFeedsResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const url = `${API_ENDPOINTS.FEED.USER_LIKED}?${queryParams.toString()}`;
    const apiResponse = await apiClient.get<ApiUserLikedFeedsResponse>(url);

    // Transform API response to client format
    return {
      feeds: apiResponse.data.feeds,
      totalCount: apiResponse.data.pagination.total,
      hasMore: apiResponse.data.pagination.hasMore,
      nextOffset: apiResponse.data.pagination.offset + apiResponse.data.pagination.limit,
    };
  }

  /**
   * Get trending feeds
   */
  async getTrendingFeeds(params: { limit?: number; offset?: number; days?: number } = {}): Promise<TrendingFeedsResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.days) queryParams.append('days', params.days.toString());

    const url = `${API_ENDPOINTS.FEED.TRENDING}?${queryParams.toString()}`;
    const apiResponse = await apiClient.get<ApiTrendingFeedsResponse>(url);

    // Transform API response to client format
    return {
      feeds: apiResponse.data.feeds,
      totalCount: apiResponse.data.pagination.total,
      hasMore: apiResponse.data.pagination.hasMore,
      nextOffset: apiResponse.data.pagination.offset + apiResponse.data.pagination.limit,
    };
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<PopularTagsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());

    const url = `${API_ENDPOINTS.FEED.POPULAR_TAGS}?${queryParams.toString()}`;
    return await apiClient.get<PopularTagsResponse>(url);
  }
}

export const feedService = new FeedService();