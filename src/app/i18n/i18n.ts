// Simple implementation that doesn't rely on external packages
// This replaces the need for i18next and related packages

// Export a dummy object that mimics the basic i18next interface
const dummyI18n = {
  changeLanguage: (lang: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appLanguage', lang);
    }
  },
  language: typeof window !== 'undefined' 
    ? localStorage.getItem('appLanguage') || navigator.language.split('-')[0] || 'en'
    : 'en'
};

export default dummyI18n;
