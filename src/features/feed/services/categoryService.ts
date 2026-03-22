import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import { Category } from '@/types/feed';

interface CategoryFeedsResponse {
  feeds: any[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  category: {
    id: number;
    name: string;
    displayName: Category['displayName'];
    type: string;
  };
}

interface CategoryFeedsParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class CategoryService {
  /**
   * Get categories by type
   */
  async getCategoriesByType(type: string): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('type', type);
    const url = `${API_ENDPOINTS.CATEGORIES.LIST}?${queryParams.toString()}`;
    try {
      const response = await apiClient.get<{ data: Category[] }>(url);
      return response.data;
    } catch (error) {
      console.error('❌ Categories API error:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: number): Promise<Category> {
    const url = API_ENDPOINTS.CATEGORIES.GET_BY_ID(categoryId);
    const response = await apiClient.get<{ data: Category }>(url);
    return response.data;
  }

  /**
   * Get feeds by category with pagination
   */
  async getCategoryFeeds(
    categoryId: number,
    params: CategoryFeedsParams = {}
  ): Promise<CategoryFeedsResponse> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `${API_ENDPOINTS.CATEGORIES.FEEDS(categoryId)}?${queryParams.toString()}`;
    const response = await apiClient.get<{ data: CategoryFeedsResponse }>(url);
    return response.data;
  }

  /**
   * Get mantra categories (convenience method)
   */
  async getMantraCategories(): Promise<Category[]> {
    return this.getCategoriesByType('mantra');
  }
}

export const categoryService = new CategoryService();
