/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Import useAdjustmentReasons from '@/app/hooks/api/inventory' instead.
 */

import { useAdjustmentReasons } from './inventory';

export default useAdjustmentReasons;



// /**
//  * useAdjustmentReasons hook
//  * 
//  * A custom React hook for fetching and caching adjustment reasons for inventory adjustments.
//  * Uses TanStack Query (React Query) for efficient data fetching and caching.
//  */
// import { useQuery } from '@tanstack/react-query';
// import api, { apiEndpoints } from '@/lib/api';
// import { AdjustmentReason, PaginatedResponse, InventoryFilter } from '@/app/types/inventory';
// import { getAuthHeaders } from './auth';

// /**
//  * Builds query parameters for adjustment reasons API requests
//  * 
//  * @param params - Filter parameters for adjustment reasons
//  * @returns URL query string
//  */
// const buildQueryParams = (params?: InventoryFilter): string => {
//   if (!params) return '';
  
//   const urlParams = new URLSearchParams();
  
//   if (params.search) urlParams.append('search', params.search);
//   if (params.is_active !== undefined) urlParams.append('is_active', String(params.is_active));
//   if (params.adjustment_type) urlParams.append('adjustment_type', params.adjustment_type);
//   if (params.page !== undefined) urlParams.append('page', String(params.page));
//   if (params.page_size !== undefined) urlParams.append('page_size', String(params.page_size));
  
//   return urlParams.toString() ? `?${urlParams.toString()}` : '';
// };

// /**
//  * Fetches adjustment reasons from the API
//  * 
//  * @param params - Filter parameters for adjustment reasons
//  * @returns Promise with paginated adjustment reasons
//  */
// export const fetchAdjustmentReasons = async (params?: InventoryFilter): Promise<PaginatedResponse<AdjustmentReason>> => {
//   // Set default params if not provided
//   const defaultParams: InventoryFilter = {
//     is_active: true,
//     page: 1,
//     page_size: 100,
//   };
  
//   const finalParams = params ? { ...defaultParams, ...params } : defaultParams;
  
//   const response = await api.get(
//     `${apiEndpoints.inventory.adjustmentReasons.list}${buildQueryParams(finalParams)}`,
//     { headers: getAuthHeaders() }
//   );
//   return response.data;
// };

// /**
//  * Interface for the return value of the useAdjustmentReasons hook
//  */
// interface UseAdjustmentReasonsReturn {
//   reasons: AdjustmentReason[];
//   isLoading: boolean;
//   isError: boolean;
//   error: unknown;
//   refetch: () => void;
// }

// /**
//  * Hook to fetch and cache adjustment reasons
//  * 
//  * @param params - Optional filter parameters
//  * @returns Object containing reasons, loading state, error state, and refetch function
//  */
// export function useAdjustmentReasons(params?: InventoryFilter): UseAdjustmentReasonsReturn {
//   // Use a stable key for React Query caching
//   const queryParams = params || { is_active: true, page_size: 100 };
//   const cacheKey = ['adjustmentReasons', queryParams];
  
//   const { data, isLoading, isError, error, refetch } = useQuery({
//     queryKey: cacheKey,
//     queryFn: () => fetchAdjustmentReasons(queryParams),
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     gcTime: 10 * 60 * 1000, // 10 minutes
//   });
  
//   return {
//     reasons: data?.results || [],
//     isLoading,
//     isError,
//     error,
//     refetch,
//   };
// }

// export default useAdjustmentReasons;
