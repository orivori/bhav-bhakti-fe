import { useI18nStore, Language } from '../stores/i18nStore';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

const translations: Record<Language, typeof en> = {
  en,
  hi,
};

/**
 * Custom hook for translations
 * Usage: const { t } = useTranslation();
 * Example: t('horoscope.title') => "Horoscope" or "राशिफल"
 */
export const useTranslation = () => {
  const { language, setLanguage, toggleLanguage } = useI18nStore();

  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    if (value === undefined || value === null) {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      return fallback || key;
    }

    return value;
  };

  return {
    t,
    language,
    setLanguage,
    toggleLanguage,
    isEnglish: language === 'en',
    isHindi: language === 'hi',
  };
};

/**
 * Get translation without hook (for use outside components)
 */
export const getTranslation = (key: string, lang: Language): string => {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  return value || key;
};

/**
 * Get all zodiac sign names in current language
 */
export const getZodiacNames = (lang: Language) => {
  return translations[lang].zodiacSigns;
};

/**
 * Get all rashi names in current language
 */
export const getRashiNames = (lang: Language) => {
  return translations[lang].rashiNames;
};