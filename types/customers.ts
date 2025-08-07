/**
 * Customer Types
 * 
 * Type definitions for customer-related entities in the ERP system.
 * These types match the expected API response structures from the Django backend.
 */

/**
 * Basic representation of a user for owner, created_by, and updated_by fields
 */
export interface BasicUser {
  id: string; // BigInt from backend
  username: string;
  full_name?: string;
  email?: string;
  is_active?: boolean;
}

/**
 * Base audit information included in most entity responses
 */
export interface BaseAuditInfo {
  id: string; // BigInt from backend
  client?: number; // If exposed by API
  company_id?: number; // If exposed by API
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
  created_by?: BasicUser | null;
  updated_by?: BasicUser | null;
}

/**
 * Customer Group data
 */
export interface SellingChannel {
  id: number;
  selling_channel_id: number;
  selling_channel_name: string;
  status: string;
  segment_name: string;
}

export interface CustomerGroup {
  id: string; // BigInt from backend
  group_name: string;
  group_type: 'BUSINESS' | 'INDIVIDUAL' | 'GOVERNMENT' | string;
  is_active: boolean;
  selling_channel_ids?: number[];
  selling_channels?: SellingChannel[];
  client?: number;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: BasicUser | null;
  updated_by?: BasicUser | null;
  display_name?: string;
  description?: string;
  custom_fields?: Record<string, any>;
}

/**
 * Address data for both form submission and API responses
 */
export interface ApiAddress {
  id?: string; // Optional for create operations
  address_type: 'BILLING' | 'SHIPPING' | 'BRANCH' | 'MAILING' | 'OTHER' | string;
  street_1: string;
  street_2?: string | null;
  street_3?: string | null;
  city: string;
  state?: string | null;
  state_province?: string | null; // Alternative field name from API
  postal_code: string;
  country: string; // ISO 3166-1 alpha-2 code
  is_default?: boolean;
  is_billing?: boolean;
  is_shipping?: boolean;
  is_primary_billing?: boolean;
  is_primary_shipping?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  custom_fields?: Record<string, any>;
}

/**
 * Account summary for parent/child relationships
 */
export interface AccountSummary {
  id: string;
  name: string;
  account_number?: string;
  status?: string;
}

/**
 * Child account summary with additional fields
 */
export interface ChildAccountSummary extends AccountSummary {
  owner?: BasicUser | null;
  location?: string;
}

/**
 * Contact summary for lists on Account Detail
 */
export interface ContactSummary {
  id: string;
  first_name: string;
  last_name?: string | null;
  full_name?: string;
  job_title?: string | null;
  email?: string | null;
  work_phone?: string | null;
  mobile_phone?: string | null;
  is_primary?: boolean;
  status?: string;
}

/**
 * API Contact data structure
 */
export interface ApiContact extends BaseAuditInfo {
  first_name: string;
  last_name?: string | null;
  full_name?: string;
  account?: AccountSummary | null;
  email?: string | null;
  secondary_email?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  job_title?: string | null;
  department?: string | null;
  status: string;
  owner?: BasicUser | null;
  email_opt_out: boolean;
  do_not_call: boolean;
  sms_opt_out: boolean;
  description?: string | null;
  custom_fields?: Record<string, any>;
  is_primary?: boolean;
}

/**
 * Account data structure matching API response
 */
export interface Account extends BaseAuditInfo {
  name: string;
  legal_name?: string | null;
  account_number?: string | null;
  customer_group?: CustomerGroup;
  parent_account?: AccountSummary | null;
  status: string;
  owner?: BasicUser | null;
  website?: string | null;
  primary_phone?: string | null;
  customer_reference?: string | null;
  account_type?: string | null;
  contract_start_date?: string | null;
  vat_exempt?: boolean;
  industry?: string | null;
  company_size?: string | null;
  tax_id?: string | null;
  description?: string | null;
  custom_fields?: Record<string, any>;
  addresses: ApiAddress[];
  contacts: ApiContact[];
  child_accounts?: ChildAccountSummary[];
  effective_customer_group?: CustomerGroup; // For inheritance scenarios
}

/**
 * Task data structure
 */
export interface TaskData extends BaseAuditInfo {
  subject: string;
  due_date?: string | null; // ISO Date string
  status: string; // 'Not Started', 'In Progress', 'Completed', 'Deferred'
  priority?: string | null; // 'High', 'Normal', 'Low'
  owner?: BasicUser | null; // Assignee
  related_account?: AccountSummary | null;
  related_contact?: ContactSummary | null;
  description?: string | null;
  custom_fields?: Record<string, any>;
}

/**
 * Activity data structure
 */
export interface ActivityData extends BaseAuditInfo {
  subject?: string | null;
  activity_type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | string;
  activity_datetime: string; // ISO DateTime string
  description?: string | null;
  related_account?: AccountSummary | null;
  related_contact?: ContactSummary | null;
  owner?: BasicUser | null; // User who logged/performed
  custom_fields?: Record<string, any>;
}

/**
 * Timeline item for combined activity/task views
 */
export type TimelineItemData =
  | { type: 'TASK'; date: string; data: TaskData }
  | { type: 'ACTIVITY'; date: string; data: ActivityData };

/**
 * Account statistics type
 */
export interface AccountStats {
  total: number;
  active: number;
  inactive: number;
  prospect: number;
  myAccounts: number;
  newThisMonth: number;
  recentlyUpdated: number;
}

/**
 * Type for filter state
 */
export interface FilterState {
  field: string;
  operator: string;
  value: any;
}
