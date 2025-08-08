import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getConfiguration, updateConfiguration } from './configurationService';
import { ConfigurationFormData } from '@/app/types/admin/configurationValidations';

/**
 * Configuration query key constant for consistent cache management
 */
const CONFIGURATION_QUERY_KEY = ['configuration', 'admin'] as const;

/**
 * Hook for fetching store configuration
 * 
 * @returns Query result with configuration data
 */
export const useGetConfiguration = () => {
  return useQuery<ConfigurationFormData, Error>({
    queryKey: CONFIGURATION_QUERY_KEY,
    queryFn: getConfiguration,
    staleTime: 5 * 60 * 1000, // 5 minutes, as configuration doesn't change frequently
  });
};

/**
 * Hook for updating store configuration
 * 
 * @returns Mutation function and status for updating configuration
 */
export const useUpdateConfiguration = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation<ConfigurationFormData, Error, ConfigurationFormData>({
    mutationFn: updateConfiguration,
    onMutate: (data) => {
      console.log('Starting configuration update mutation with data:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Configuration update successful, invalidating queries');
      queryClient.invalidateQueries({ queryKey: CONFIGURATION_QUERY_KEY });
      // Remove the enqueueSnackbar call here
      return data;
    },
    onError: (error) => {
      console.error('Configuration update error:', error);
      // Remove the enqueueSnackbar call here
      throw error; // Re-throw the error to be handled by the component
    }
  });
};