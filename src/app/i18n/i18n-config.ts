'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { languages } from './languageUtils';

// Get supported language codes from your existing setup
const supportedLanguages = languages.map(lang => lang.code);

i18n
  // Load translations using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    debug: process.env.NODE_ENV === 'development',
    
    defaultNS: 'common',
    ns: ['common'],
    
    interpolation: {
      escapeValue: false, // Not needed for React as it escapes by default
    },
    
    // Backend configuration for loading translations
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Detection options
    detection: {
      // Use the same localStorage key that your existing implementation uses
      lookupLocalStorage: 'appLanguage',
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false, // Set to false to avoid issues with SSR
    }
  });

export default i18n;
