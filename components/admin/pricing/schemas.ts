/**
 * Zod validation schemas for pricing forms
 * 
 * This file defines Zod schemas for validating form inputs for pricing entities.
 */
import { z } from 'zod';

// Customer Group schema
export const customerGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
});

export type CustomerGroupFormValues = z.infer<typeof customerGroupSchema>;

// Selling Channel schema
export const sellingChannelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
});

export type SellingChannelFormValues = z.infer<typeof sellingChannelSchema>;

// Country schema for use in TaxRegion
export const countrySchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
});

// Tax Region schema
export const taxRegionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  is_active: z.boolean().default(true),
  countries: z.array(z.number()).min(1, 'At least one country must be selected'),
});

export type TaxRegionFormValues = z.infer<typeof taxRegionSchema>;

// Tax Rate schema (updated to match backend model)

export const taxRateSchema = z.object({
  rate_name: z.string().min(1, { message: 'taxRate.form.rateNameRequired' }).max(50, { message: 'taxRate.form.rateNameMax' }),
  tax_type_code: z.string().min(1, { message: 'taxRate.form.taxTypeCodeRequired' }).max(50, { message: 'taxRate.form.taxTypeCodeMax' }),
  rate_percentage: z.number().min(0, { message: 'taxRate.form.ratePositive' }).max(100, { message: 'taxRate.form.rateMax' }),
  effective_from: z.string({ required_error: 'taxRate.form.effectiveFromRequired' }), // ISO date string
  effective_to: z.string().optional(), // ISO date string or undefined
  country_code: z.string().length(2, { message: 'taxRate.form.countryCodeLength' }).default('IN'),
  is_active: z.boolean().default(true),
}).refine(
  (data) => {
    // Skip validation if effective_to is not provided
    if (!data.effective_to) return true;
    
    // Compare dates
    const fromDate = new Date(data.effective_from);
    const toDate = new Date(data.effective_to);
    return toDate > fromDate;
  },
  {
    message: 'Effective to date must be after effective from date.',
    path: ['effective_to'] // This tells Zod which field has the error
  }
);

export type TaxRateFormValues = z.infer<typeof taxRateSchema>;


// Tax Rate Profile Condition schema
export const taxRateConditionSchema = z.object({
  attribute_name: z.string().min(1, 'Attribute name is required'),
  operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in'], {
    required_error: 'Operator is required'
  }),
  condition_value: z.string().min(1, 'Condition value is required'),
});

// Tax Rate Profile Outcome schema
export const taxRateOutcomeSchema = z.object({
  tax_rate: z.number().min(1, 'Tax rate ID is required'),
});

// Tax Rate Profile Rule schema
export const taxRateRuleSchema = z.object({
  priority: z.number().min(1, 'Priority must be at least 1'),
  is_active: z.boolean().default(true),
  effective_from: z.string({ required_error: 'Effective from date is required' }),
  effective_to: z.string({ required_error: 'Effective to date is required' }),
  conditions: z.array(taxRateConditionSchema).min(1, 'At least one condition is required'),
  outcomes: z.array(taxRateOutcomeSchema).min(1, 'At least one outcome is required'),
}).refine(
  (data) => {
    const fromDate = new Date(data.effective_from);
    const toDate = new Date(data.effective_to);
    return toDate > fromDate;
  },
  {
    message: 'Effective to date must be after effective from date.',
    path: ['effective_to']
  }
);

// Tax Rate Profile schema (updated structure)
export const taxRateProfileSchema = z.object({
  profile_name: z.string().min(1, 'Profile name is required').max(100, 'Profile name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  country_code: z.string().length(2, 'Country code must be 2 characters').default('IN'),
  is_active: z.boolean().default(true),
  rules: z.array(taxRateRuleSchema).min(1, 'At least one rule is required'),
});

export type TaxRateConditionFormValues = z.infer<typeof taxRateConditionSchema>;
export type TaxRateOutcomeFormValues = z.infer<typeof taxRateOutcomeSchema>;
export type TaxRateRuleFormValues = z.infer<typeof taxRateRuleSchema>;
export type TaxRateProfileFormValues = z.infer<typeof taxRateProfileSchema>;
