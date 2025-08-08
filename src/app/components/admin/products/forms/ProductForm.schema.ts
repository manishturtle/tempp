import { z } from 'zod';
import { ProductType, PublicationStatus, AttributeValueInput } from '@/app/types/products';

// Restriction mode enum
export const RestrictionMode = {
  INCLUDE: 'INCLUDE',
  EXCLUDE: 'EXCLUDE'
} as const;

export type RestrictionModeType = typeof RestrictionMode[keyof typeof RestrictionMode];


// Form schema matching ProductFormData interface exactly
export const formSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  product_type: z.nativeEnum(ProductType),
  description: z.string().default(''),
  short_description: z.string().default(''),
  division_id: z.number().min(1, 'Division is required'),
  category: z.number().min(1, 'Category is required'),
  subcategory: z.number().optional(),
  productstatus: z.number().min(1, 'Status is required'),
  uom_id: z.number().min(1, 'Unit of Measure is required'),
  is_active: z.boolean().default(true),
  currency_code: z.string().min(1, 'Currency code is required'),
  display_price: z.number({
    required_error: 'Price is required',
    invalid_type_error: 'Price must be a number',
  }).min(0, 'Price must be a positive number'),
  default_tax_rate_profile: z.number().nullable(),
  is_tax_exempt: z.boolean().default(false),
  compare_at_price: z.number().nullable(),
  sku: z.string().min(1, 'SKU is required'),
  inventory_tracking_enabled: z.boolean().default(false),
  quantity_on_hand: z.number().default(0),
  is_serialized: z.boolean().default(false),
  is_lotted: z.boolean().default(false),
  backorders_allowed: z.boolean().default(false),
  allow_reviews: z.boolean().default(true),
  pre_order_available: z.boolean().default(false),
  pre_order_date: z.string().nullable(),
  seo_title: z.string().default(''),
  seo_description: z.string().default(''),
  seo_keywords: z.string().default(''),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).default([]),
  tags: z.array(z.string()).default([]),
  temp_images: z.array(z.object({
    id: z.string(),
    alt_text: z.string().optional(),
    sort_order: z.number().optional(),
    is_default: z.boolean().optional()
  })).default([]),
  attribute_groups: z.array(z.number()).default([]),
  variant_defining_attributes: z.array(z.number()).default([]),
  attributes: z.record(z.string(), z.object({
    id: z.number().optional(),
    attribute_id: z.number(),
    attribute_name: z.string(),
    attribute_code: z.string(),
    attribute_type: z.string(),
    value: z.any(),
    use_variant: z.boolean().default(false),
    is_deleted: z.boolean().optional()
  })).default({}),
  attribute_values_input: z.array(z.object({
    attribute: z.number(),
    value: z.any()
  })).default([]),
  publication_status: z.nativeEnum(PublicationStatus).default(PublicationStatus.DRAFT),
  slug: z.string().optional(),
  active_from_date: z.date().nullable(),
active_to_date: z.date().nullable(),
  zone_restrictions_input: z.array(z.object({
    zone: z.number(),
    restriction_mode: z.enum([RestrictionMode.INCLUDE, RestrictionMode.EXCLUDE])
  })).default([]),
});

// Export types
export type ProductFormData = z.infer<typeof formSchema>;
