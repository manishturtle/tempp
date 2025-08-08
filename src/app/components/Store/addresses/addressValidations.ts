/**
 * Address validation schemas using Zod
 */
import { z } from 'zod';

/**
 * Schema for validating address form data
 * Includes validation rules for all required address fields
 */
// Define address type enum
export const ADDRESS_TYPES = {
  SHIPPING: 'SHIPPING',
  BILLING: 'BILLING'
} as const;

export type AddressType = keyof typeof ADDRESS_TYPES;

export const addressFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }), // i18n key: 'validation.fullName.min'
  addressLine1: z.string().min(5, { message: "Address line 1 must be at least 5 characters." }), // i18n key: 'validation.addressLine1.min'
  addressLine2: z.string().optional(),
  city: z.string().min(2, { message: "City must be at least 2 characters." }), // i18n key: 'validation.city.min'
  state: z.string().min(2, { message: "State/Province must be at least 2 characters." }), // i18n key: 'validation.state.min'
  postalCode: z.string().min(3, { message: "Postal code must be at least 3 characters." }), // i18n key: 'validation.postalCode.min'
  country: z.string().min(2, { message: "Country must be at least 2 characters." }), // For simplicity, basic validation. Could be a select with predefined countries. i18n key: 'validation.country.min'
  phoneNumber: z.string().min(7, { message: "Phone number must be at least 7 digits." }).regex(/^\+?[0-9\s\-()]+$/, { message: "Invalid phone number format." }), // i18n key: 'validation.phoneNumber.min', 'validation.phoneNumber.invalidFormat'
  addressType: z.enum([ADDRESS_TYPES.SHIPPING, ADDRESS_TYPES.BILLING], {
    required_error: "Address type is required",
    invalid_type_error: "Address type must be either Shipping or Billing"
  }),
  // addressLabel: z.string().optional(), // Optional if you add a label field like 'Work', 'Home'
});

/**
 * Type definition for address form data
 * Inferred from the Zod schema
 */
export type AddressFormData = z.infer<typeof addressFormSchema>;
