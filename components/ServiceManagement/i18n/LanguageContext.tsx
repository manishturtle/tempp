'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define language type
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (code: string) => void;
  languages: Language[];
  t: (key: string) => string;
}

// Available languages
const availableLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

// Create context with default values
const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en',
  changeLanguage: () => {},
  languages: availableLanguages,
  t: (key: string) => key,
});

// Simple translation function that works directly in this file
// This ensures we can still use translations even if languageUtils has errors
function translateKey(key: string, language: string): string {
  try {
    // This dynamic import approach helps avoid circular dependencies
    // We use a simple approach here until the languageUtils module is fully functional
    if (key.includes('.')) {
      const parts = key.split('.');
      // Define type with index signature to allow string indexing
      type TranslationObject = { [key: string]: string | TranslationObject };
      let result: TranslationObject = { 
        en: {
          app: { 
            title: 'Customer Portal',
            notification: { 
              invoice: 'New Invoice', 
              payment: 'Payment', 
              system: 'System', 
              invoiceMessage: 'New invoice created', 
              paymentMessage: 'Payment received',
              systemMessage: 'System update completed' 
            }
          },
          languages: { en: 'English', hi: 'Hindi', fr: 'French' },
          common: { search: 'Search' },
          auth: { login: 'Login', logout: 'Logout' },
          dashboard: { title: 'Dashboard' }
        },
        hi: {
          app: { 
            title: '\u0917\u094d\u0930\u093e\u0939\u0915 \u092a\u094b\u0930\u094d\u091f\u0932',
            notification: { 
              invoice: '\u0928\u092f\u093e \u091a\u093e\u0932\u093e\u0928', 
              payment: '\u092d\u0941\u0917\u0924\u093e\u0928', 
              system: '\u0938\u093f\u0938\u094d\u091f\u092e',
              invoiceMessage: '\u0928\u092f\u093e \u091a\u093e\u0932\u093e\u0928 \u092c\u0928\u093e\u092f\u093e \u0917\u092f\u093e',
              paymentMessage: '\u092d\u0941\u0917\u0924\u093e\u0928 \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u0939\u0941\u0906',
              systemMessage: '\u0938\u093f\u0938\u094d\u091f\u092e \u0905\u092a\u0921\u0947\u091f \u092a\u0942\u0930\u093e \u0939\u0941\u0906'
            }
          },
          languages: { en: '\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940', hi: '\u0939\u093f\u0928\u094d\u0926\u0940', fr: '\u092b\u094d\u0930\u0947\u0902\u091a' },
          common: { search: '\u0916\u094b\u091c' },
          auth: { login: '\u0932\u0949\u0917 \u0907\u0928', logout: '\u0932\u0949\u0917 \u0906\u0909\u091f' },
          dashboard: { title: '\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921' }
        },
        fr: {
          app: { 
            title: 'Portail Client',
            notification: { 
              invoice: 'Nouvelle Facture', 
              payment: 'Paiement', 
              system: 'Syst\u00e8me',
              invoiceMessage: 'Nouvelle facture cr\u00e9\u00e9e',
              paymentMessage: 'Paiement re\u00e7u',
              systemMessage: 'Mise \u00e0 jour du syst\u00e8me termin\u00e9e'
            }
          },
          languages: { en: 'Anglais', hi: 'Hindi', fr: 'Fran\u00e7ais' },
          common: { search: 'Rechercher' },
          auth: { login: 'Connexion', logout: 'D\u00e9connexion' },
          dashboard: { title: 'Tableau de bord' }
        }
      }[language] || { en: 'English', hi: 'Hindi', fr: 'French' };
      
      for (const part of parts) {
        if (result && typeof result === 'object' && part in result) {
          const value = result[part];
          if (typeof value === 'string' || typeof value === 'object') {
            result = value as TranslationObject;
          } else {
            return key; // Fallback to key if type is not supported
          }
        } else {
          return key; // Fallback to key if not found
        }
      }
      
      return typeof result === 'string' ? result : key;
    }
    return key;
  } catch (error) {
    console.error('Translation error:', error);
    return key; // Fallback to key on error
  }
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with default language or from localStorage
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage && availableLanguages.some(lang => lang.code === savedLanguage)) {
        setCurrentLanguage(savedLanguage);
      } else {
        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0];
        const supportedLang = availableLanguages.find(lang => lang.code === browserLang);
        if (supportedLang) {
          setCurrentLanguage(supportedLang.code);
          localStorage.setItem('language', supportedLang.code);
        }
      }

      // Set HTML dir attribute for RTL support
      const isRTL = availableLanguages.find(lang => lang.code === currentLanguage)?.rtl;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLanguage;
    }
  }, [currentLanguage]);

  // Function to change language
  const changeLanguage = (code: string) => {
    if (availableLanguages.some(lang => lang.code === code)) {
      setCurrentLanguage(code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', code);
        
        // Set HTML dir attribute for RTL support
        const isRTL = availableLanguages.find(lang => lang.code === code)?.rtl;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = code;
      }
    }
  };

  // Translation helper
  const t = (key: string) => translateKey(key, currentLanguage);

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, languages: availableLanguages, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for using language context
export const useLanguage = () => useContext(LanguageContext);
