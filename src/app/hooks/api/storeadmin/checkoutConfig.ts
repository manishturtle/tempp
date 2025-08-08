import api from "@/lib/api";
import { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";

/**
 * Type for a single Checkout Configuration (GET response)
 */
export interface CheckoutConfig {
  id: number;
  allow_guest_checkout: boolean;
  min_order_value: string;
  allow_user_select_shipping: boolean;
  fulfillment_type: 'delivery' | 'store_pickup' | 'both' | 'none';
  pickup_method_label: string;
  enable_delivery_prefs: boolean;
  enable_preferred_date: boolean;
  enable_time_slots: boolean;
  currency: string;
  customer_group_selling_channel: number | null;
  segment_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

/**
 * Type for create/update payload and response
 */
export interface CheckoutConfigInput {
  allow_guest_checkout: boolean;
  min_order_value: number;
  allow_user_select_shipping: boolean;
  fulfillment_type: 'delivery' | 'store_pickup' | 'both' | 'none';
  pickup_method_label: string;
  enable_delivery_prefs: boolean;
  enable_preferred_date: boolean;
  enable_time_slots: boolean;
  currency: string;
  customer_group_selling_channel: number;
  is_active: boolean;
}

/**
 * Fetch all checkout configurations
 */
export function getCheckoutConfigs(): Promise<CheckoutConfig[]> {
  return api.get(apiEndpoints.checkoutConfigs.list, { headers: getAuthHeaders() }).then(res => res.data);
}

/**
 * Create a new checkout configuration
 */
export function createCheckoutConfig(data: CheckoutConfigInput): Promise<CheckoutConfig> {
  return api.post(apiEndpoints.checkoutConfigs.create, data, { headers: getAuthHeaders() }).then(res => res.data);
}

/**
 * Update an existing checkout configuration
 */
export function updateCheckoutConfig(id: number, data: CheckoutConfigInput): Promise<CheckoutConfig> {
  return api.put(apiEndpoints.checkoutConfigs.update(id), data, { headers: getAuthHeaders() }).then(res => res.data);
}

/**
 * Delete a checkout configuration
 */
export function deleteCheckoutConfig(id: number): Promise<void> {
  return api.delete(apiEndpoints.checkoutConfigs.delete(id), { headers: getAuthHeaders() }).then(res => res.data);
}
