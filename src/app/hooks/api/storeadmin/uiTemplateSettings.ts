import api from "@/lib/api";
import { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";

/**
 * Type for UI Template Settings object (GET response)
 */
export interface UITemplateSettings {
  id: number;
  checkout_layout: string;
  pdp_layout_style: string;
  product_card_style: string;
  customer_group_selling_channel: number | null;
  segment_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

/**
 * Type for create/update payload
 */
export interface UITemplateSettingsInput {
  checkout_layout: string;
  pdp_layout_style: string;
  product_card_style: string;
  is_active: boolean;
  customer_group_selling_channel: number | null;
}

/**
 * Fetch all UI template settings
 */
export function getUITemplateSettings(): Promise<UITemplateSettings[]> {
  return api
    .get(apiEndpoints.uiTemplateSettings.list, { headers: getAuthHeaders() })
    .then(res => res.data);
}

/**
 * Create a new UI template setting
 */
export function createUITemplateSettings(
  data: UITemplateSettingsInput
): Promise<UITemplateSettings> {
  return api
    .post(apiEndpoints.uiTemplateSettings.create, data, { headers: getAuthHeaders() })
    .then(res => res.data);
}

/**
 * Update an existing UI template setting
 */
export function updateUITemplateSettings(
  id: number,
  data: UITemplateSettingsInput
): Promise<UITemplateSettings> {
  return api
    .put(apiEndpoints.uiTemplateSettings.update(id), data, { headers: getAuthHeaders() })
    .then(res => res.data);
}

/**
 * Delete a UI template setting
 */
export function deleteUITemplateSettings(id: number): Promise<void> {
  return api
    .delete(apiEndpoints.uiTemplateSettings.delete(id), { headers: getAuthHeaders() })
    .then(() => {});
}
