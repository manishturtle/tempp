import api from "@/lib/api";
import { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";

/**
 * Type for Feature Toggle Settings object (GET response)
 */
export interface FeatureToggleSettings {
  id: number;
  customer_group_selling_channel: number | null;
  segment_name: string | null;
  wallet_enabled: boolean;
  loyalty_enabled: boolean;
  reviews_enabled: boolean;
  wishlist_enabled: boolean;
  min_recharge_amount?: string;
  max_recharge_amount?: string;
  daily_transaction_limit?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

/**
 * Type for create/update payload
 */
export interface FeatureToggleSettingsInput {
  customer_group_selling_channel: number | null;
  wallet_enabled: boolean;
  loyalty_enabled: boolean;
  reviews_enabled: boolean;
  wishlist_enabled: boolean;
  min_recharge_amount?: number;
  max_recharge_amount?: number;
  daily_transaction_limit?: number;
  is_active?: boolean;
}

/**
 * Fetch all Feature Toggle Settings
 */
export function getFeatureToggleSettings(): Promise<FeatureToggleSettings[]> {
  return api.get(apiEndpoints.featureToggleSettings.list, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/**
 * Fetch a single Feature Toggle Setting by ID
 */
export function getFeatureToggleSetting(id: number): Promise<FeatureToggleSettings> {
  return api.get(apiEndpoints.featureToggleSettings.detail(id), {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/**
 * Create a new Feature Toggle Setting
 */
export function createFeatureToggleSetting(data: FeatureToggleSettingsInput): Promise<FeatureToggleSettings> {
  return api.post(apiEndpoints.featureToggleSettings.create, data, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/**
 * Update an existing Feature Toggle Setting
 */
export function updateFeatureToggleSetting(id: number, data: FeatureToggleSettingsInput): Promise<FeatureToggleSettings> {
  return api.put(apiEndpoints.featureToggleSettings.update(id), data, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/**
 * Delete a Feature Toggle Setting
 */
export function deleteFeatureToggleSetting(id: number): Promise<void> {
  return api.delete(apiEndpoints.featureToggleSettings.delete(id), {
    headers: getAuthHeaders(),
  }).then(() => undefined);
}
