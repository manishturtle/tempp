import { useQuery } from '@tanstack/react-query';
import { OrderFulfillmentDetail } from '@/types/ofm/orders';
import { getOrderFulfillmentDetails } from '@/services/api/ofm/orders';

/**
 * Hook for fetching detailed order fulfillment information
 * 
 * @param orderId The unique identifier of the order to fetch details for
 * @returns Query result containing order fulfillment details
 */
const useGetOrderFulfillmentDetails = (orderId: string | null | undefined) => {
  return useQuery<OrderFulfillmentDetail, Error>({
    queryKey: ['ofm', 'orderFulfillmentDetail', orderId],
    queryFn: () => getOrderFulfillmentDetails(orderId!),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default useGetOrderFulfillmentDetails;
