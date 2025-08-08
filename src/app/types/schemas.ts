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
