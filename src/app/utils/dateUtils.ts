/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format a date string to DD/MM/YYYY format
 * @param dateString - ISO date string or any valid date string
 * @returns Formatted date string in DD/MM/YYYY format or 'N/A' if invalid
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Format a date string to DD/MM/YYYY HH:MM format
 * @param dateString - ISO date string or any valid date string
 * @returns Formatted date string in DD/MM/YYYY HH:MM format or 'N/A' if invalid
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'N/A';
  }
};
