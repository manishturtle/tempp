import { COCKPIT_API_BASE_URL } from "@/utils/constants";
import { getAuthHeaders } from "../hooks/api/auth";

export interface BankAccount {
  id: number;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  is_active: boolean;
  client_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


/**
 * Fetches all bank accounts
 */
export const getBankAccounts = async (tenantSlug: string): Promise<PaginatedResponse<BankAccount>> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/bank-accounts/`, {
    headers: {
        ...getAuthHeaders()
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch bank accounts');
  }
  
  return response.json();
};

/**
 * Fetches a single bank account by ID
 */
export const getBankAccount = async (id: string, tenantSlug: string): Promise<BankAccount> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/bank-accounts/${id}/`, {
    headers: {
        ...getAuthHeaders()
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch bank account with ID: ${id}`);
  }
  
  return response.json();
};

/**
 * Creates a new bank account
 */
export const createBankAccount = async (data: Omit<BankAccount, 'id'>, tenantSlug: string): Promise<BankAccount> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/bank-accounts/`, {
    method: 'POST',
    headers: {
        ...getAuthHeaders()
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create bank account');
  }
  
  return response.json();
};

/**
 * Updates an existing bank account
 */
export const updateBankAccount = async (id: string, data: Partial<BankAccount>, tenantSlug: string): Promise<BankAccount> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/bank-accounts/${id}/`, {
    method: 'PATCH',
    headers: {
        ...getAuthHeaders()
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update bank account with ID: ${id}`);
  }
  
  return response.json();
};

/**
 * Deletes a bank account
 */
export const deleteBankAccount = async (id: string, tenantSlug: string): Promise<void> => {
  const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/payment-services/bank-accounts/${id}/`, {
    method: 'DELETE',
    headers: {
        ...getAuthHeaders()
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete bank account with ID: ${id}`);
  }
};
