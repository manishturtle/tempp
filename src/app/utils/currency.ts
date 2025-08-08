/**
 * Utilities for currency formatting and conversion
 */

/**
 * Formats a number as currency with the specified locale and currency code
 * 
 * @param amount - The amount to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param currencyCode - The currency code to use (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  locale = 'en-IN',
  currencyCode = 'INR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Parses a currency string back to a number
 * 
 * @param currencyString - The currency string to parse
 * @returns Parsed number value
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbol and non-numeric characters (except for decimal point)
  const numericString = currencyString.replace(/[^0-9.]/g, '');
  return parseFloat(numericString);
};
