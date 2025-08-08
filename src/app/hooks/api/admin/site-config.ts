import { useMutation, useQuery, UseMutationResult, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Types for Header Configuration
export interface Division {
  id: string;
  name: string;
  is_visible?: boolean;
  categories?: Category[];
}

export interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  url: string;
}

export interface HeaderConfiguration {
  id: string;
  name: string;
  divisions: Division[];
  created_at: string;
  updated_at: string;
}

export interface HeaderConfigurationUpdatePayload {
  division_ids: string[];
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

/**
 * Fetches header configuration for admin interface
 * @returns UseQueryResult with header configuration data
 */
export const useAdminHeaderConfiguration = (): UseQueryResult<HeaderConfiguration, AxiosError<ApiError>> => {
  return useQuery<HeaderConfiguration, AxiosError<ApiError>>({
    queryKey: ['adminHeaderConfig'],
    queryFn: async () => {
      const { data } = await api.get<HeaderConfiguration>(
        apiEndpoints.siteConfig.adminHeader,
        { headers: await getAuthHeaders() }
      );
      return data;
    }
  });
};

/**
 * Updates header configuration with new division order
 * @returns UseMutationResult for updating header configuration
 */
export const useUpdateHeaderConfiguration = (): UseMutationResult<
  HeaderConfiguration, 
  AxiosError<ApiError>, 
  HeaderConfigurationUpdatePayload
> => {
  const queryClient = useQueryClient();
  
  return useMutation<HeaderConfiguration, AxiosError<ApiError>, HeaderConfigurationUpdatePayload>({
    mutationFn: async (payload: HeaderConfigurationUpdatePayload) => {
      const { data } = await api.put<HeaderConfiguration>(
        apiEndpoints.siteConfig.adminHeader,
        payload,
        { headers: await getAuthHeaders() }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHeaderConfig'] });
    }
  });
};
