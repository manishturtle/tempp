/**
 * Settings API hooks
 * 
 * This file provides custom React hooks for interacting with the tenant settings API endpoints
 * using TanStack Query for data fetching and caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { TenantSetting, TenantSettingFormData } from '@/app/types/settings';

// =============================================================================
// Tenant Settings Hooks
// =============================================================================

/**
 * Hook to fetch tenant settings
 * @param clientId - The ID of the client
 * @returns Query result with tenant settings data
 */
export const useFetchTenantSettings = (clientId: number = 1) => {
  return useQuery({
    queryKey: ['tenantSettings', { clientId }],
    queryFn: async () => {
      const response = await api.get<TenantSetting>(
        apiEndpoints.settings.client(clientId)
      );
      return response.data;
    },
    enabled: !!clientId, // Only run the query if clientId is provided
  });
};

/**
 * Hook to update tenant settings
 * @returns Mutation function and state for updating tenant settings
 */
export const useUpdateTenantSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      data 
    }: { 
      clientId: number; 
      data: TenantSettingFormData 
    }) => {
      const response = await api.put<TenantSetting>(
        apiEndpoints.settings.client(clientId),
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the tenant settings query to refetch the updated data
      queryClient.invalidateQueries({ 
        queryKey: ['tenantSettings', { clientId: variables.clientId }] 
      });
    },
  });
};
