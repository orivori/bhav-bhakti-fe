import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '@/locales/en.json';
import hiTranslation from '@/locales/hi.json';
import guTranslation from '@/locales/gu.json';
import bnTranslation from '@/locales/bn.json';

import { translations as playerTranslations } from './translations';
import { useI18nStore } from '@/shared/stores/i18nStore';

// Two namespaces because Mechanism A (`translation`) and Mechanism B
// (`player`) both have a top-level `mantras` key of different shapes
// (object vs. string) - a flat merge would silently collide.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation, player: playerTranslations.en },
    hi: { translation: hiTranslation, player: playerTranslations.hi },
    gu: { translation: guTranslation, player: playerTranslations.gu },
    bn: { translation: bnTranslation, player: playerTranslations.bn },
  },
  ns: ['translation', 'player'],
  defaultNS: 'translation',
  lng: useI18nStore.getState().language,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
