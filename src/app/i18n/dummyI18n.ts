// A simple dummy implementation to replace i18next
// This file doesn't rely on any external packages

// Export a dummy object to prevent import errors
const dummyI18n = {
  changeLanguage: (lang: string) => {},
  language: 'en'
};

export default dummyI18n;
