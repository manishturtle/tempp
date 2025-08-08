/**
 * Utility functions shared across shipping zone components
 */

/**
 * Truncates text with ellipsis if it exceeds maxLength
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 15)
 * @returns Truncated text with ellipsis or original text if short enough
 */
export const truncateText = (text: string, maxLength = 15): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};
