import { useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';

/**
 * Payment method type as returned by the store-payment-methods API.
 */
export interface StorePaymentMethod {
  id: number;
  name: string;
  payment_type: string;
  payment_type_display: string;
  is_active: boolean;
  is_visible_on_store: boolean;
  description: string;
  customer_group_selling_channels: number[];
  gateway_details: Record<string, unknown> | null;
  bank_transfer_details: Record<string, unknown> | null;
  cash_offline_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Query params for fetching store payment methods.
 */
export interface StorePaymentMethodsQueryParams {
  segmentName?: string;
}

/**
 * Fetches store payment methods from the backend, optionally filtered by segment name.
 * @param tenantSlug - The tenant identifier for multi-tenancy.
 * @param params - Optional query params (e.g., segment name)
 * @returns List of payment methods
 */
// Service function for fetching payment methods
export const fetchStorePaymentMethods = async (
  tenantSlug: string,
  params?: StorePaymentMethodsQueryParams
): Promise<StorePaymentMethod[]> => {
  const query: Record<string, string> = {};
  if (params?.segmentName) {
    query.segment_name = params.segmentName;
  }
  const search = new URLSearchParams(query).toString();
  const url = `/store-payment-methods/${search ? `?${search}` : ''}`;
  const response = await api.get(url);
  return response.data as StorePaymentMethod[];
};

// Hook
export function useStorePaymentMethods(
  tenantSlug: string,
  params?: StorePaymentMethodsQueryParams
) {
  return useQuery<StorePaymentMethod[], Error>({
    queryKey: ['storePaymentMethods', tenantSlug, params?.segmentName],
    queryFn: () => fetchStorePaymentMethods(tenantSlug, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(tenantSlug),
  });
}

