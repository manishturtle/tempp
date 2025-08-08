/**
 * Common TypeScript type definitions
 * 
 * This file exports shared types and interfaces used throughout the application
 */

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type UserRole = 'admin' | 'manager' | 'user';

// API response types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form related types
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    message?: string;
  };
}

// Theme related types
export type ThemeMode = 'light' | 'dark';
export type ColorTheme = 'blue' | 'purple' | 'green' | 'teal' | 'indigo' | 'amber';
