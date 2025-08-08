'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import AuthService from '@/app/auth/services/authService';
import { OrderConfirmation } from '@/app/types/store/order';

/**
 * Hook for fetching order details by ID
 * 
 * @param orderId - The ID of the order to fetch
 * @returns Query result with order details
 */
export function useOrderDetails(orderId: string | undefined) {
  return useQuery<OrderConfirmation>({
    queryKey: ['orderConfirmation', orderId],
    queryFn: async () => {
      // Clear any existing guest data from sessionStorage
      ['guest_shipping_address', 'guest_billing_address', 'guest_email'].forEach(key => {
        sessionStorage.removeItem(key);
      });
      try {
        // Get auth token
        const token = AuthService.getToken();
        
        // For authenticated users, use the orders endpoint with JWT token
        // For guest users, use the guest orders endpoint
        const endpoint = token ? `om/orders/${orderId}/` : `om/guest/orders/${orderId}/`;
        
        // Set headers if authenticated
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Make API request with proper headers
        const response = await api.get(endpoint, {
          headers,
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        console.error('Error fetching order details:', error.response?.data || error.message);
        throw error;
      }
    },
    enabled: !!orderId // Only fetch if we have an orderId
  });
}
