import { useQuery, useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

export interface TenantConfiguration {
  id: number;
  tenant_ref: string;
  payment_settings: Record<string, unknown>;
  notification_settings: Record<string, unknown>;
  ui_template_settings: Record<string, unknown>;
  feature_toggles: {
    WALLET: boolean;
    LOYALTY: boolean;
    WISHLIST: boolean;
    REVIEWS: boolean;
  };
  wallet_config: Record<string, unknown>;
  returns_config: Record<string, unknown>;
  loyalty_config: Record<string, unknown>;
  pending_payment_timeout_minutes: number | null;
  is_onboarding_completed: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

/**
 * Fetches the tenant configuration status for the current tenant
 * @returns Promise with the tenant configuration status
 */
const fetchTenantConfiguration = async (): Promise<TenantConfiguration> => {
  const { data } = await api.get<TenantConfiguration>(
    '/onboarding/tenant-configuration-status/',
    { headers: getAuthHeaders() }
  );
  return data;
};

/**
 * Updates the tenant configuration status for the current tenant
 * @param configId The ID of the configuration to update
 * @param updates The fields to update
 * @returns Promise with the updated tenant configuration status
 */
const updateTenantConfiguration = async (
  configId: number,
  updates: Partial<TenantConfiguration>
): Promise<TenantConfiguration> => {
  const { data } = await api.patch<TenantConfiguration>(
    '/onboarding/tenant-configuration-status/',
    updates,
    { headers: getAuthHeaders() }
  );
  return data;
};

/**
 * Hook for fetching tenant configuration data
 * @returns Query result object with tenant configuration data and state
 */
export const useTenantConfigurationQuery = () => {
  return useQuery({
    queryKey: ['tenantConfiguration'],
    queryFn: fetchTenantConfiguration,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: AxiosError) => {
      // Only retry on network errors, not on 4xx client errors
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for updating tenant configuration
 * @returns Mutation result object with update actions and state
 */
export const useUpdateTenantConfigurationMutation = () => {
  return useMutation({
    mutationFn: ({ configId, updates }: { configId: number; updates: Partial<TenantConfiguration> }) => 
      updateTenantConfiguration(configId, updates),
    onError: (error: AxiosError<ApiError>) => {
      console.error('Configuration update error:', {
        status: error.response?.status,
        code: error.response?.data?.code,
      });
    },
  });
};
