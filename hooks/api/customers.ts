/**
 * Customer API Hooks
 * 
 * Custom hooks for interacting with customer-related API endpoints
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Account, AccountStats, CustomerGroup, ApiContact } from '@/app/types/customers';

interface FetchAccountsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  ordering?: string;
}

interface AccountsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  active_count: number;
  inactive_count: number;
  prospect_count: number;
  results: Account[];
}

import { getAuthHeaders } from './auth';

/**
 * Hook to fetch accounts with optional pagination and filtering
 */

export const useFetchAccounts = (params: FetchAccountsParams = {}) => {
  return useQuery<AccountsResponse>({
    queryKey: ['accounts', params],
    queryFn: async () => {
      const { page = 1, pageSize = 10, status, search, ordering } = params;
      const queryParams = new URLSearchParams();
      
      queryParams.append('page', page.toString());
      queryParams.append('page_size', pageSize.toString());
      
      if (status && status !== 'all') {
        queryParams.append('status', status);
      }
      
      if (search) {
        queryParams.append('search', search);
      }
      
      if (ordering) {
        queryParams.append('ordering', ordering);
      }
      
      // Use the correct endpoint URL and add authorization header
      const response = await api.get(`accounts/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData // Keep previous data while fetching new data
  });
};

/**
 * Hook to fetch account statistics
 */
export const useFetchAccountStats = () => {
  return useQuery<AccountStats>({
    queryKey: ['accountStats'],
    queryFn: async () => {
      const response = await api.get('accounts/stats/', {
        headers: getAuthHeaders()
      });
      return response.data;
    },
  });
};

/**
 * Hook to fetch a single account by ID
 */
export const useFetchAccount = (id: number | null) => {
  return useQuery<Account>({
    queryKey: ['account', id],
    queryFn: async () => {
      if (!id) throw new Error('Account ID is required');
      const response = await api.get(`accounts/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!id,
    placeholderData: (previousData) => previousData // Keep previous data while fetching new data
  });
};

/**
 * Hook to create a new account
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountData: Partial<Account>) => {
      const response = await api.post('accounts/', accountData, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountStats'] });
    },
  });
};

/**
 * Hook to update an existing account
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Account> }) => {
      const response = await api.patch(`accounts/${id}/`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', data.id] });
      queryClient.invalidateQueries({ queryKey: ['accountStats'] });
    },
  });
};

/**
 * Hook to delete an account
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`accounts/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accountStats'] });
    },
  });
};

/**
 * Direct API function to get account by ID
 * Used for server components or direct API calls
 */
export const getAccountById = async (id: string): Promise<Account> => {
  const response = await api.get(`accounts/${id}/`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Customer Group API Functions

interface FetchCustomerGroupsParams {
  page?: number;
  page_size?: number;
  group_type?: string;
  is_active?: boolean;
  ordering?: string;
}

interface CustomerGroupsResponse {
  count: number;
  active_count?: number;
  inactive_count?: number;
  next: string | null;
  previous: string | null;
  results: CustomerGroup[];
}

// Contact API Functions

interface FetchContactsParams {
  page?: number;
  page_size?: number;
  status?: string;
  owner_id?: string;
  search?: string;
  ordering?: string;
}

interface ContactsResponse {
  count: number;
  active_count?: number;
  inactive_count?: number;
  next: string | null;
  previous: string | null;
  results: ApiContact[];
}

/**
 * Hook to fetch customer groups with optional pagination and filtering
 */
export const useFetchCustomerGroups = (params: FetchCustomerGroupsParams = {}) => {
  return useQuery<CustomerGroupsResponse>({
    queryKey: ['customerGroups', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      
      if (params.page_size) {
        queryParams.append('page_size', params.page_size.toString());
      }
      
      if (params.group_type) {
        queryParams.append('group_type', params.group_type);
      }
      
      // Only include is_active filter if it's explicitly set (not for 'all' tab)
      if (params.is_active !== undefined) {
        queryParams.append('is_active', params.is_active.toString());
      }
      
      if (params.ordering) {
        queryParams.append('ordering', params.ordering);
      }
      
      const response = await api.get(`customer-groups/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData
  });
};

/**
 * Hook to fetch a single customer group by ID
 */
export const useFetchCustomerGroup = (id: string | null) => {
  return useQuery<CustomerGroup>({
    queryKey: ['customerGroup', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer Group ID is required');
      const response = await api.get(`customer-groups/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!id
  });
};

/**
 * Hook to create a new customer group
 */
export const useCreateCustomerGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<CustomerGroup>) => {
      const response = await api.post('customer-groups/', data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] });
    }
  });
};

/**
 * Hook to update an existing customer group
 */
export const useUpdateCustomerGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerGroup> }) => {
      const response = await api.patch(`customer-groups/${id}/`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] });
      queryClient.invalidateQueries({ queryKey: ['customerGroup', data.id] });
    }
  });
};

/**
 * Hook to toggle customer group active status
 */
export const useToggleCustomerGroupStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await api.patch(`customer-groups/${id}/`, { is_active }, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] });
    }
  });
};

/**
 * Hook to delete a customer group
 */
export const useDeleteCustomerGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`customer-groups/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] });
    }
  });
};

/**
 * Hook to fetch contacts with optional pagination, filtering, and search
 */
export const useFetchContacts = (params: FetchContactsParams = {}) => {
  return useQuery<ContactsResponse>({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      
      if (params.page_size) {
        queryParams.append('page_size', params.page_size.toString());
      }
      
      if (params.status) {
        queryParams.append('status', params.status);
      }
      
      if (params.owner_id) {
        queryParams.append('owner_id', params.owner_id);
      }
      
      if (params.search) {
        queryParams.append('search', params.search);
      }
      
      if (params.ordering) {
        queryParams.append('ordering', params.ordering);
      }
      
      const response = await api.get(`contacts/?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData
  });
};

/**
 * Hook to fetch a single contact by ID
 */
export const useFetchContact = (id: string | null) => {
  return useQuery<ApiContact>({
    queryKey: ['contact', id],
    queryFn: async () => {
      if (!id) throw new Error('Contact ID is required');
      const response = await api.get(`contacts/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!id
  });
};

/**
 * Hook to create a new contact
 */
export const useCreateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<ApiContact>) => {
      const response = await api.post('contacts/', data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
};

/**
 * Hook to update an existing contact
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApiContact> }) => {
      const response = await api.patch(`contacts/${id}/`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
    }
  });
};

/**
 * Hook to delete a contact
 */
export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`contacts/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
};
