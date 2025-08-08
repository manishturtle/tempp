/**
 * Settings Types
 * 
 * This file defines TypeScript interfaces for tenant settings.
 */

/**
 * Tenant Setting interface
 * Represents system-wide settings for a tenant
 */
export interface TenantSetting {
  id: number;
  client_id: number;
  base_currency: string;
  tax_inclusive_pricing_global: boolean;
  show_tax_in_cart: boolean;
  show_tax_in_checkout: boolean;
  sku_prefix: string;
  sku_format: string;
  created_at: string;
  updated_at: string;
}

/**
 * Tenant Setting Form Data
 * Used for form submission (omits read-only fields)
 */
export type TenantSettingFormData = Omit<TenantSetting, 'id' | 'client_id' | 'created_at' | 'updated_at'>;
