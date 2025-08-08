'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { 
  PaymentMethod, 
  SavePaymentMethodPayload, 
  PaymentWalletBalance, 
  PaymentLoyaltyBalance 
} from '@/app/types/store/checkout';

/**
 * Hook for fetching available payment methods
 * @param clientId - The client ID to fetch payment methods for
 * @returns Query result with payment methods data
 */
export function usePaymentMethods(clientId: string | undefined) {
  return useQuery<PaymentMethod[]>({
    queryKey: ['paymentMethods', clientId],
    queryFn: async () => {
      const response = await api.get('/om/checkout/payment-methods/');
      return response.data;
    },
    enabled: !!clientId
  });
}

/**
 * Hook for saving the selected payment method
 * @returns Mutation result for saving payment method
 */
export function useSavePaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: SavePaymentMethodPayload) => {
      const response = await api.post('/om/checkout/payment-method/', payload);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });
}

/**
 * Hook for fetching wallet balance
 * @param userId - The user ID to fetch wallet balance for
 * @param enabled - Whether this query should be enabled
 * @returns Query result with wallet balance data
 */
export function useWalletBalance(userId: string | undefined, enabled: boolean) {
  return useQuery<PaymentWalletBalance>({
    queryKey: ['walletBalance', userId],
    queryFn: async () => {
      const response = await api.get(`/om/wallet/${userId}/balance/`);
      return response.data;
    },
    enabled: !!userId && enabled
  });
}

/**
 * Hook for fetching loyalty points balance
 * @param userId - The user ID to fetch loyalty points for
 * @param enabled - Whether this query should be enabled
 * @returns Query result with loyalty points data
 */
export function useLoyaltyPointsBalance(userId: string | undefined, enabled: boolean) {
  return useQuery<PaymentLoyaltyBalance>({
    queryKey: ['loyaltyBalance', userId],
    queryFn: async () => {
      const response = await api.get(`/om/loyalty/${userId}/points/`);
      return response.data;
    },
    enabled: !!userId && enabled
  });
}
