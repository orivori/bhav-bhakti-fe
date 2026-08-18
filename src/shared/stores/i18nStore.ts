import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'hi' | 'gu' | 'bn';

// Languages actually offered in language-selection UI (e.g. profile.tsx's
// picker) - a subset of Language. Gujarati/Bengali stay in the type/store/
// resources (translation coverage is real, just partial - see CLAUDE.md),
// they're just not selectable for MVP. Single source of truth so a future
// picker can't independently drift on which languages are "live".
export const SELECTABLE_LANGUAGES: Language[] = ['hi', 'en'];

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