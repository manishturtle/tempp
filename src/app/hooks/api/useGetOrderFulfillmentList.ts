import { useQuery } from '@tanstack/react-query';
import { OrderFulfillmentListResponse } from '@/types/ofm/fulfillment';
import api from '@/app/services/api';

interface OrderFulfillmentListParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  status?: string[];
  workflow?: number[];
  quickFilter?: string[];
  searchTerm?: string;
}

/**
 * Fetches order fulfillment list data
 * @param params Query parameters for filtering, sorting, and pagination
 * @returns Query result with order fulfillment list data
 */
export const fetchOrderFulfillmentList = async (
  params: OrderFulfillmentListParams
): Promise<OrderFulfillmentListResponse> => {
  const { data } = await api.get<OrderFulfillmentListResponse>('/api/yash/ofm/orders/', {
    params,
  });
  return data;
};

/**
 * Hook to get order fulfillment list data
 * @param params Query parameters for filtering, sorting, and pagination
 */
export const useGetOrderFulfillmentList = (params: OrderFulfillmentListParams = {}) => {
  return useQuery({
    queryKey: ['orderFulfillmentList', params],
    queryFn: () => fetchOrderFulfillmentList(params),
    keepPreviousData: true,
  });
};

export default useGetOrderFulfillmentList;
