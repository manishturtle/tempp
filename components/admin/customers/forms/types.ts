/**
 * Shared types for customer forms
 */

export interface AccountData {
  id: string;
  name: string;
  status: string;
  customer_group?: string | number;
  parent_account?: string | number;
  account_number?: string;
  owner?: string | null;
  website?: string;
  primary_phone?: string;
  customer_reference?: string;
  account_type?: string;
  contract_start_date?: string | null;
  vat_exempt?: boolean;
  legal_name?: string;
  industry?: string;
  company_size?: string;
  tax_id?: string;
  description?: string;
  custom_fields?: Record<string, any>;
}

export interface AddressData {
  id: string;
  address_type: string;
  street_1: string;
  street_2?: string;
  street_3?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  is_billing: boolean;
  is_shipping: boolean;
}

export interface ContactData {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  secondary_email?: string;
  mobile_phone?: string;
  work_phone?: string;
  job_title?: string;
  department?: string;
  status: string;
  owner?: string | null;
  description?: string;
  is_primary?: boolean;
  email_opt_out?: boolean;
  do_not_call?: boolean;
  sms_opt_out?: boolean;
  account_id?: string;
}

export interface AccountFormData extends AccountData {
  addresses?: AddressData[];
  contacts?: ContactData[];
}
