import api, { apiEndpoints } from '@/lib/storeapi';
import { useQuery } from '@tanstack/react-query';

/**
 * Interface for store UI settings
 */
export interface StoreUiSettings {
  productCardStyle: string;
  pdpLayoutStyle: string;
  templateId: string;
}

/**
 * Fetches the current store UI configuration
 * 
 * @returns The current store UI settings
 */
export const getStoreUiSettings = async (): Promise<StoreUiSettings> => {
  try {
    console.log('Fetching store UI settings');
    const response = await api.get(
      apiEndpoints.configuration.admin(),
    );
    console.log('Received store UI settings data:', response.data);
    
    // Transform API response to frontend format
    return transformApiToUiFormat(response.data);
  } catch (error) {
    console.error('Error fetching store UI settings:', error);
    throw error;
  }
};

/**
 * Transform backend API response to store UI format
 */
const transformApiToUiFormat = (apiData: any): StoreUiSettings => {
  console.log('Transforming API response to UI format:', apiData?.ui_template_settings);
  
  return {
    productCardStyle: apiData?.ui_template_settings?.product_card_style || 'card1',
    pdpLayoutStyle: apiData?.ui_template_settings?.pdp_layout_style ,
    templateId: apiData?.ui_template_settings?.template_id || "",
  };
};

/**
 * Hook for accessing store UI settings with session-consistent caching
 * 
 * Implements a session-consistent caching strategy to ensure UI settings
 * are fetched once per session and not automatically updated while a user
 * is browsing. This prevents layout shifts and maintains visual consistency.
 * 
 * @returns A query result object containing UI settings data and status
 */
export const useGetStoreUiSettings = () => {
  return useQuery({
    queryKey: ['storeUiSettings'],
    queryFn: getStoreUiSettings,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
