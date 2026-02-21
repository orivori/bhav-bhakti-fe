import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'hi';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  initializeLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',

  setLanguage: async (lang: Language) => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      set({ language: lang });
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  },

  initializeLanguage: async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage === 'en' || savedLanguage === 'hi') {
        set({ language: savedLanguage });
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  },
}));
