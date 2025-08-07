/**
 * Zod validation schemas for catalogue forms
 * 
 * This file defines Zod schemas for validating form inputs for catalogue entities.
 */
import { z } from 'zod';

// Division schema
export const divisionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
  image: z.string().optional().nullable(),
  image_alt_text: z.string().max(200, 'Alt text must be less than 200 characters').optional(),
  customer_group_selling_channel_ids: z.array(z.number()).optional(),
  temp_images: z.array(
    z.object({
      id: z.string(),
      alt_text: z.string(),
      sort_order: z.number(),
      is_default: z.boolean()
    })
  ).optional(),
});

export type DivisionFormValues = z.infer<typeof divisionSchema>;

// Category schema
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
  division: z.number({ required_error: 'Division is required' }),
  image: z.string().optional().nullable(), // Removed URL validation since we're using temp_images
  image_alt_text: z.string().max(200, 'Alt text must be less than 200 characters').optional(),
  default_tax_rate_profile: z.number({ required_error: 'Tax Rate Profile is required' }).nullable(),
  customer_group_selling_channel_ids: z.array(z.number()).optional(),
  tax_inclusive: z.boolean().default(false),
  sort_order: z.number().int().min(0, 'Sort order cannot be negative').default(0),
  temp_images: z.array(
    z.object({
      id: z.string(),
      alt_text: z.string(),
      sort_order: z.number(),
      is_default: z.boolean()
    })
  ).optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// Subcategory schema
export const subcategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
  category: z.number({ required_error: 'Category is required' }),
  image: z.string().optional().nullable(),
  image_alt_text: z.string().max(200, 'Alt text must be less than 200 characters').optional(),
  customer_group_selling_channel_ids: z.array(z.number()).optional(),
  sort_order: z.number().int().min(0, 'Sort order cannot be negative').default(0),
  temp_images: z.array(
    z.object({
      id: z.string(),
      alt_text: z.string(),
      sort_order: z.number(),
      is_default: z.boolean()
    })
  ).optional(),
});

export type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

// Unit of Measure schema
export const unitOfMeasureSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be less than 10 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Symbol must contain only letters and numbers'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
  unit_type: z.enum(['COUNTABLE', 'MEASURABLE'], {
    required_error: 'Type is required',
  }),
  associated_value: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().nullable().optional()
  ).superRefine((val, ctx) => {
    // Skip validation if the value is null or undefined
    if (val === null || val === undefined) return;

    // Get the parent object to access the unit_type field
    const data = ctx.path[0] as any;
    
    if (data.unit_type === 'COUNTABLE' && val % 1 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'For Countable units, the value must be a whole number',
        path: [],
      });
    }
  }),
});

export type UnitOfMeasureFormValues = z.infer<typeof unitOfMeasureSchema>;

// Product Status schema
export const productStatusSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
  is_orderable: z.boolean().default(true)
});

export type ProductStatusFormValues = z.infer<typeof productStatusSchema>;
