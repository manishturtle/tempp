/**
 * Zod validation schemas for attribute forms
 * 
 * This file defines Zod schemas for validating form inputs for attribute entities.
 */
import { z } from 'zod';
import { AttributeDataType } from '@/app/types/attributes';

// Attribute Group schema
export const attributeGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  display_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().default(true),
});

export type AttributeGroupFormValues = z.infer<typeof attributeGroupSchema>;

// Validation rules schema - this handles the JSON structure for validation rules
export const validationRulesSchema = z.object({
  min_length: z.number().int().nonnegative().optional(),
  max_length: z.number().int().positive().optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  regex_pattern: z.string().optional(),
  date_format: z.string().optional(),
  min_date: z.string().optional(),
  max_date: z.string().optional(),
}).catchall(z.any()).optional();

// Attribute Option schema for field array
export const attributeOptionFieldSchema = z.object({
  id: z.number().optional(), // Optional for new options
  option_label: z.string().min(1, 'Label is required').max(100, 'Label must be less than 100 characters'),
  option_value: z.string().min(1, 'Value is required').max(100, 'Value must be less than 100 characters'),
  sort_order: z.number().int().nonnegative().default(0),
});

// Attribute schema
export const attributeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be less than 50 characters'),
  label: z.string().min(1, 'Label is required').max(100, 'Label must be less than 100 characters'),
  data_type: z.nativeEnum(AttributeDataType, {
    errorMap: () => ({ message: 'Data type is required' }),
  }),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().default(''),
  is_active: z.boolean().default(true),
  use_for_variants: z.boolean().default(false),
  display_on_pdp: z.boolean().default(true),
  show_on_pdp: z.boolean().default(true),
  is_required: z.boolean().default(false),
  is_filterable: z.boolean().default(false),
  validation_rules: validationRulesSchema.default({}),
  groups: z.array(z.number()).min(1, 'At least one attribute group must be selected'),
  options: z.array(attributeOptionFieldSchema).optional().default([]),
});

export type AttributeFormValues = z.infer<typeof attributeSchema>;

// Attribute Option schema (for standalone option management)
export const attributeOptionSchema = z.object({
  attribute: z.number({ required_error: 'Attribute is required' }),
  option_label: z.string().min(1, 'Label is required').max(100, 'Label must be less than 100 characters'),
  option_value: z.string().min(1, 'Value is required').max(100, 'Value must be less than 100 characters'),
  sort_order: z.number().int().nonnegative().default(0),
});

export type AttributeOptionFormValues = z.infer<typeof attributeOptionSchema>;
