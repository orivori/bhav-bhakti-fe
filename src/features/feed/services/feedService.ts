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
  PlayFeedResponse,
  TrendingFeedsResponse,
  PopularTagsResponse,
  UserLikedFeedsResponse,
  TagGroup,
} from '@/types/feed';

// Timeout for the calls authorizeMediaAction makes before a download, share
// or enlarged view. Shorter than the app-wide default, since the action now
// waits on this call and goes ahead anyway if it fails (fail-open).
const MEDIA_ACCESS_TIMEOUT_MS = 6000;

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
    if (params.type) {
      queryParams.append('type', Array.isArray(params.type) ? params.type.join(',') : params.type);
    }
    if (params.deityId) {
      queryParams.append('deityId', params.deityId.toString());
    }
    if (params.excludeTagGroup) queryParams.append('excludeTagGroup', params.excludeTagGroup);
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
    const response = await apiClient.get<any>(API_ENDPOINTS.FEED.GET_BY_ID(feedId));

    // Handle nested API response structure {success: true, data: {feedData}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as Feed;
    }

    // Fallback to direct response
    return response as Feed;
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
   * Track feed download. Call through authorizeMediaAction (mediaAccess.ts),
   * before the file is fetched - this same request is where the backend's
   * premium gate answers.
   */
  async downloadFeed(feedId: string): Promise<DownloadFeedResponse> {
    return await apiClient.post<DownloadFeedResponse>(
      API_ENDPOINTS.FEED.DOWNLOAD(feedId),
      {},
      { timeout: MEDIA_ACCESS_TIMEOUT_MS }
    );
  }

  /**
   * Track feed share. Call through authorizeMediaAction (mediaAccess.ts),
   * before the share sheet opens.
   */
  async shareFeed(feedId: string, shareData: ShareFeedRequest = {}): Promise<ShareFeedResponse> {
    // A 401 here shows the session-expired prompt like any other request
    // (apiClient); the share itself still goes ahead (fail-open, mediaAccess.ts).
    return await apiClient.post<ShareFeedResponse>(API_ENDPOINTS.FEED.SHARE(feedId), shareData, {
      timeout: MEDIA_ACCESS_TIMEOUT_MS,
    });
  }

  /**
   * Asks whether a feed's enlarged view (the viewing window) is allowed.
   * Call through authorizeMediaAction (mediaAccess.ts). Records nothing.
   */
  async checkViewAccess(feedId: string): Promise<void> {
    await apiClient.get(API_ENDPOINTS.FEED.VIEW_ACCESS(feedId), { timeout: MEDIA_ACCESS_TIMEOUT_MS });
  }

  /**
   * Track feed view
   */
  async viewFeed(feedId: string): Promise<ViewFeedResponse> {
    return await apiClient.post<ViewFeedResponse>(API_ENDPOINTS.FEED.VIEW(feedId), {});
  }

  /**
   * Track feed play
   */
  async playFeed(feedId: string): Promise<PlayFeedResponse> {
    return await apiClient.post<PlayFeedResponse>(API_ENDPOINTS.FEED.PLAY(feedId), {});
  }

  /**
   * Get user's liked feeds
   */
  async getUserLikedFeeds(params: { limit?: number; offset?: number; type?: string; excludeTagGroup?: TagGroup } = {}): Promise<UserLikedFeedsResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.excludeTagGroup) queryParams.append('excludeTagGroup', params.excludeTagGroup);

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
  async getTrendingFeeds(params: { limit?: number; offset?: number; days?: number; type?: string; excludeTagGroup?: TagGroup } = {}): Promise<TrendingFeedsResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.days) queryParams.append('days', params.days.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.excludeTagGroup) queryParams.append('excludeTagGroup', params.excludeTagGroup);

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