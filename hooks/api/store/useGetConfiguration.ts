import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/storeapi';

// API response type definition matching the exact combined configuration endpoint format
export interface ApiCombinedConfiguration {
  checkout_configuration: {
    id: number;
    allow_guest_checkout: boolean;
    min_order_value: string;
    allow_user_select_shipping: boolean;
    fulfillment_type: string;
    pickup_method_label: string;
    enable_delivery_prefs: boolean;
    enable_preferred_date: boolean;
    enable_time_slots: boolean;
    currency: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
  ui_template_settings: {
    id: number;
    product_card_style: string;
    pdp_layout_style: string;
    checkout_layout: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
  feature_toggle_settings: {
    id: number;
    wallet_enabled: boolean;
    loyalty_enabled: boolean;
    reviews_enabled: boolean;
    wishlist_enabled: boolean;
    min_recharge_amount: string;
    max_recharge_amount: string;
    daily_transaction_limit: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
}

// Transformed configuration type with camelCase properties following frontend conventions
export interface StoreConfiguration {
  checkout_configuration: {
    id: number;
    allow_guest_checkout: boolean;
    min_order_value: string;
    allow_user_select_shipping: boolean;
    fulfillment_type: string;
    pickup_method_label: string;
    enable_delivery_prefs: boolean;
    enable_preferred_date: boolean;
    enable_time_slots: boolean;
    currency: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
  ui_template_settings: {
    id: number;
    product_card_style: string;
    pdp_layout_style: string;
    checkout_layout: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
  feature_toggle_settings: {
    id: number;
    wallet_enabled: boolean;
    loyalty_enabled: boolean;
    reviews_enabled: boolean;
    wishlist_enabled: boolean;
    min_recharge_amount: string;
    max_recharge_amount: string;
    daily_transaction_limit: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
}

// Helper function to transform API response to frontend configuration format
// Since both interfaces now match exactly, we can return the API response directly
function transformApiConfiguration(apiConfig: ApiCombinedConfiguration): StoreConfiguration {
  return apiConfig;
};

/**
 * Hook to fetch store configuration using the new combined configuration API
 * 
 * @returns {Object} Store configuration data and query status
 */
export function useGetConfiguration() {
  const params = useParams();
  const tenant = params?.tenant as string;
  
  const fetchConfiguration = async (): Promise<StoreConfiguration> => {
    // Get tenant from params
    const tenant = params?.tenant as string;
    // Fetch segment details from localStorage
    const segmentDetailsStr = localStorage.getItem(`${tenant}_segmentdetails`);
    let segmentName = "";
    if (segmentDetailsStr) {
      try {
        const segmentDetails = JSON.parse(segmentDetailsStr);
        segmentName = Array.isArray(segmentDetails)
          ? segmentDetails[0]?.segment_name
          : segmentDetails.segment_name;
      } catch (e) {
        segmentName = "";
      }
    }
    // Build API URL
    let url = `/combined-config/`;
    if (segmentName) {
      url += `?segment_name=${encodeURIComponent(segmentName)}`;
    }
    const response = await api.get<ApiCombinedConfiguration>(url);
    console.log('Combined Config API Response:', response.data);
    return transformApiConfiguration(response.data);
  };

  const ONE_MINUTE = 1 * 60 * 1000;

  return useQuery<StoreConfiguration>({
    queryKey: ['storeConfiguration', tenant],
    queryFn: fetchConfiguration,
    staleTime: ONE_MINUTE, // 1 minute cache before refetching
    gcTime: ONE_MINUTE * 2, // Keep in cache for 2 minutes
    retry: 1,
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: ONE_MINUTE, // Poll every minute
    enabled: !!tenant, // Only run the query if tenant is available
  });
}
