import enTranslations from './translations/en';
import hiTranslations from './translations/hi';
import frTranslations from './translations/fr';

export interface TranslationRecord {
  [key: string]: string | TranslationRecord;
}

// Translation resources
const resources: Record<string, TranslationRecord> = {
  en: enTranslations,
  hi: hiTranslations,
  fr: frTranslations,
};

/**
 * Get translation for a key in specified language
 * Uses dot notation for nested keys (e.g., 'app.title')
 */
export function getTranslation(key: string, language: string): string {
  try {
    // Default to English if language not found
    const translations = resources[language] || resources.en;
    
    // Handle nested keys with dot notation
    const keys = key.split('.');
    let result: any = translations;
    
    // First attempt to get from the specified language
    for (const k of keys) {
      if (!result || typeof result !== 'object') {
        break;
      }
      result = result[k];
    }
    
    // If we got a string result, return it
    if (typeof result === 'string') {
      return result;
    }
    
    // If we didn't get a result or it's not a string, try English fallback
    if (language !== 'en') {
      let fallback: any = resources.en;
      for (const k of keys) {
        if (!fallback || typeof fallback !== 'object') {
          break;
        }
        fallback = fallback[k];
      }
      
      if (typeof fallback === 'string') {
        return fallback;
      }
    }
    
    // If all else fails, return the key
    console.warn(`Translation key not found: ${key}`);
    return key;
  } catch (error) {
    console.error('Translation error:', error);
    return key; // Return the key as fallback
  }
}

/**
 * Format a string with variables
 * Example: formatString("Hello {name}", { name: "World" }) => "Hello World"
 */
export function formatString(str: string, variables: Record<string, string | number>): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{${key}}`, 'g'), String(value)),
    str
  );
}

/**
 * Helper for translating with variable substitution
 */
export function translateWithVars(
  key: string,
  language: string,
  variables: Record<string, string | number>
): string {
  const translation = getTranslation(key, language);
  return formatString(translation, variables);
}
