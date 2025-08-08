import api from "@/lib/api";
import { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { useQuery } from "@tanstack/react-query";

/**
 * Type for Customer Group Selling Channel (GET response)
 */
export interface CustomerGroupSellingChannel {
  id: number;
  customer_group_id: number;
  customer_group_name: string;
  selling_channel_id: number;
  selling_channel_name: string;
  status: string;
  segment_name: string;
}

/**
 * Fetch all customer group selling channels
 */
export function getCustomerGroupSellingChannels(): Promise<CustomerGroupSellingChannel[]> {
  return api.get(apiEndpoints.customerGroupSellingChannels.list, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/**
 * React Query hook to fetch all customer group selling channels
 */
export function useCustomerGroupSellingChannels() {
  return useQuery({
    queryKey: ["customerGroupSellingChannels"],
    queryFn: getCustomerGroupSellingChannels,
  });
}
