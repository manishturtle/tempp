/**
 * Settings Schemas
 * 
 * This file defines Zod validation schemas for tenant settings.
 */
import { z } from 'zod';

/**
 * Tenant Settings Schema
 * Validates tenant settings form data
 */
export const tenantSettingSchema = z.object({
  base_currency: z.string().min(3).max(3),
  tax_inclusive_pricing_global: z.boolean(),
  show_tax_in_cart: z.boolean(),
  show_tax_in_checkout: z.boolean(),
  sku_prefix: z.string().max(10).optional(),
  sku_format: z.string().max(50).optional(),
});

export type TenantSettingSchema = z.infer<typeof tenantSettingSchema>;
