import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiEndpoints } from '@/lib/api';
import { AxiosError } from 'axios';
import { getAuthHeaders } from '@/app/hooks/api/auth';

/**
 * Interface for customer group selling channel response
 */
export interface CustomerGroupSellingChannelsResponse {
  category_channels?: number[];
  subcategory_channels?: number[];
  product_channels: number[];
}

/**
 * Parameters for the useExclusionsChannels hook
 */
export interface ExclusionsChannelsParams {
  category_id?: number;
  subcategory_id?: number;
  product_id?: number;
}

/**
 * Hook to fetch customer group selling channel IDs based on category, subcategory, or product
 * 
 * @param params - Query parameters (category_id, subcategory_id, product_id)
 * @returns Query result with customer group selling channels data
 */
export const useExclusionsChannels = (params: ExclusionsChannelsParams) => {
  const { category_id, subcategory_id, product_id } = params;
  
  // Build API params with only defined values
  const buildApiParams = () => {
    const params: Record<string, number> = {};
    
    // Add only defined parameters to avoid sending 'undefined' values
    if (product_id !== undefined) {
      params.product_id = product_id;
    }
    
    // Only add subcategory_id OR category_id, with subcategory taking precedence
    if (subcategory_id !== undefined) {
      params.subcategory_id = subcategory_id;
    } else if (category_id !== undefined) {
      params.category_id = category_id;
    }
    
    return params;
  };
  
  // Determine if we have valid parameters to make the request
  const hasValidParams = product_id !== undefined || subcategory_id !== undefined || category_id !== undefined;
  
  return useQuery<CustomerGroupSellingChannelsResponse, AxiosError>({
    queryKey: ['exclusionsChannels', { category_id, subcategory_id, product_id }],
    queryFn: async () => {
      const response = await api.get<CustomerGroupSellingChannelsResponse>(
        apiEndpoints.catalogue.exclusionsChannels.get(buildApiParams()),
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    // Only enable the query if at least one valid parameter is provided
    enabled: hasValidParams,
  });
};

export default useExclusionsChannels;
