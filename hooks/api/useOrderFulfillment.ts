import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrderFulfillmentDetails } from '@/services/api/ofm/orders';
import { OrderFulfillmentDetail } from '@/types/ofm/orders';

/**
 * Hook for fetching order fulfillment details for a specific order
 * @param orderId The unique identifier of the order
 */
export const useOrderFulfillmentDetails = (orderId: string | null | undefined) => {
  return useQuery<OrderFulfillmentDetail, Error>({
    queryKey: ['ofm', 'orderFulfillmentDetail', orderId],
    queryFn: () => getOrderFulfillmentDetails(orderId!),
    enabled: !!orderId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook for prefetching order fulfillment details
 * Useful for improving perceived performance when navigating to the order detail page
 */
export const usePrefetchOrderFulfillmentDetails = () => {
  const queryClient = useQueryClient();
  
  return (orderId: string) => {
    if (orderId) {
      queryClient.prefetchQuery({
        queryKey: ['ofm', 'orderFulfillmentDetail', orderId],
        queryFn: () => getOrderFulfillmentDetails(orderId),
        staleTime: 1 * 60 * 1000, // 1 minute
      });
    }
  };
};
