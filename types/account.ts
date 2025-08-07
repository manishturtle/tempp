/**
 * Account related type definitions
 */

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  group_type: 'Business' | 'Government' | 'Individual' | 'Other';
  is_active: boolean;
}

export interface AccountSummary {
  id: string;
  name: string;
  account_number?: string;
  status?: string;
}

export interface AddressSummary {
  id: string;
  address_type: string;
  street_1: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  is_billing: boolean;
  is_shipping: boolean;
  formatted_address?: string;
}

export interface ContactSummary {
  id: string | number;
  first_name: string;
  last_name: string;
  full_name?: string;
  account?: {
    id: number;
    name: string;
    account_number: string;
    status: string;
  };
  email: string;
  secondary_email?: string;
  mobile_phone?: string;
  work_phone?: string;
  job_title?: string;
  department?: string;
  status: string;
  owner?: any;
  email_opt_out?: boolean;
  do_not_call?: boolean;
  sms_opt_out?: boolean;
  description?: string;
  client?: number;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  custom_fields?: Record<string, any>;
  is_primary?: boolean;
  fullName?: string; // Backward compatibility
}

export interface CustomField {
  field_id: string;
  value: string | number | boolean | Date | null;
}

export interface CustomFieldDefinition {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'DATETIME' | 'CHECKBOX' | 'PICKLIST';
  is_required: boolean;
  is_active: boolean;
  picklist_values?: Array<{id: string; label: string}>;
  default_value?: string | number | boolean | null;
}

// Child account summary type
export interface ChildAccountSummary extends AccountSummary {
  status: string;
  owner?: string;
  location?: string;
}

export interface AccountDetailData {
  id: string;
  name: string;
  account_number?: string;
  customer_group?: CustomerGroup;
  parent_account?: AccountSummary;
  child_accounts?: ChildAccountSummary[];
  status: string;
  owner?: User;
  website?: string;
  primary_phone?: string;
  description?: string;
  
  // Business/Government specific fields
  legal_name?: string;
  industry?: string;
  company_size?: string;
  tax_id?: string;
  
  // Related data
  addresses?: AddressSummary[];
  contacts?: ContactSummary[];
  custom_fields?: Record<string, any>;
  
  // System fields
  created_at: string;
  updated_at: string;
  created_by?: User;
  updated_by?: User;
}
