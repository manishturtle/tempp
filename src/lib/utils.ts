import { useEffect, useState } from 'react';

// Custom hook to safely handle client-side only code
export function useClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

// Safely format dates to prevent hydration mismatches
export function formatDate(date: Date): string {
  if (typeof window === 'undefined') {
    // On server, return ISO string for consistency
    return date.toISOString();
  }
  // On client, can use locale-specific formatting
  return date.toLocaleDateString();
}

// Helper to check if code is running on client
export const isClient = typeof window !== 'undefined';
export const isServer = !isClient;