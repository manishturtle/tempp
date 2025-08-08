/**
 * Invoice type definitions for admin interface
 */

// Account information included in invoice
export interface InvoiceAccount {
  id: number;
  name: string;
  account_number: string | null;
}

// Contact information included in invoice
export interface InvoiceContact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

// Detailed account information
export interface AccountDetail {
  id: number;
  name: string;
  legal_name: string | null;
  account_number: string | null;
  status: string;
  website: string | null;
  primary_phone: string | null;
  industry: string | null;
  tax_id: string | null;
}

// Detailed contact information
export interface ContactDetail {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile_phone: string | null;
  work_phone: string | null;
  job_title: string | null;
  department: string | null;
  status: string;
}

// Line item in invoice
export interface InvoiceLineItem {
  name: string;
  rate: number;
  total: number;
  quantity: number;
  product_sku: string;
  product_name: string;
  tax_percentage: number;
}

// Invoice status and payment status types
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type InvoiceType = 'TAX' | 'NON_TAX';
export type GSTTreatment = 'BUSINESS_GST' | 'BUSINESS_NON_GST' | 'OVERSEAS' | 'CONSUMER';
export type DiscountType = 'PERCENTAGE' | 'FIXED';

/**
 * Invoice object returned from the admin API
 */
export interface AdminInvoice {
  id: number;
  client_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  custom_fields: Record<string, any>;
  account: InvoiceAccount | null;
  contact: InvoiceContact | null;
  order_id: string;
  invoice_number: string;
  reference_number: string;
  place_of_supply: string;
  gst_treatment: GSTTreatment;
  gst_no: string | null;
  template_id: number;
  date: string;
  payment_terms: number;
  payment_terms_label: string | null;
  due_date: string;
  sub_total: string;
  discount_amount: string;
  currency: string;
  is_discount_before_tax: boolean;
  discount_type: DiscountType;
  is_inclusive_tax: boolean;
  other_charges: string;
  total_tax_amount: string;
  grand_total: string;
  line_items: InvoiceLineItem[];
  allow_partial_payments: boolean;
  notes: string;
  terms: string;
  invoice_status: InvoiceStatus;
  invoice_type: InvoiceType;
  payment_status: PaymentStatus;
  invoice_url: string | null;
  tenant_slug: string | null;
  account_detail: AccountDetail | null;
  contact_detail: ContactDetail | null;
  customer_details: {
    full_name: string;
    email: string;
    mobile_phone: string | null;
    work_phone: string | null;
    job_title: string | null;
    department: string | null;
    account_name: string;
  } | null;
  billing_address: {
    city: string;
    state: string;
    country: string;
    full_name: string;
    postal_code: string;
    phone_number: string;
    address_line1: string;
    address_line2: string;
  } | null;
  shipping_address: {
    city: string;
    state: string;
    country: string;
    full_name: string;
    postal_code: string;
    phone_number: string;
    address_line1: string;
    address_line2: string;
  } | null;
}

/**
 * Paginated response for admin invoices
 */
export interface AdminInvoicesPaginated {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: AdminInvoice[];
}
