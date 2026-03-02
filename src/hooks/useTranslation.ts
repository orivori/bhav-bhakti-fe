import { useI18nStore } from '@/shared/stores/i18nStore';
import enTranslations from '@/locales/en.json';
import hiTranslations from '@/locales/hi.json';
import guTranslations from '@/locales/gu.json';
import bnTranslations from '@/locales/bn.json';

type TranslationKey = string;

const translations = {
  en: enTranslations,
  hi: hiTranslations,
  gu: guTranslations,
  bn: bnTranslations,
};

export function useTranslation() {
  const { language, setLanguage, toggleLanguage } = useI18nStore();

  const t = (key: TranslationKey): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English if translation not found
        value = translations['en'];
        for (const fk of keys) {
          value = value?.[fk];
          if (value === undefined) {
            return key; // Return key if not found in any language
          }
        }
        break;
      }
    }

    return value as string;
  };

  return { t, language, setLanguage, toggleLanguage };
}
