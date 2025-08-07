import * as z from 'zod';

/**
 * Schema for product variant form validation
 */
export const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  display_price: z.number().min(0, 'Price must be at least 0'),
  quantity_on_hand: z.number().min(0, 'Quantity must be at least 0'),
  is_active: z.boolean().default(true),
  options: z.record(z.string(), z.any()).default({}),
  status_override: z.number().nullable().default(null),
  image: z.number().nullable().optional(),
  // Array of existing images (from API)
  images: z.array(
    z.object({
      id: z.number(),
      image: z.string(),
      alt_text: z.string(),
      sort_order: z.number(),
      is_default: z.boolean(),
      thumbnail_url: z.string().optional()
    })
  ).optional(),
  // Array of temporary images (for new uploads)
  temp_images: z.array(
    z.object({
      id: z.string(),
      alt_text: z.string(),
      sort_order: z.number(),
      is_default: z.boolean()
    })
  ).optional()
});

/**
 * Type for variant form data derived from the schema
 */
export type VariantFormData = z.infer<typeof variantSchema>;

/**
 * Interface for attribute with options for variant configuration
 */
/**
 * Interface for validation rules
 */
export interface ValidationRules {
  min_value?: number;
  max_value?: number;
  min_date?: string;
  max_date?: string;
  date_format?: string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  integer_only?: boolean;
  min_selections?: number;
  max_selections?: number;
  [key: string]: any;
}

export interface AttributeWithOptions {
  id: number;
  name: string;
  code: string;
  data_type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTI_SELECT';
  validation_rules?: ValidationRules;
  is_required?: boolean;
  options: {
    id: number;
    option_label: string;
    option_value: string;
  }[];
}

/**
 * Interface for product image
 */
export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
  thumbnail_url?: string;
}
