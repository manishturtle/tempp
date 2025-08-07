import { useQuery } from '@tanstack/react-query';
import { FulfillmentFilterOptions } from '@/types/ofm/fulfillment';
import api from '@/app/services/api';

/**
 * Fetches filter options for the order fulfillment list
 * @returns Query result with filter options
 */
export const fetchFulfillmentFilterOptions = async (): Promise<FulfillmentFilterOptions> => {
  const { data } = await api.get<FulfillmentFilterOptions>('/api/yash/ofm/orders/filter_options/');
  return data;
};

/**
 * Hook to get fulfillment filter options
 */
export const useGetFulfillmentFilterOptions = () => {
  return useQuery({
    queryKey: ['fulfillmentFilterOptions'],
    queryFn: fetchFulfillmentFilterOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export default useGetFulfillmentFilterOptions;
