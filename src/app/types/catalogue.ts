/**
 * Catalogue TypeScript type definitions
 * 
 * This file exports types and interfaces for catalogue entities:
 * Division, Category, Subcategory, UnitOfMeasure, and ProductStatus
 */

// Base interface for common fields
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// User interface for audit fields
export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// Division entity

export interface Division extends BaseEntity {
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  image: string | null;
  image_alt_text: string | null;
  customer_group_selling_channel_ids: number[];
  customer_group_selling_channels?: Array<{
    id: number;
    name: string;
    [key: string]: any;
  }>;
  created_by: User | null;
  updated_by: User | null;
}

// Category entity
export interface Category extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
  division: number; // Foreign key to Division
  division_name?: string; // For display purposes
  image?: string; // For backend model compatibility
  customer_group_selling_channels?: Array<{
    id: number;
    customer_group: number;
    selling_channel: number;
    status: string;
    segment_name: string;
  }>;
  image_alt_text?: string;
  customer_group_selling_channel_ids: number[];
  company_id?: string;
  default_tax_rate_profile?: number | null;
  default_tax_rate_profile_name?: string;
  tax_inclusive?: boolean;
  sort_order?: number;
  created_by?: User | null;
  updated_by?: User | null;
}

// Subcategory entity
export interface Subcategory extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
  category: number; // Foreign key to Category
  category_name?: string; // For display purposes
  division_name?: string; // For display purposes - comes from API response
  image?: string; // For backend model compatibility
  customer_group_selling_channel_ids?: number[];
  // image_url?: string;
  image_alt_text?: string;
  company_id?: string; // Hardcoded as "1"
  sort_order?: number; // Added sort order field
  created_by?: User | null;
  updated_by?: User | null;
  workflow_flow_id?: number | null; // Added workflow flow ID field
}

// Unit of Measure entity
export interface UnitOfMeasure extends BaseEntity {
  company_id: string;
  name: string;
  symbol: string;
  description?: string;
  is_active: boolean;
  unit_type: 'COUNTABLE' | 'MEASURABLE';
  type_display: string;
  associated_value: number | null;
  created_by: User | null;
  updated_by: User | null;
}

// Product Status entity
export interface ProductStatus extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
  is_orderable: boolean; // Can products with this status be ordered?
  company_id?: string;
  created_by?: User | null;
  updated_by?: User | null;
}

// API response types for catalogue entities
export interface CatalogueListResponse<T> {
  count: {
    total: number;
    [key: string]: any; // Allow other properties
  } | number; // Support both object and number for backward compatibility
  next: string | null;
  previous: string | null;
  results: T[];
  // Pagination metadata
  current_page?: number;
  total_pages?: number;
  page_size?: number;
  // Counts for different statuses
  counts?: {
    active: number;
    inactive: number;
    total: number;
  };
}

// Filter types for catalogue entities
export interface CatalogueFilter {
  search?: string;
  is_active?: boolean;
  division?: number; // For Category filtering
  category?: number; // For Subcategory filtering
  // Pagination parameters
  page?: number;
  page_size?: number;
}
