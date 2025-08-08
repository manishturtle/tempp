import { useMutation, UseMutationOptions, UseMutationResult, useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';

export interface GuestAccount {
  id: number;
  name: string;
  legal_name: string | null;
  account_number: string | null;
  status: string;
  customer_group: {
    id: number;
    group_name: string;
    group_type: string;
    is_active: boolean;
  };
  effective_customer_group: {
    id: number;
    group_name: string;
    group_type: string;
    is_active: boolean;
  };
  // Add other fields as needed
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile_phone: string | null;
  status: string;
  // Add other fields as needed
}

export interface GuestAccountResponse {
  account: GuestAccount;
  contact: Contact;
  message: string;
  contact_status: 'existing' | 'created';
}

export interface CreateGuestAccountData {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_phone?: string;
  contact?: {
    email: string;
    first_name: string;
    last_name: string;
    mobile_phone?: string;
  };
}

export const useCreateGuestAccount = (
    options?: Omit<UseMutationOptions<GuestAccountResponse, Error, CreateGuestAccountData>, 'mutationFn'>
  ): UseMutationResult<GuestAccountResponse, Error, CreateGuestAccountData> => {
    return useMutation<GuestAccountResponse, Error, CreateGuestAccountData>({
      mutationFn: async (data: CreateGuestAccountData) => {
        const response = await api.post<GuestAccountResponse>('guest/accounts/', data);
        return response.data;
      },
      ...options,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    });
  };

export const useGetGuestAccount = (accountId: number, options?: any) => {
  return useQuery<GuestAccountResponse, Error>({
    queryKey: ['guest-account', accountId],
    queryFn: async () => {
      const response = await api.get<GuestAccountResponse>(`guest/accounts/${accountId}/`);
      return response.data;
    },
    enabled: !!accountId,
    ...options,
  });
};