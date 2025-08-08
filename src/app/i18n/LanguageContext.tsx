'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from './languageUtils';
import i18n from './i18n-config';

type LanguageContextType = {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
  languages: { code: string; name: string }[];
  t: (key: string, options?: any) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation('common');
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || 'en');

  useEffect(() => {
    // Initialize with the current language from i18next or localStorage
    const storedLang = localStorage.getItem('appLanguage');
    if (storedLang) {
      setCurrentLanguage(storedLang);
      i18n.changeLanguage(storedLang);
      
      // Set document language and direction
      document.documentElement.lang = storedLang;
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const changeLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    
    // Change i18next language
    i18n.changeLanguage(lang).catch(error => {
      console.error('Error changing language:', error);
      // Fallback to English if there's an error
      if (lang !== 'en') {
        i18n.changeLanguage('en');
      }
    });
    
    // Save to localStorage
    localStorage.setItem('appLanguage', lang);
    
    // Set document language attribute
    document.documentElement.lang = lang;
    
    // Apply RTL direction for Arabic
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, languages, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
