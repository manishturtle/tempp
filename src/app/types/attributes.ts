/**
 * Attributes TypeScript type definitions
 * 
 * This file exports types and interfaces for attribute entities:
 * AttributeGroup, Attribute, AttributeOption
 */

// Base interface for common fields (following pattern from catalogue.ts)
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  created_by_id?: number;
  updated_by_id?: number;
  client_id?: number;
  company_id?: number;
}

// AttributeGroup entity
export interface AttributeGroup extends BaseEntity {
  name: string;
  display_order?: number;
  is_active: boolean;
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// Attribute data types enum
export enum AttributeDataType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT'
}

// ValidationRules interface for different attribute types
export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  regex_pattern?: string;
  date_format?: string;
  min_date?: string;
  max_date?: string;
  [key: string]: any; // Allow for custom validation rules
}

// Attribute entity
export interface Attribute extends BaseEntity {
  name: string;
  code: string;
  label: string;
  data_type: AttributeDataType;
  description?: string;
  is_required: boolean;
  is_filterable: boolean;
  use_for_variants: boolean;
  show_on_pdp: boolean;
  is_active: boolean;
  validation_rules?: ValidationRules;
  groups: AttributeGroup[] | number[];
  options?: AttributeOption[];
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// AttributeOption entity
export interface AttributeOption extends BaseEntity {
  attribute?: number | { id: number; name?: string; [key: string]: any };
  option_label: string;
  option_value: string;
  sort_order: number;
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// AttributeOptionInput for creating/updating options
export interface AttributeOptionInput {
  id?: number; // Optional for updates, not present for new options
  option_label: string;
  option_value: string;
  sort_order: number;
}

// Form data for creating/updating attributes
export interface AttributeFormValues {
  name: string;
  code: string;
  label: string;
  description: string;
  data_type: AttributeDataType;
  validation_rules: string | ValidationRules; // String for form, object for API
  use_for_variants: boolean;
  show_on_pdp: boolean;
  groups: number[];
  is_required: boolean;
  is_filterable: boolean;
  is_active: boolean;
  options: AttributeOptionInput[]; // For SELECT and MULTI_SELECT attributes
}

// API response types for attribute entities
export interface AttributesListResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
  counts?: {
    active: number;
    inactive: number;
    total: number;
  };
  filtered_count: number;
}

// Filter types for attribute entities
export interface AttributesFilter {
  search?: string;
  is_active?: boolean;
  is_required?: boolean;
  is_filterable?: boolean;
  data_type?: AttributeDataType | string;
  use_for_variants?: boolean;
  group?: number | number[]; // Filter by attribute group(s) - can be single ID or array of IDs
  page?: number; // Pagination - current page
  page_size?: number; // Pagination - items per page
}

// Interface for updating attribute group
export interface UpdateAttributeGroupRequest {
  id: number;
  data: Partial<AttributeGroup>;
}

// Interface for updating attribute
export interface UpdateAttributeRequest {
  id: number;
  data: Partial<AttributeFormValues> & { options_input?: AttributeOptionInput[] };
}

// Interface for updating attribute option
export interface UpdateAttributeOptionRequest {
  id: number;
  data: Partial<AttributeOption>;
}
