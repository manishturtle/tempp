import * as z from 'zod';

/**
 * Enum for kit component types
 */
export enum KitComponentType {
  REQUIRED = 'required',
  SWAPPABLE = 'swappable'
}

/**
 * Schema for kit component form validation
 */
export const kitComponentSchema = z.object({
  type: z.nativeEnum(KitComponentType),
  
  // For both required and swappable components
  quantity: z.number({
    required_error: 'Quantity is required',
    invalid_type_error: 'Quantity must be a number',
  }).min(1, 'Quantity must be at least 1'),
  
  // For required components - either product or variant must be selected
  component_product_id: z.number().nullable().optional(),
  component_variant_id: z.number().nullable().optional(),
})
.refine(
  (data) => {
    // If type is REQUIRED, either product or variant must be selected
    if (data.type === KitComponentType.REQUIRED) {
      return data.component_product_id !== null || data.component_variant_id !== null;
    }
    // If type is SWAPPABLE, a parent product must be selected
    if (data.type === KitComponentType.SWAPPABLE) {
      return data.component_product_id !== null;
    }
    return false;
  },
  {
    message: 'You must select either a product or variant for required components, or a parent product for swappable groups',
    path: ['component_product_id'],
  }
);

/**
 * Type for kit component form data derived from the schema
 */
export type KitComponentFormData = z.infer<typeof kitComponentSchema>;

/**
 * Interface for kit component data from API
 */
export interface KitComponent {
  id: number;
  type: KitComponentType;
  component_product_id: number | null;
  component_product_name?: string;
  component_variant_id: number | null;
  component_variant_sku?: string;
  quantity: number;
}

/**
 * Interface for product search result
 */
export interface ProductSearchResult {
  id: number;
  name: string;
  sku?: string;
  product_type: string;
}

/**
 * Interface for variant search result
 */
export interface VariantSearchResult {
  id: number;
  sku: string;
  product_id: number;
  product_name: string;
}
