/**
 * Defines the types and interfaces for the order management system
 */

export enum OrderMode {
  CREATE = "create",
  EDIT = "edit",
  VIEW = "view",
}

export interface Account {
  id: number;
  /**
   * Name of the account
   */
  name: string;
  customer_group: {
    id: number;
    group_name: string;
    group_type: string;
  };
  addresses: any[];
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  account_id: number;
  mobile_phone?: string;
  work_phone?: string;
  full_name?: string;
}

export interface SellingChannel {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface CustomerDetails {
  account_id?: number;
  account_name?: string;
  contact_id?: number;
  contact_person_name?: string;
  selling_channel_id?: number;
  responsible_person?: number;
  customer_group_id?: number;
  account?: Account;
}

export interface OrderSettings {
  order_id?: string;
  order_date: string | null;
  order_status: string;
  responsible_person?: number | undefined;
}

export interface discountSettings {
  discount_type?: "PERCENTAGE" | "AMOUNT";
  discount_percentage?: number;
  discount_amount?: number;
}

export interface ShippingAddress {
  id?: number;
  business_name?: string | null;
  gst_number?: string | null;
  street_1: string;
  street_2?: string | null;
  full_name: string;
  phone_number: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
}

export interface StaffUser {
  users: any[];
  current_user?: number | undefined;
}

export interface OrderData {
  order_id?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  subtotal_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  other_charges?: number;
  shipping_address?: ShippingAddress;
  billing_address?: any;
  items?: any[];
  recipient_details?: {
    name: string;
    phone: string;
  };
  storepickup?: number;
  pickup_details?: {
    name: string;
    phone: string;
  };
  delivery_preferences?: any;
  fulfillment_type?: string;
  account_id?: number;
  account_name?: string;
  contact_id?: number;
  contact_person_name?: string;
  selling_channel_id?: number;
  responsible_person?: number;
  customer_group_id?: number;
  order_date: string | null;
  discountSettings?: discountSettings;
}

export interface InvoiceData {
  account?: Account;
  account_id?: number;
  account_name?: string;
  contact_id?: number;
  contact_person_name?: string;
  selling_channel_id?: number;
  responsible_person?: number;
  customer_group_id?: number;
  invoice_number?: string;
  reference_number?: string;
  place_of_supply?: string;
  gst_treatment?: string;
  issue_date?: string;
  payment_terms?: string;
  payment_terms_label?: string;
  due_date?: string;
  subtotal_amount?: number;
  discountSettings?: discountSettings;
  currency?: string;
  tax_amount?: number;
  total_amount?: number;
  rounded_delta?: number;
  notes?: string;
  terms?: string;
  invoice_status?: string;
  invoice_type?: string;
  payment_status?: string;
  shipping_address?: ShippingAddress;
  billing_address?: ShippingAddress;
  recipient_details?: {
    name: string;
    phone: string;
  };
  storepickup?: number;
  pickup_details?: {
    name: string;
    phone: string;
  };
  amount_paid?: number;
  amount_due?: number;
  items?: any[];
  fulfillment_type?: string;
  same_as_shipping?: boolean;
}
