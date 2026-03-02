import { translations, Language, TranslationKey } from './translations';
import { useI18nStore } from '@/shared/stores/i18nStore';

export function useTranslation() {
  const { language: currentLanguage, setLanguage, toggleLanguage, getLanguageLabel } = useI18nStore();

  const t = (key: TranslationKey): string => {
    return translations[currentLanguage][key] || translations.en[key];
  };

  const changeLanguage = (language: Language) => {
    setLanguage(language);
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    setLanguage,
    toggleLanguage,
    getLanguageLabel,
    availableLanguages: Object.keys(translations) as Language[],
  };
}