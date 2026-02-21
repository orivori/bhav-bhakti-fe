import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';
import type {
  CalculateZodiacRequest,
  CalculateZodiacResponse,
  SetZodiacRequest,
  UpdatePreferencesRequest,
  TrackReadRequest,
  SubmitFeedbackRequest,
  DailyHoroscope,
  UserZodiac,
  HoroscopeReadHistory,
  HoroscopeFeedback,
  ZodiacCompatibility,
  ZodiacSign,
} from '@/types/horoscope';
import type { Language } from '@/shared/stores/i18nStore';

class HoroscopeService {
  /**
   * Calculate zodiac from birth details
   */
  async calculateZodiac(data: CalculateZodiacRequest): Promise<CalculateZodiacResponse> {
    const response = await apiClient.post<{ data: CalculateZodiacResponse }>(
      API_ENDPOINTS.HOROSCOPE.CALCULATE_ZODIAC,
      data
    );
    return response.data.data;
  }

  /**
   * Get user's zodiac profile
   */
  async getMyZodiac(): Promise<UserZodiac | null> {
    try {
      const response = await apiClient.get<{ data: { zodiac: UserZodiac } }>(
        API_ENDPOINTS.HOROSCOPE.GET_MY_ZODIAC
      );
      return response.data.data.zodiac;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // User hasn't set up zodiac yet
      }
      throw error;
    }
  }

  /**
   * Set/Update user's zodiac profile
   */
  async setMyZodiac(data: SetZodiacRequest): Promise<UserZodiac> {
    const response = await apiClient.post<{ data: { zodiac: UserZodiac } }>(
      API_ENDPOINTS.HOROSCOPE.SET_MY_ZODIAC,
      data
    );
    return response.data.data.zodiac;
  }

  /**
   * Update zodiac preferences
   */
  async updatePreferences(data: UpdatePreferencesRequest): Promise<UserZodiac> {
    const response = await apiClient.put<{ data: UserZodiac }>(
      API_ENDPOINTS.HOROSCOPE.UPDATE_PREFERENCES,
      data
    );
    return response.data.data;
  }

  /**
   * Get today's horoscope for logged-in user
   */
  async getTodayHoroscope(language?: Language, categories?: string[]): Promise<DailyHoroscope> {
    const params: any = {};
    if (language) params.language = language;
    if (categories) params.categories = categories.join(',');

    const response = await apiClient.get<{ data: { horoscope: DailyHoroscope } }>(
      API_ENDPOINTS.HOROSCOPE.TODAY,
      { params }
    );
    return response.data.data.horoscope;
  }

  /**
   * Get horoscope for specific zodiac sign (public)
   */
  async getHoroscopeBySign(
    sign: ZodiacSign,
    language?: Language,
    date?: string
  ): Promise<DailyHoroscope> {
    const params: any = {};
    if (language) params.language = language;
    if (date) params.date = date;

    const response = await apiClient.get<{ data: DailyHoroscope }>(
      API_ENDPOINTS.HOROSCOPE.BY_SIGN(sign),
      { params }
    );
    return response.data.data;
  }

  /**
   * Get horoscope for specific date
   */
  async getHoroscopeByDate(
    date: string,
    zodiacSign?: ZodiacSign,
    language?: Language
  ): Promise<DailyHoroscope> {
    const params: any = {};
    if (zodiacSign) params.zodiacSign = zodiacSign;
    if (language) params.language = language;

    const response = await apiClient.get<{ data: { horoscope: DailyHoroscope } }>(
      API_ENDPOINTS.HOROSCOPE.BY_DATE(date),
      { params }
    );
    return response.data.data.horoscope;
  }

  /**
   * Get weekly horoscope
   */
  async getWeeklyHoroscope(language?: Language): Promise<DailyHoroscope[]> {
    const params: any = {};
    if (language) params.language = language;

    const response = await apiClient.get<{ data: { horoscopes: DailyHoroscope[] } }>(
      API_ENDPOINTS.HOROSCOPE.WEEKLY,
      { params }
    );
    return response.data.data.horoscopes;
  }

  /**
   * Get horoscopes for all zodiac signs
   */
  async getAllZodiacHoroscopes(language?: Language): Promise<DailyHoroscope[]> {
    const params: any = {};
    if (language) params.language = language;

    const response = await apiClient.get<{ data: { horoscopes: DailyHoroscope[] } }>(
      API_ENDPOINTS.HOROSCOPE.ALL_SIGNS,
      { params }
    );
    return response.data.data.horoscopes;
  }

  /**
   * Track horoscope read activity
   */
  async trackRead(data: TrackReadRequest): Promise<void> {
    await apiClient.post(API_ENDPOINTS.HOROSCOPE.TRACK_READ, data);
  }

  /**
   * Submit horoscope feedback
   */
  async submitFeedback(data: SubmitFeedbackRequest): Promise<HoroscopeFeedback> {
    const response = await apiClient.post<{ data: { feedback: HoroscopeFeedback } }>(
      API_ENDPOINTS.HOROSCOPE.SUBMIT_FEEDBACK,
      data
    );
    return response.data.data.feedback;
  }

  /**
   * Get user's reading history
   */
  async getHistory(limit: number = 30, offset: number = 0): Promise<HoroscopeReadHistory[]> {
    const response = await apiClient.get<{ data: { history: HoroscopeReadHistory[] } }>(
      API_ENDPOINTS.HOROSCOPE.HISTORY,
      { params: { limit, offset } }
    );
    return response.data.data.history;
  }

  /**
   * Get zodiac compatibility
   */
  async getCompatibility(sign1: ZodiacSign, sign2: ZodiacSign): Promise<ZodiacCompatibility> {
    const response = await apiClient.get<{ data: ZodiacCompatibility }>(
      API_ENDPOINTS.HOROSCOPE.COMPATIBILITY,
      { params: { sign1, sign2 } }
    );
    return response.data.data;
  }
}

export const horoscopeService = new HoroscopeService();