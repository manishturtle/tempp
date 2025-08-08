import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Country, Currency } from '@/app/types/shared';
import { getAuthHeaders } from './auth';

// Country API hooks
/**
 * Hook to fetch countries list
 * @param params - Query parameters for filtering
 * @param disablePagination - If true, requests all data without pagination
 */
export const useFetchCountries = (params?: any, disablePagination?: boolean) => {
  // Combine the pagination parameter with any other params
  const queryParams = disablePagination
    ? { ...params, paginate: 'false' }
    : params;

  return useQuery({
    queryKey: ['countries', queryParams],
    queryFn: async () => {
      const response = await api.get('/shared/countries/', { 
        params: queryParams,
        headers: getAuthHeaders()
      });
      return response.data;
    }
  });
};

export const useFetchCountry = (id?: string) => {
  return useQuery({
    queryKey: ['country', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/shared/countries/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateCountry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (countryData: Partial<Country>) => {
      const response = await api.post('/shared/countries/', countryData, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
    }
  });
};

export const useUpdateCountry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ iso_code, data }: { iso_code: string, data: Partial<Country> }) => {
      const response = await api.patch(`/shared/countries/${iso_code}/`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      queryClient.invalidateQueries({ queryKey: ['country', variables.iso_code] });
    }
  });
};

export const useDeleteCountry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/shared/countries/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
    }
  });
};

// Currency API hooks
/**
 * Hook to fetch currencies list
 * @param params - Query parameters for filtering
 * @param disablePagination - If true, requests all data without pagination
 */
export const useFetchCurrencies = (params?: any, disablePagination?: boolean) => {
  // Combine the pagination parameter with any other params
  const queryParams = disablePagination
    ? { ...params, paginate: 'false' }
    : params;

  return useQuery({
    queryKey: ['currencies', queryParams],
    queryFn: async () => {
      const response = await api.get('/shared/currencies/', { 
        params: queryParams,
        headers: getAuthHeaders()
      });
      return response.data;
    }
  });
};

export const useFetchCurrency = (id?: string) => {
  return useQuery({
    queryKey: ['currency', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/shared/currencies/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (currencyData: Partial<Currency>) => {
      const response = await api.post('/shared/currencies/', currencyData, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    }
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Currency> }) => {
      const response = await api.patch(`/shared/currencies/${id}/`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['currency', variables.id] });
    }
  });
};

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/shared/currencies/${id}/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    }
  });
};
