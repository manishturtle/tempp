import { useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';

/**
 * Query key for TanStack Query
 */
export const CUSTOMER_GROUP_SELLING_CHANNEL_KEY = 'customerGroupSellingChannel';

/**
 * Params for fetching a CustomerGroupSellingChannel
 */
export interface CustomerGroupSellingChannelParams {
  customerGroupId: string | number;
  sellingChannelName: string;
}

/**
 * Response type for CustomerGroupSellingChannel API
 */
export interface CustomerGroupSellingChannelResponse {
  id: number;
  customer_group_id: number;
  customer_group_name: string;
  selling_channel_id: number;
  selling_channel_name: string;
  selling_channel_code: string;
  status: string;
  segment_name: string;
}

/**
 * Fetches a CustomerGroupSellingChannel by customer group ID and selling channel name
 */
export async function fetchCustomerGroupSellingChannel(params: CustomerGroupSellingChannelParams): Promise<CustomerGroupSellingChannelResponse> {
  const { customerGroupId, sellingChannelName } = params;
  const url = `/customer-group-selling-channel-filtered/?customer_group_id=${customerGroupId}&selling_channel_name=${encodeURIComponent(sellingChannelName)}`;
  const response = await api.get(url);
  return response.data;
}

/**
 * React hook to fetch CustomerGroupSellingChannel
 */
export function useCustomerGroupSellingChannel(params: CustomerGroupSellingChannelParams) {
  return useQuery<CustomerGroupSellingChannelResponse, Error>({
    queryKey: [CUSTOMER_GROUP_SELLING_CHANNEL_KEY, params],
    queryFn: () => fetchCustomerGroupSellingChannel(params),
    enabled: Boolean(params.customerGroupId && params.sellingChannelName),
  });
}
