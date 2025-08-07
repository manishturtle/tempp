import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { 
  ShippingMethod, 
  ShippingMethodListResponse, 
  ShippingMethodFormData 
} from '@/app/types/admin/shippingMethod';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Fetch all shipping methods
export const useShippingMethods = (params?: { 
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  paginate?: boolean;
}) => {
  return useQuery<ShippingMethodListResponse>({
    queryKey: ['shipping-methods', params],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.shippingMethods.list, { 
        params,
        headers: getAuthHeaders() 
      });
      return data;
    },
  });
};

// Fetch single shipping method
export const useShippingMethod = (id: number) => {
  return useQuery<ShippingMethod>({
    queryKey: ['shipping-method', id],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.shippingMethods.detail(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    enabled: !!id,
  });
};

// Create new shipping method
export const useCreateShippingMethod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shippingMethod: ShippingMethodFormData) => 
      api.post(apiEndpoints.shippingMethods.create, shippingMethod, { 
        headers: getAuthHeaders() 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
    },
  });
};

// Update shipping method
export const useUpdateShippingMethod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ShippingMethodFormData) =>
      api.put(apiEndpoints.shippingMethods.update(id), data, { 
        headers: getAuthHeaders() 
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-method', id] });
    },
  });
};

// Delete shipping method
export const useDeleteShippingMethod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(apiEndpoints.shippingMethods.delete(id), { 
        headers: getAuthHeaders() 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
    },
  });
};