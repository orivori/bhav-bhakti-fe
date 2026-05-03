import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';

export interface ZodiacCalculationRequest {
  dateOfBirth: string; // YYYY-MM-DD format
}

export interface ZodiacCalculationResponse {
  success: boolean;
  message: string;
  data: {
    sign: string; // Western zodiac sign (e.g., 'aries', 'taurus')
    rashi: string; // Vedic rashi in Hindi (e.g., 'मेष', 'वृषभ')
  };
}

class ProfileService {
  /**
   * Calculate zodiac sign and rashi from date of birth
   */
  async calculateZodiac(request: ZodiacCalculationRequest): Promise<ZodiacCalculationResponse> {
    console.log('🔮 Calculating zodiac for date:', request.dateOfBirth);

    const response = await apiClient.post<ZodiacCalculationResponse>(
      API_ENDPOINTS.PROFILE.CALCULATE_ZODIAC,
      request
    );

    console.log('✨ Zodiac calculation response:', {
      success: response.success,
      sign: response.data?.sign,
      rashi: response.data?.rashi
    });

    return response;
  }
}

export const profileService = new ProfileService();