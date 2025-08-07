import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchUserOrders } from './orderService';
import { OrderListParams, PaginatedOrdersResponse } from '@/app/types/store/orderTypes';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';

/**
 * Custom hook for fetching user orders with TanStack Query
 * 
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Query result with orders data, loading and error states
 */
export const useUserOrders = (
  params: OrderListParams
): UseQueryResult<PaginatedOrdersResponse, Error> => {
  // Construct a query key based on the params to ensure proper caching
  const queryKey = ['userOrders', params];

  return useQuery({
    queryKey,
    queryFn: () => fetchUserOrders(params),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data (for pagination)
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache data for 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2, // Retry failed requests twice
    enabled: isAuthenticated(), // Only run the query if the user is authenticated
  });
};

export default useUserOrders;
