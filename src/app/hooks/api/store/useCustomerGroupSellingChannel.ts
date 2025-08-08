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
  customerGroupId?: string | number; // Optional parameter for customer group ID
  sellingChannelId: string | number;
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
  const { customerGroupId, sellingChannelId } = params;
  
  // Build URL with required parameters
  let url = `/customer-group-selling-channel-filtered/?selling_channel_id=${encodeURIComponent(sellingChannelId)}`;
  
  // Add customer_group_id if available and not empty
  if (customerGroupId !== undefined && customerGroupId !== null && customerGroupId !== '') {
    url += `&customer_group_id=${customerGroupId}`;
  }
  
  const response = await api.get(url);
  return response.data;
}

/**
 * React hook to fetch CustomerGroupSellingChannel
 */
export function useCustomerGroupSellingChannel(params: CustomerGroupSellingChannelParams & { enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;
  
  return useQuery<CustomerGroupSellingChannelResponse, Error>({
    queryKey: [CUSTOMER_GROUP_SELLING_CHANNEL_KEY, queryParams],
    queryFn: () => fetchCustomerGroupSellingChannel(queryParams),
    // Enable the query if at least sellingChannelId is provided
    // customerGroupId or selling_channel_name are optional
    // Also respect the enabled parameter passed from the caller
    enabled: enabled && Boolean(queryParams.sellingChannelId),
  });
}
