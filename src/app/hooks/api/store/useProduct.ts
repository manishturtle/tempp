import { useQuery } from '@tanstack/react-query';
import AuthService from '@/app/auth/services/authService';
import { Product } from '@/app/types/store/product';
import storeApi from '@/lib/storeapi';

// DetailedProduct interface matching the new API payload structure
export interface DetailedProduct {
  id: number;
  product_type: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  category: number;
  subcategory: number;
  division: number;
  uom: number;
  uom_details: {
    name: string;
    symbol: string;
    description: string;
  };
  currency_code: string;
  default_tax_rate_profile: number;
  is_tax_exempt: boolean;
  display_price: string;
  compare_at_price: string | null;
  is_active: boolean;
  allow_reviews: boolean;
  inventory_tracking_enabled: boolean;
  backorders_allowed: boolean;
  quantity_on_hand: number;
  pre_order_available: boolean;
  pre_order_date: string | null;
  publication_status: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  tags: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  key_features: string[];
  images: Array<{
    id: number | null;
    image: string;
    alt_text: string;
    sort_order: number;
    is_default: boolean;
  }>;
  attribute_values: Array<{
    id: number;
    attribute_name: string;
    attribute_code: string;
    value_text: string | null;
    value_number: string | null;
    value_boolean: boolean | null;
    value_date: string | null;
    value_option: string | null;
  }>;
  workflow_flow_id: number | null;
  zone_restrictions: Array<{
    id: number;
    product: number;
    zone: number;
    restriction_mode: string;
  }>;
  price: string;
  atp_quantity: number;
  stock_status: string;
  delivery_eligible: boolean;
  delivery_error: string | null;
}

/**
 * Custom hook to fetch a single product by SKU
 * 
 * @param sku - Product SKU to fetch
 * @param deliveryParams - Optional delivery parameters for eligibility check
 * @returns Query result with product data
 */
export const useProduct = (sku: string, deliveryParams?: {
  pincode?: string;
  country?: string;
  customer_group_selling_channel_id?: string;
}) => {
  return useQuery<DetailedProduct>({
    queryKey: ['product', sku, deliveryParams],
    queryFn: async () => {
      try {
        const token = AuthService.getToken();
        
        // Build query parameters
        const params = new URLSearchParams();
        if (deliveryParams?.pincode) {
          params.append('pincode', deliveryParams.pincode);
        }
        if (deliveryParams?.country) {
          params.append('country', deliveryParams.country);
        }
        if (deliveryParams?.customer_group_selling_channel_id) {
          params.append('customer_group_selling_channel_id', deliveryParams.customer_group_selling_channel_id);
        }
        
        const queryString = params.toString();
        const url = `/om/storefront/product-details/${sku}/${queryString ? `?${queryString}` : ''}`;
        
        const response = await storeApi.get(url, {
          headers: {
            // ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        // Return the API response directly since DetailedProduct interface matches the payload
        return response.data as DetailedProduct;
      } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!sku // Only run the query if sku is provided
  });
};
