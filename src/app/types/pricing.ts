/**
 * Pricing TypeScript type definitions
 * 
 * This file exports types and interfaces for pricing and tax entities:
 * CustomerGroup, SellingChannel, TaxRegion, TaxRate, TaxRateProfile
 */

// User interface for audit fields
export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// Base interface for common fields (following pattern from catalogue.ts)
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  created_by?: User;
  updated_by?: User;
}

// Customer Group entity
export interface CustomerGroup extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  company_id: number;
  client_id: number;
  created_by_id: number;
  updated_by_id: number;
  created_by?: User;
  updated_by?: User;
}

// Selling Channel entity
export interface SellingChannel extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface SellingChannelListResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: SellingChannel[];
  counts?: {
    total: number;
    active: number;
    inactive: number;
  };
  filtered_count?: number;
}

// Country entity for use in TaxRegion
export interface Country {
  id: number;
  name: string;
  code: string;
}

// Tax Region entity
export interface TaxRegion extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  countries: Country[]; // Many-to-many relationship with countries
}

// Tax Rate entity
export interface TaxRate extends BaseEntity {
  // New field structure based on API response
  rate_name: string;
  tax_type_code: string;
  rate_percentage: number;
  effective_from: string;
  effective_to?: string;
  country_code: string;
  is_active: boolean;
  company_id?: number;
  client_id?: number;
  // Optional legacy fields for backward compatibility
  description?: string;
  // For validation and submission
  tax_regions?: number[];
}

// Tax Rate Profile Condition entity
export interface TaxRateCondition {
  attribute_name: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  condition_value: string;
}

// Tax Rate Profile Outcome entity
export interface TaxRateOutcome {
  tax_rate: number; // ID of the tax rate
}

// Tax Rate Profile Rule entity
export interface TaxRateRule {
  priority: number;
  is_active: boolean;
  effective_from: string; // ISO date string
  effective_to: string; // ISO date string
  conditions: TaxRateCondition[];
  outcomes: TaxRateOutcome[];
}

// Tax Rate Profile entity (updated structure)
export interface TaxRateProfile extends BaseEntity {
  profile_name: string;
  description?: string | null;
  country_code: string;
  is_active: boolean;
  rules: TaxRateRule[];
  // Legacy fields for backward compatibility
  name?: string;
  code?: string | null;
  tax_rates?: number[] | TaxRate[];
  is_default?: boolean;
}

// API response types for pricing entities
export interface PricingListResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
  counts?: {
    total: number;
    active: number;
    inactive: number;
  };
  filtered_count?: number;
}

// Filter types for pricing entities
export interface PricingFilter {
  search?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
  paginated?: boolean;
}
