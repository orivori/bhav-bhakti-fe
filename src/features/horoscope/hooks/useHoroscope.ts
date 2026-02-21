import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { horoscopeService } from '../services/horoscopeService';
import { useHoroscopeStore } from '@/store/horoscopeStore';
import { useI18nStore } from '@/shared/stores/i18nStore';
import type {
  CalculateZodiacRequest,
  SetZodiacRequest,
  UpdatePreferencesRequest,
  TrackReadRequest,
  SubmitFeedbackRequest,
  ZodiacSign,
} from '@/types/horoscope';

// Query Keys
export const horoscopeKeys = {
  all: ['horoscope'] as const,
  myZodiac: () => [...horoscopeKeys.all, 'myZodiac'] as const,
  today: (language: string) => [...horoscopeKeys.all, 'today', language] as const,
  bySign: (sign: ZodiacSign, language: string) =>
    [...horoscopeKeys.all, 'bySign', sign, language] as const,
  byDate: (date: string, sign?: ZodiacSign, language?: string) =>
    [...horoscopeKeys.all, 'byDate', date, sign, language] as const,
  weekly: (language: string) => [...horoscopeKeys.all, 'weekly', language] as const,
  allSigns: (language: string) => [...horoscopeKeys.all, 'allSigns', language] as const,
  history: () => [...horoscopeKeys.all, 'history'] as const,
  compatibility: (sign1: ZodiacSign, sign2: ZodiacSign) =>
    [...horoscopeKeys.all, 'compatibility', sign1, sign2] as const,
};

/**
 * Get user's zodiac profile
 */
export const useMyZodiac = () => {
  const { setUserZodiac, setIsLoadingZodiac } = useHoroscopeStore();

  return useQuery({
    queryKey: horoscopeKeys.myZodiac(),
    queryFn: async () => {
      setIsLoadingZodiac(true);
      try {
        const zodiac = await horoscopeService.getMyZodiac();
        setUserZodiac(zodiac);
        return zodiac;
      } finally {
        setIsLoadingZodiac(false);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Calculate zodiac from birth details
 */
export const useCalculateZodiac = () => {
  return useMutation({
    mutationFn: (data: CalculateZodiacRequest) => horoscopeService.calculateZodiac(data),
  });
};

/**
 * Set/Update user's zodiac profile
 */
export const useSetMyZodiac = () => {
  const queryClient = useQueryClient();
  const { setUserZodiac } = useHoroscopeStore();

  return useMutation({
    mutationFn: (data: SetZodiacRequest) => horoscopeService.setMyZodiac(data),
    onSuccess: (zodiac) => {
      setUserZodiac(zodiac);
      queryClient.invalidateQueries({ queryKey: horoscopeKeys.myZodiac() });
    },
  });
};

/**
 * Update zodiac preferences
 */
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  const { setUserZodiac } = useHoroscopeStore();

  return useMutation({
    mutationFn: (data: UpdatePreferencesRequest) => horoscopeService.updatePreferences(data),
    onSuccess: (zodiac) => {
      setUserZodiac(zodiac);
      queryClient.invalidateQueries({ queryKey: horoscopeKeys.myZodiac() });
    },
  });
};

/**
 * Get today's horoscope for user
 */
export const useTodayHoroscope = (categories?: string[]) => {
  const { language } = useI18nStore();
  const { setTodayHoroscope, setIsLoadingHoroscope } = useHoroscopeStore();

  return useQuery({
    queryKey: horoscopeKeys.today(language),
    queryFn: async () => {
      setIsLoadingHoroscope(true);
      try {
        const horoscope = await horoscopeService.getTodayHoroscope(language, categories);
        setTodayHoroscope(horoscope);
        return horoscope;
      } finally {
        setIsLoadingHoroscope(false);
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Get horoscope for specific zodiac sign
 */
export const useHoroscopeBySign = (sign: ZodiacSign, date?: string) => {
  const { language } = useI18nStore();

  return useQuery({
    queryKey: horoscopeKeys.bySign(sign, language),
    queryFn: () => horoscopeService.getHoroscopeBySign(sign, language, date),
    enabled: !!sign,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Get horoscope by date
 */
export const useHoroscopeByDate = (date: string, zodiacSign?: ZodiacSign) => {
  const { language } = useI18nStore();

  return useQuery({
    queryKey: horoscopeKeys.byDate(date, zodiacSign, language),
    queryFn: () => horoscopeService.getHoroscopeByDate(date, zodiacSign, language),
    enabled: !!date,
    staleTime: 1000 * 60 * 60, // 1 hour for historical data
  });
};

/**
 * Get weekly horoscope
 */
export const useWeeklyHoroscope = () => {
  const { language } = useI18nStore();
  const { setWeeklyHoroscopes, setIsLoadingHoroscope } = useHoroscopeStore();

  return useQuery({
    queryKey: horoscopeKeys.weekly(language),
    queryFn: async () => {
      setIsLoadingHoroscope(true);
      try {
        const horoscopes = await horoscopeService.getWeeklyHoroscope(language);
        setWeeklyHoroscopes(horoscopes);
        return horoscopes;
      } finally {
        setIsLoadingHoroscope(false);
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Get all zodiac signs horoscopes
 */
export const useAllZodiacHoroscopes = () => {
  const { language } = useI18nStore();
  const { setAllSignsHoroscopes, setIsLoadingHoroscope } = useHoroscopeStore();

  return useQuery({
    queryKey: horoscopeKeys.allSigns(language),
    queryFn: async () => {
      setIsLoadingHoroscope(true);
      try {
        const horoscopes = await horoscopeService.getAllZodiacHoroscopes(language);
        setAllSignsHoroscopes(horoscopes);
        return horoscopes;
      } finally {
        setIsLoadingHoroscope(false);
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Track horoscope read
 */
export const useTrackRead = () => {
  return useMutation({
    mutationFn: (data: TrackReadRequest) => horoscopeService.trackRead(data),
  });
};

/**
 * Submit horoscope feedback
 */
export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: (data: SubmitFeedbackRequest) => horoscopeService.submitFeedback(data),
  });
};

/**
 * Get reading history
 */
export const useReadingHistory = (limit?: number, offset?: number) => {
  return useQuery({
    queryKey: horoscopeKeys.history(),
    queryFn: () => horoscopeService.getHistory(limit, offset),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get zodiac compatibility
 */
export const useCompatibility = (sign1: ZodiacSign, sign2: ZodiacSign) => {
  return useQuery({
    queryKey: horoscopeKeys.compatibility(sign1, sign2),
    queryFn: () => horoscopeService.getCompatibility(sign1, sign2),
    enabled: !!sign1 && !!sign2,
    staleTime: Infinity, // Compatibility never changes
  });
};