import { z } from 'zod';

/**
 * Login form schema with validation rules
 */
export const loginSchema = z.object({
  email: z.string()
    .email({ message: 'Invalid email address' })
    .min(1, { message: 'Email is required' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .min(1, { message: 'Password is required' }),
});

/**
 * Type inference for login form data
 */
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * User registration form schema with validation rules
 */
export const registerSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .min(1, { message: 'Name is required' }),
  email: z.string()
    .email({ message: 'Invalid email address' })
    .min(1, { message: 'Email is required' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .min(1, { message: 'Password is required' }),
  confirmPassword: z.string()
    .min(1, { message: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Type inference for registration form data
 */
export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Contact form schema with validation rules
 */
export const contactFormSchema = z.object({
  email_address: z.string().email("Invalid email address").optional().or(z.literal('')), // Allow empty string to clear
  phone_number: z.string().min(10, "Phone number seems too short").max(20, "Phone number seems too long").optional().or(z.literal('')), // Basic length check
  first_name: z.string().optional().or(z.literal('')),
  last_name: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  is_email_subscribed: z.boolean().default(true),
  is_sms_opt_in: z.boolean().default(false),
  is_whatsapp_opt_in: z.boolean().default(false),
  custom_attributes: z.record(z.string(), z.any()).optional(), // For MVP, keep simple. Could be more structured.
}).refine(data => !!data.email_address || !!data.phone_number, {
  message: "Either email address or phone number must be provided.",
  path: ["email_address"], // Path to show error, can also be on phone_number or a general form error
});

/**
 * Type inference for contact form data
 */
export type ContactFormData = z.infer<typeof contactFormSchema>;

/**
 * List form schema with validation rules
 */
export const listFormSchema = z.object({
  name: z.string().min(3, "List name must be at least 3 characters long."),
  description: z.string().optional().or(z.literal('')),
  list_type: z.enum(['STATIC', 'DYNAMIC_SEGMENT'] as const, {
    required_error: "List type is required.",
  }),
  initial_contacts: z.array(z.number()).optional(),
});

/**
 * Type inference for list form data
 */
export type ListFormData = z.infer<typeof listFormSchema>;
