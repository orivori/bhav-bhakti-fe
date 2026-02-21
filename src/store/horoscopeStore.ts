import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserZodiac, DailyHoroscope, ZodiacSign } from '@/types/horoscope';

interface HoroscopeState {
  // User's zodiac profile
  userZodiac: UserZodiac | null;

  // Currently selected zodiac (for viewing others' horoscopes)
  selectedZodiacSign: ZodiacSign | null;

  // Cached horoscopes
  todayHoroscope: DailyHoroscope | null;
  weeklyHoroscopes: DailyHoroscope[];
  allSignsHoroscopes: DailyHoroscope[];

  // UI State
  isLoadingZodiac: boolean;
  isLoadingHoroscope: boolean;
  error: string | null;

  // Actions
  setUserZodiac: (zodiac: UserZodiac | null) => void;
  setSelectedZodiacSign: (sign: ZodiacSign | null) => void;
  setTodayHoroscope: (horoscope: DailyHoroscope | null) => void;
  setWeeklyHoroscopes: (horoscopes: DailyHoroscope[]) => void;
  setAllSignsHoroscopes: (horoscopes: DailyHoroscope[]) => void;
  setIsLoadingZodiac: (loading: boolean) => void;
  setIsLoadingHoroscope: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCache: () => void;
  reset: () => void;
}

const initialState = {
  userZodiac: null,
  selectedZodiacSign: null,
  todayHoroscope: null,
  weeklyHoroscopes: [],
  allSignsHoroscopes: [],
  isLoadingZodiac: false,
  isLoadingHoroscope: false,
  error: null,
};

export const useHoroscopeStore = create<HoroscopeState>()(
  persist(
    (set) => ({
      ...initialState,

      setUserZodiac: (zodiac) => set({ userZodiac: zodiac }),

      setSelectedZodiacSign: (sign) => set({ selectedZodiacSign: sign }),

      setTodayHoroscope: (horoscope) => set({ todayHoroscope: horoscope }),

      setWeeklyHoroscopes: (horoscopes) => set({ weeklyHoroscopes: horoscopes }),

      setAllSignsHoroscopes: (horoscopes) => set({ allSignsHoroscopes: horoscopes }),

      setIsLoadingZodiac: (loading) => set({ isLoadingZodiac: loading }),

      setIsLoadingHoroscope: (loading) => set({ isLoadingHoroscope: loading }),

      setError: (error) => set({ error }),

      clearCache: () =>
        set({
          todayHoroscope: null,
          weeklyHoroscopes: [],
          allSignsHoroscopes: [],
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'horoscope-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userZodiac: state.userZodiac,
        selectedZodiacSign: state.selectedZodiacSign,
        // Don't persist horoscopes as they're date-specific
      }),
    }
  )
);