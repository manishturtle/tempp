import { format, parseISO } from 'date-fns';

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'PPpp'); // e.g., "Apr 10, 2025, 11:44 AM"
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
