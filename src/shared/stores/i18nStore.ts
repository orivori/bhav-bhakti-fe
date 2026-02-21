import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'hi';

interface I18nState {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'en',
      isRTL: false,

      setLanguage: (language: Language) => {
        set({
          language,
          isRTL: false, // Both English and Hindi are LTR
        });
      },

      toggleLanguage: () => {
        const currentLanguage = get().language;
        const newLanguage = currentLanguage === 'en' ? 'hi' : 'en';
        get().setLanguage(newLanguage);
      },
    }),
    {
      name: 'i18n-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);