import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import { Deity } from '@/types/feed';

class DeityService {
  /**
   * Get all active deities
   */
  async getDeities(isActive: boolean = true): Promise<Deity[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('isActive', String(isActive));
    const url = `${API_ENDPOINTS.DEITIES.LIST}?${queryParams.toString()}`;
    try {
      const response = await apiClient.get<{ data: Deity[] }>(url);
      return response.data;
    } catch (error) {
      console.error('❌ Deities API error:', error);
      throw error;
    }
  }

  /**
   * Get deity by ID
   */
  async getDeityById(deityId: number): Promise<Deity> {
    const url = API_ENDPOINTS.DEITIES.GET_BY_ID(deityId);
    const response = await apiClient.get<{ data: Deity }>(url);
    return response.data;
  }
}

export const deityService = new DeityService();
