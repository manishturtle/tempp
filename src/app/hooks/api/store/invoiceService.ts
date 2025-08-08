import api from '@/lib/storeapi';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import AuthService from '@/app/auth/services/authService';

/**
 * LineItem interface defines the structure for a single line item in an invoice
 */
interface LineItem {
  name: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  rate: number;
  tax_percentage: number;
  total: number;
}

/**
 * Address interface defines the structure for shipping and billing addresses
 */
interface Address {
  city: string;
  state: string;
  country: string;
  full_name: string;
  postal_code: string;
  phone_number: string;
  address_line1: string;
  address_line2: string;
}

/**
 * InvoicePayload interface defines the structure for creating or updating an invoice
 */
export interface InvoicePayload {
  order_id: string;
  invoice_number?: string;
  reference_number?: string;
  place_of_supply: string;
  gst_treatment: string;
  gst_no?: string;
  date: string;
  payment_terms: number;
  due_date: string;
  currency: string;
  discount_type: string;
  discount_amount: number;
  other_charges: number;
  invoice_status: string;
  invoice_type: string;
  notes?: string;
  terms?: string;
  line_items: LineItem[];
  subtotal_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  shipping_address?: Address;
  billing_address?: Address;
}

/**
 * AccountInfo interface defines the structure for account information in an invoice response
 */
interface AccountInfo {
  id: number;
  name: string;
  account_number: string | null;
}

/**
 * ContactInfo interface defines the structure for contact information in an invoice response
 */
interface ContactInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
}

/**
 * Invoice interface defines the structure of an invoice response from the API
 */
export interface Invoice {
  id: number;
  account: AccountInfo;
  contact: ContactInfo;
  order_id: string;
  invoice_number: string;
  sub_total: string;
  total_tax_amount: string;
  grand_total: string;
  payment_status: string;
  created_by: string;
  updated_by: string;
  client_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  custom_fields: Record<string, unknown>;
  reference_number: string;
  shipping_address?: Address;
  billing_address?: Address;
  place_of_supply: string;
  gst_treatment: string;
  gst_no: string | null;
  template_id: number;
  date: string;
  payment_terms: number;
  payment_terms_label: string | null;
  due_date: string;
  discount_amount: string;
  currency: string;
  is_discount_before_tax: boolean;
  discount_type: string;
  is_inclusive_tax: boolean;
  other_charges: string;
  line_items: LineItem[];
  allow_partial_payments: boolean;
  notes: string;
  terms: string;
  invoice_status: string;
  invoice_type: string;
  invoice_url: string | null;
}

/**
 * Creates a new invoice
 * 
 * @param payload - The invoice data
 * @returns Promise resolving to the created invoice
 */
export const createInvoice = async (payload: InvoicePayload): Promise<Invoice> => {
  try {
    // if (!isAuthenticated()) {
    //   throw new Error('User not authenticated');
    // }
    
    const token = AuthService.getToken();
    const isAuth = !!token;
    
    // Use guest endpoint if not authenticated, otherwise use regular endpoint
    const url = isAuth ? '/invoices/invoices/' : '/invoices/guest/invoices/';
    
    const response = await api.post(
      url,
      payload,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

/**
 * Gets a list of invoices
 * 
 * @param params - Optional query parameters
 * @returns Promise resolving to an array of invoices
 */
export const getInvoices = async (params?: Record<string, string>): Promise<Invoice[]> => {
  try {
    // if (!isAuthenticated()) {
    //   throw new Error('User not authenticated');
    // }
    
    const token = AuthService.getToken();
    
    const response = await api.get(
      '/invoices/invoices/',
      {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

/**
 * Gets a specific invoice by ID
 * 
 * @param id - The invoice ID
 * @returns Promise resolving to the invoice
 */
export const getInvoiceById = async (id: number): Promise<Invoice> => {
  try {
    // if (!isAuthenticated()) {
    //   throw new Error('User not authenticated');
    // }
    
    const token = AuthService.getToken();
    const isAuth = !!token;
    
    // Use guest endpoint if not authenticated, otherwise use regular endpoint
    const url = isAuth 
      ? `/invoices/invoices/${id}/` 
      : `/invoices/guest/invoices/${id}/`;
    
    const response = await api.get(
      url,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching invoice ${id}:`, error);
    throw error;
  }
};

/**
 * Updates an existing invoice
 * 
 * @param id - The invoice ID
 * @param payload - The updated invoice data
 * @returns Promise resolving to the updated invoice
 */
export const updateInvoice = async (id: number, payload: Partial<InvoicePayload>): Promise<Invoice> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const response = await api.patch(
      `/invoices/invoices/${id}/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error updating invoice ${id}:`, error);
    throw error;
  }
};

/**
 * Cancels an invoice
 * 
 * @param id - The invoice ID
 * @returns Promise resolving to the cancelled invoice
 */
export const cancelInvoice = async (id: number): Promise<Invoice> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const response = await api.post(
      `/api/v1/invoices/invoices/${id}/cancel/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error cancelling invoice ${id}:`, error);
    throw error;
  }
};

/**
 * Gets the PDF URL for an invoice
 * 
 * @param id - The invoice ID
 * @returns Promise resolving to the PDF URL
 */
export const getInvoicePdfUrl = async (id: number): Promise<{ pdf_url: string }> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const response = await api.get(
      `/api/v1/invoices/invoices/${id}/pdf/`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error getting PDF URL for invoice ${id}:`, error);
    throw error;
  }
};
