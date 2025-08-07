import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import { AdminOrderListParams, PaginatedAdminOrdersResponse, AdminOrder } from '@/app/types/admin/orders';

/**
 * Fetches paginated admin orders with filtering and sorting capabilities
 * 
 * @param params - Query parameters for filtering, pagination and sorting
 * @returns Promise with paginated admin orders response
 */
export const fetchAdminOrders = async (
  params: AdminOrderListParams
): Promise<PaginatedAdminOrdersResponse> => {
  const response = await api.get<PaginatedAdminOrdersResponse>(
    apiEndpoints.admin.orders.list(),
    { 
      params,
      headers: getAuthHeaders(),
      withCredentials: true 
    }
  );
  
  return response.data;
};

/**
 * Fetches a single admin order by ID
 * 
 * @param id - Order ID to fetch
 * @returns Promise with order details
 */
export const fetchAdminOrderById = async (id: string): Promise<AdminOrder> => {
  const response = await api.get<AdminOrder>(
    apiEndpoints.admin.orders.detail(id),
    { 
      headers: getAuthHeaders(),
      withCredentials: true 
    }
  );
  
  return response.data;
};

/**
 * React query hook for fetching paginated admin orders with filtering and sorting capabilities
 *
 * @param params - Query parameters for filtering, pagination and sorting
 * @returns Query result with paginated admin orders data
 */
export const useAdminOrders = (params: AdminOrderListParams) => {
  return useQuery<PaginatedAdminOrdersResponse, Error>({
    queryKey: ['adminOrders', params],
    queryFn: () => fetchAdminOrders(params),
    placeholderData: keepPreviousData, // Keep previous data while fetching new data
    staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
  });
};

/**
 * React query hook for fetching a single admin order by ID
 *
 * @param id - Order ID to fetch
 * @returns Query result with order details
 */
export const useAdminOrderDetail = (id: string) => {
  return useQuery<AdminOrder, Error>({
    queryKey: ['adminOrder', id],
    queryFn: () => fetchAdminOrderById(id),
    enabled: !!id, // Only run the query if ID is provided
    staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
  });
};

// Default export for backward compatibility
export default useAdminOrders;
