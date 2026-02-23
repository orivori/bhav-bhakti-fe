export interface FeedMedia {
  id: number;
  type: 'image' | 'video' | 'audio' | 'image_audio';
  mediaUrl: string;
  audioUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null; // seconds
  width?: number;
  height?: number;
  order: number;
  metadata?: Record<string, any> | null;
}

export interface Feed {
  id: number;
  userId: number;
  caption?: string;
  location?: string;
  type: 'general' | 'mantra' | 'ringtone' | 'wallpaper';
  mediaCount: number;
  likesCount: number;
  commentsCount: number;
  downloadsCount: number;
  sharesCount: number;
  viewsCount: number;
  allowComments: boolean;
  allowDownloads: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    profilePicture?: string | null;
  };
  tags: string[];
  media: FeedMedia[];
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
  type?: 'general' | 'mantra' | 'ringtone' | 'wallpaper';
  caption?: string;
  location?: string;
  allowComments?: boolean;
  allowDownloads?: boolean;
  media: {
    type: 'image' | 'video' | 'audio' | 'image_audio';
    mediaUrl: string;
    audioUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    metadata?: Record<string, any>;
  }[];
  tags?: string[];
}

export interface FeedFilters {
  type?: 'image' | 'video';
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'likesCount' | 'downloadsCount' | 'sharesCount' | 'viewsCount';
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