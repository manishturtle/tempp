import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { PAYMENT_SERVICES_BASE_URL } from '@/app/constant';

export interface BankAccount {
  id: number;
  bank_name: string;
  account_holder_name: string;
  is_active: boolean;
  client_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  account_number: string;
}

interface BankAccountsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BankAccount[];
}

const BANK_ACCOUNTS_ENDPOINT = `${PAYMENT_SERVICES_BASE_URL}/payment-services/bank-accounts/`;

/**
 * Hook to fetch bank accounts
 * @param options - Query options
 * @returns Query result with bank accounts data
 */
export const useBankAccounts = (
  options?: Omit<
    UseQueryOptions<BankAccountsResponse, Error>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<BankAccountsResponse, Error> => {
  return useQuery<BankAccountsResponse, Error>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const response = await fetch(BANK_ACCOUNTS_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bank accounts');
      }
      
      return response.json();
    },
    ...options,
  });
};

/**
 * Hook to fetch a single bank account by ID
 * @param id - The ID of the bank account to fetch
 * @param options - Query options
 * @returns Query result with the bank account data
 */
export const useBankAccount = (
  id: number,
  options?: Omit<
    UseQueryOptions<BankAccount, Error>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<BankAccount, Error> => {
  return useQuery<BankAccount, Error>({
    queryKey: ['bank-account', id],
    queryFn: async () => {
      const response = await fetch(`${BANK_ACCOUNTS_ENDPOINT}${id}/`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bank account ${id}`);
      }
      
      return response.json();
    },
    ...options,
  });
};
