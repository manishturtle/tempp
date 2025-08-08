import { useQuery } from '@tanstack/react-query';
import { fetchUserOrderDetail } from './orderService';
import { OrderDetail } from '@/app/types/store/orderTypes';

/**
 * Custom hook for fetching detailed information about a specific order
 *
 * @param orderId - ID of the order to fetch
 * @returns Query result with order details data, loading state, and error state
 */
export function useUserOrderDetail(orderId: string) {
  return useQuery<OrderDetail, Error>({
    queryKey: ['userOrderDetail', orderId],
    queryFn: () => fetchUserOrderDetail(orderId),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
