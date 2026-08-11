import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import type { ProfileData, UpdateProfileRequest } from '@/types/profile';

class ProfileService {
  async getProfile(): Promise<ProfileData> {
    const response = await apiClient.get<{ data: ProfileData }>(
      API_ENDPOINTS.USER.PROFILE
    );
    return response.data;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ProfileData> {
    const response = await apiClient.put<{ data: ProfileData }>(
      API_ENDPOINTS.USER.UPDATE_PROFILE,
      data
    );
    return response.data;
  }
}

export const profileService = new ProfileService();
