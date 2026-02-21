import { Language } from '@/shared/stores/i18nStore';

export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type RashiName =
  | 'mesh'
  | 'vrishabh'
  | 'mithun'
  | 'kark'
  | 'singh'
  | 'kanya'
  | 'tula'
  | 'vrishchik'
  | 'dhanu'
  | 'makar'
  | 'kumbh'
  | 'meen';

export type HoroscopePeriod = 'daily' | 'weekly' | 'monthly';

export type HoroscopeCategory = 'love' | 'career' | 'health' | 'finance' | 'family';

export interface ZodiacInfo {
  id: string;
  zodiacSign: ZodiacSign;
  rashiName: RashiName;
  name: {
    en: string;
    hi: string;
  };
  symbol: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  dates: string;
  rulingPlanet: string;
  icon: string;
  color: string;
}

export interface DailyHoroscope {
  id: string;
  date: string;
  zodiacSign: ZodiacSign;
  language: Language;
  overallPrediction: string;
  luckyNumber: number[];
  luckyColor: string[];
  luckyTime: string;
  love: string | null;
  career: string | null;
  health: string | null;
  finance: string | null;
  family: string | null;
  loveRating: number | null;
  careerRating: number | null;
  healthRating: number | null;
  financeRating: number | null;
  source: 'api' | 'manual' | 'default';
  isActive: boolean;
  publishedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserZodiac {
  id: string;
  userId: string;
  zodiacSign: ZodiacSign;
  rashiName: RashiName;
  timeOfBirth?: string;
  placeOfBirth?: string;
  latitude?: number;
  longitude?: number;
  moonSign?: string;
  ascendant?: string;
  nakshatra?: string;
  isAutoCalculated: boolean;
  preferredLanguage: Language;
  notificationEnabled: boolean;
  notificationTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoroscopeReadHistory {
  id: string;
  userId: string;
  horoscopeId: string;
  readAt: string;
  deviceType: string;
  categories: HoroscopeCategory[];
  timeSpent: number;
  createdAt: string;
}

export interface HoroscopeFeedback {
  id: string;
  userId: string;
  horoscopeId: string;
  rating: number;
  wasAccurate: boolean;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZodiacCompatibility {
  zodiacSign1: ZodiacSign;
  zodiacSign2: ZodiacSign;
  compatibility: 'high' | 'good' | 'neutral' | 'challenging';
  score: number;
  element1: string;
  element2: string;
}

export interface CalculateZodiacRequest {
  dateOfBirth: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
  latitude?: number;
  longitude?: number;
}

export interface CalculateZodiacResponse {
  zodiacSign: ZodiacSign;
  rashiName: RashiName;
  element: string;
  rulingPlanet: string;
  symbol: string;
  isAutoCalculated: boolean;
  calculationType: string;
}

export interface SetZodiacRequest {
  dateOfBirth?: string;
  zodiacSign?: ZodiacSign;
  rashiName?: RashiName;
  timeOfBirth?: string;
  placeOfBirth?: string;
  latitude?: number;
  longitude?: number;
  preferredLanguage?: Language;
  notificationEnabled?: boolean;
  notificationTime?: string;
}

export interface UpdatePreferencesRequest {
  preferredLanguage?: Language;
  notificationEnabled?: boolean;
  notificationTime?: string;
}

export interface TrackReadRequest {
  horoscopeId: string;
  deviceType?: string;
  categories?: HoroscopeCategory[];
  timeSpent?: number;
}

export interface SubmitFeedbackRequest {
  horoscopeId: string;
  rating: number;
  wasAccurate?: boolean;
  feedback?: string;
}