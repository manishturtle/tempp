import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { 
  PaymentMethod,
  PaginatedPaymentMethodResponse,
  PaymentMethodStatistics
} from '@/app/types/admin/paymentMethod';
import { getAuthHeaders } from '@/app/hooks/api/auth';

/**
 * Hook to fetch payment methods with optional filtering
 */
export const usePaymentMethods = (params?: { 
  is_active?: boolean;
  payment_type?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<PaginatedPaymentMethodResponse>({
    queryKey: ['payment-methods', params],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.paymentMethods.list(params), { 
        headers: getAuthHeaders() 
      });
      return data;
    },
  });
};

/**
 * Hook to fetch a single payment method by ID
 */
export const usePaymentMethod = (id: number) => {
  return useQuery<PaymentMethod>({
    queryKey: ['payment-method', id],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.paymentMethods.detail(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to fetch payment method statistics
 */
export const usePaymentMethodStatistics = () => {
  return useQuery<PaymentMethodStatistics>({
    queryKey: ['payment-method-statistics'],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.paymentMethods.statistics, {
        headers: getAuthHeaders()
      });
      return data;
    },
  });
};

/**
 * Hook to create a new payment method
 */
export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentMethodData: Partial<PaymentMethod>) => {
      const { data } = await api.post(apiEndpoints.paymentMethods.create, paymentMethodData, {
        headers: getAuthHeaders()
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-statistics'] });
    },
  });
};

/**
 * Hook to update an existing payment method
 */
export const useUpdatePaymentMethod = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentMethodData: Partial<PaymentMethod>) => {
      const { data } = await api.put(apiEndpoints.paymentMethods.update(id), paymentMethodData, {
        headers: getAuthHeaders()
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-method', id] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-statistics'] });
    },
  });
};

/**
 * Hook to delete a payment method
 */
export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(apiEndpoints.paymentMethods.delete(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['payment-method-statistics'] });
    },
  });
};
