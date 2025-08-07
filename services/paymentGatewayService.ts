import { COCKPIT_API_BASE_URL } from "@/utils/constants";
import { BankAccount } from "./bankAccountService";
import { getAuthHeaders } from "../hooks/api/auth";

export interface PaymentGateway {
  id: number;
  gateway_name: string;
  api_key: string;
  api_secret: string;
  webhook_secret: string;
  merchant_id: string;
  success_webhook_url: string;
  failure_webhook_url: string;
  supported_currencies: string;
  mdr_percentage: string;
  mdr_fixed_fee: number;
  settlement_bank_account: BankAccount;
  refund_api_endpoint: string;
  supports_partial_refunds: boolean;
  is_active: boolean;
  client_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  supported_currencies_list: string[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetches all payment gateways
 */
export const getPaymentGateways = async (tenantSlug: string): Promise<PaginatedResponse<PaymentGateway>> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/gateways/`, {
    headers: {
        ...getAuthHeaders()
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch payment gateways');
  }
  
  return response.json();
};

/**
 * Fetches a single payment gateway by ID
 */
export const getPaymentGateway = async (id: string, tenantSlug: string): Promise<PaymentGateway> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/gateways/${id}/`, {
    headers: {
        ...getAuthHeaders()
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch payment gateway with ID: ${id}`);
  }
  
  return response.json();
};

/**
 * Creates a new payment gateway
 */
export const createPaymentGateway = async (data: Omit<PaymentGateway, 'id' | 'supported_currencies_list'>, tenantSlug: string): Promise<PaymentGateway> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/gateways/`, {
    method: 'POST',
    headers: {
        ...getAuthHeaders()
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment gateway');
  }
  
  return response.json();
};

/**
 * Updates an existing payment gateway
 */
export const updatePaymentGateway = async (id: string, data: Partial<Omit<PaymentGateway, 'supported_currencies_list'>>, tenantSlug: string): Promise<PaymentGateway> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/gateways/${id}/`, {
    method: 'PATCH',
    headers: {
        ...getAuthHeaders()
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update payment gateway with ID: ${id}`);
  }
  
  return response.json();
};

/**
 * Deletes a payment gateway
 */
export const deletePaymentGateway = async (id: string, tenantSlug: string): Promise<void> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/gateways/${id}/`, {
    method: 'DELETE',
    headers: {
        ...getAuthHeaders()
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete payment gateway with ID: ${id}`);
  }
};
