import { format, formatDistance, formatRelative, isDate } from 'date-fns';
import { enUS, hi } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import i18n from '@/app/i18n/i18n-config';

// Map of supported locales to date-fns locale objects
const locales: { [key: string]: Locale } = {
  en: enUS,
  hi: hi,
};

/**
 * Format a date according to the current locale
 * @param date Date to format
 * @param formatStr Format string (date-fns format)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, formatStr: string = 'PP'): string {
  const dateObj = isDate(date) ? date : new Date(date);
  const locale = locales[i18n.language] || locales.en;
  
  return format(dateObj, formatStr, { locale });
}

/**
 * Format a relative date according to the current locale
 * @param date Date to format
 * @param baseDate Base date to compare against (defaults to now)
 * @returns Formatted relative date string
 */
export function formatRelativeDate(date: Date | string | number, baseDate: Date = new Date()): string {
  const dateObj = isDate(date) ? date : new Date(date);
  const locale = locales[i18n.language] || locales.en;
  
  return formatRelative(dateObj, baseDate, { locale });
}

/**
 * Format a time distance according to the current locale
 * @param date Date to format
 * @param baseDate Base date to compare against (defaults to now)
 * @returns Formatted time distance string
 */
export function formatTimeDistance(date: Date | string | number, baseDate: Date = new Date()): string {
  const dateObj = isDate(date) ? date : new Date(date);
  const locale = locales[i18n.language] || locales.en;
  
  return formatDistance(dateObj, baseDate, { locale, addSuffix: true });
}

/**
 * Format a number according to the current locale
 * @param num Number to format
 * @param options Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(i18n.language, options).format(num);
}

/**
 * Format a currency amount according to the current locale
 * @param amount Amount to format
 * @param currency Currency code (e.g., 'USD', 'INR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
