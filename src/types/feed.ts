export type FeedMediaType = 'image' | 'video' | 'audio';

export interface Deity {
  id: number;
  name: string;
  displayName: Record<string, string>;
  icon?: string;
  colors?: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface Feed {
  id: number;
  userId: number;
  title?: Record<string, string> | null;
  subtitle?: Record<string, string> | null;
  location?: string;
  type: 'general' | 'mantra' | 'ringtone' | 'wallpaper' | 'aarti' | 'bhajan' | 'thought';
  deityId?: number | null;
  deity?: Deity | null;
  description?: Record<string, string> | null;
  objective?: Record<string, string> | null;
  // One media item per feed. url and the thumbnails are full public URLs
  // (the backend builds them per response). Use getFeedThumbnailUrl() rather
  // than reading a thumbnail field directly.
  url: string;
  mediaType: FeedMediaType;
  thumbnailSquareUrl?: string | null;
  thumbnailPortraitUrl?: string | null;
  duration?: number | null; // seconds
  likesCount: number;
  commentsCount: number;
  downloadsCount: number;
  sharesCount: number;
  viewsCount: number;
  allowComments: boolean;
  allowDownloads: boolean;
  isRepeatable: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    profilePicture?: string | null;
  };
  // Tag keys only (e.g. ['peace', 'strength']) - the API doesn't send each
  // tag's group or display name here.
  tags: string[];
  isLiked: boolean;
  isDownloaded: boolean;
}

// API Response structure (what the server actually returns)
export interface ApiPagination {
  hasMore: boolean;
  limit: number;
  offset: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ApiFeedListResponse {
  data: {
    feeds: Feed[];
    pagination: ApiPagination;
  };
  message: string;
  success: boolean;
}

export interface ApiTrendingFeedsResponse extends ApiResponse<{
  feeds: Feed[];
  pagination: ApiPagination;
}> {}

export interface ApiUserLikedFeedsResponse extends ApiResponse<{
  feeds: Feed[];
  pagination: ApiPagination;
}> {}

// Client-side response structure (what the app uses)
export interface FeedListResponse {
  feeds: Feed[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  nextCursor?: string;
}

export interface CreateFeedRequest {
  type?: 'general' | 'mantra' | 'ringtone' | 'wallpaper' | 'aarti' | 'bhajan' | 'thought';
  subtitle?: Record<string, string>;
  location?: string;
  allowComments?: boolean;
  allowDownloads?: boolean;
  isRepeatable?: boolean;
  url: string;
  mediaType: FeedMediaType;
  thumbnailSquareUrl?: string;
  thumbnailPortraitUrl?: string;
  duration?: number;
  tags?: string[];
}

export type FeedType = 'general' | 'mantra' | 'ringtone' | 'wallpaper' | 'aarti' | 'bhajan' | 'thought';

export interface FeedFilters {
  // Accepts a list (e.g. the Audio hub's own search bar searching across
  // ringtone+aarti+bhajan at once) alongside the existing single-value case -
  // feedService.getFeeds() joins an array with commas, matching the same
  // convention `tags` already used; feed.service.js on the backend already
  // AND-combines this with `search` either way.
  type?: FeedType | FeedType[];
  deityId?: number;
  // Only 'none' is used: the backend reads it as "carries no tag from the
  // occasion group" (the Wallpaper Hub's Wallpapers tab), regardless of any
  // other tag the feed has. It stays on `label` because `tags` can only
  // include, not exclude, and the trending/liked endpoints accept `label` but
  // not `tags`. Omitting it means "don't filter by occasion" (Status).
  label?: 'none';
  // Tag keys; matches feeds carrying ANY of them. GET /feed only - the
  // trending and liked endpoints ignore it.
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'likesCount' | 'downloadsCount' | 'sharesCount' | 'viewsCount' | 'random';
  sortOrder?: 'ASC' | 'DESC';
  createdBy?: string;
}

export interface FeedQueryParams extends FeedFilters {
  limit?: number;
  offset?: number;
}

export interface LikeFeedResponse {
  feedId: string;
  userId: string;
  created: boolean;
  message: string;
}

export interface UnlikeFeedResponse {
  feedId: string;
  userId: string;
  deleted: boolean;
  message: string;
}

export interface ShareFeedRequest {
  platform?: string;
}

export interface ShareFeedResponse {
  success: boolean;
  message: string;
}

export interface DownloadFeedResponse {
  success: boolean;
  message: string;
}

export interface ViewFeedResponse {
  success: boolean;
  message: string;
}

export interface PlayFeedResponse {
  success: boolean;
  message: string;
}

export interface TrendingFeedsResponse {
  feeds: Feed[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface PopularTag {
  tag: string;
  count: number;
}

export interface PopularTagsResponse {
  tags: PopularTag[];
}

export interface UserLikedFeedsResponse {
  feeds: Feed[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Error types
export interface FeedError {
  message: string;
  status?: number;
  code?: string;
}