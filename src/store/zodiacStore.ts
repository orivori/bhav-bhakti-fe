import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ZodiacSign } from '@/types/zodiac';

interface ZodiacState {
  selectedZodiac: ZodiacSign | null;
  setZodiac: (sign: ZodiacSign) => Promise<void>;
  clearZodiac: () => Promise<void>;
  initializeZodiac: () => Promise<void>;
}

export const useZodiacStore = create<ZodiacState>((set) => ({
  selectedZodiac: null,

  setZodiac: async (sign: ZodiacSign) => {
    try {
      await AsyncStorage.setItem('user_zodiac', sign);
      set({ selectedZodiac: sign });
    } catch (error) {
      console.error('Failed to save zodiac:', error);
    }
  },

  clearZodiac: async () => {
    try {
      await AsyncStorage.removeItem('user_zodiac');
      set({ selectedZodiac: null });
    } catch (error) {
      console.error('Failed to clear zodiac:', error);
    }
  },

  initializeZodiac: async () => {
    try {
      const savedZodiac = await AsyncStorage.getItem('user_zodiac');
      if (savedZodiac) {
        set({ selectedZodiac: savedZodiac as ZodiacSign });
      }
    } catch (error) {
      console.error('Failed to load zodiac:', error);
    }
  },
}));
