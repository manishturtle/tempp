import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { PAYMENT_SERVICES_BASE_URL } from '@/app/constant';

export interface SettlementBankAccount {
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
  masked_account_number: string;
}

export interface PaymentGateway {
  id: number;
  gateway_name: string;
  merchant_id: string;
  success_webhook_url: string;
  failure_webhook_url: string;
  supported_currencies: string;
  mdr_percentage: string;
  mdr_fixed_fee: number;
  settlement_bank_account: SettlementBankAccount;
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

interface PaymentGatewaysResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PaymentGateway[];
}

const GATEWAYS_ENDPOINT = `${PAYMENT_SERVICES_BASE_URL}/payment-services/gateways/`;

/**
 * Hook to fetch payment gateways
 * @param options - Query options
 * @returns Query result with payment gateways data
 */
export const usePaymentGateways = (
  options?: Omit<
    UseQueryOptions<PaymentGatewaysResponse, Error>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<PaymentGatewaysResponse, Error> => {
  return useQuery<PaymentGatewaysResponse, Error>({
    queryKey: ['payment-gateways'],
    queryFn: async () => {
      const response = await fetch(GATEWAYS_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment gateways');
      }
      
      return response.json();
    },
    ...options,
  });
};

/**
 * Hook to fetch a single payment gateway by ID
 * @param id - The ID of the payment gateway to fetch
 * @param options - Query options
 * @returns Query result with the payment gateway data
 */
export const usePaymentGateway = (
  id: number,
  options?: Omit<
    UseQueryOptions<PaymentGateway, Error>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<PaymentGateway, Error> => {
  return useQuery<PaymentGateway, Error>({
    queryKey: ['payment-gateway', id],
    queryFn: async () => {
      const response = await fetch(`${GATEWAYS_ENDPOINT}${id}/`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch payment gateway ${id}`);
      }
      
      return response.json();
    },
    ...options,
  });
};
