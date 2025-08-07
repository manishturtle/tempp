'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { GuestOrderTracking } from '@/app/types/store/order';

/**
 * Hook for fetching order details by guest token
 * 
 * @param guestToken - The guest token for tracking the order
 * @returns Query result with guest order details
 */
export function useGuestOrderDetails(guestToken: string | undefined) {
  return useQuery<GuestOrderTracking>({
    queryKey: ['guestOrder', guestToken],
    queryFn: async () => {
      try {
        const response = await api.get(`/om/guest/order/${guestToken}/`, {
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        console.error('Error fetching guest order details:', error.response?.data || error.message);
        throw error;
      }
    },
    enabled: !!guestToken // Only fetch if we have a guest token
  });
}
