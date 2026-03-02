import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'hi' | 'gu' | 'bn';

interface I18nState {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  getLanguageLabel: (lang: Language) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'hi', // Default to Hindi as requested
      isRTL: false,

      setLanguage: (language: Language) => {
        set({
          language,
          isRTL: false, // All supported languages are LTR
        });
      },

      toggleLanguage: () => {
        const currentLanguage = get().language;
        // Cycle through languages: hi -> en -> gu -> bn -> hi
        const languageCycle: Language[] = ['hi', 'en', 'gu', 'bn'];
        const currentIndex = languageCycle.indexOf(currentLanguage);
        const nextIndex = (currentIndex + 1) % languageCycle.length;
        get().setLanguage(languageCycle[nextIndex]);
      },

      getLanguageLabel: (lang: Language) => {
        switch (lang) {
          case 'hi': return 'हिंदी';
          case 'en': return 'English';
          case 'gu': return 'ગુજરાતી';
          case 'bn': return 'বাংলা';
          default: return 'हिंदी';
        }
      },
    }),
    {
      name: 'i18n-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);