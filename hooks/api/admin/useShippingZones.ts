import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

export interface ShippingZone {
  id: number;
  zone_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  client_id: number;
  company_id: number;
  pincodes: Array<{
    id: number;
    pincode: string;
  }>;
}

export interface ShippingZoneListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShippingZone[];
}

export interface ShippingZoneStatistics {
  total: number;
  active: number;
  inactive: number;
}

export interface ShippingZoneFormData {
  zone_name: string;
  description?: string;
  is_active: boolean;
  pincodes?: Array<{ pincode: string }>;
}

// Fetch all shipping zones
export const useShippingZones = (params?: { 
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}) => {
  const { data, ...rest } = useQuery<ShippingZoneListResponse>({
    queryKey: ['shipping-zones', params],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.shippingZones.list(params), { 
        headers: getAuthHeaders() 
      });
      return data;
    },
  });

  // Get shipping zone statistics
  const { data: statistics } = useQuery<ShippingZoneStatistics>({
    queryKey: ['shipping-zones', 'statistics'],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.shippingZones.statistics, {
        headers: getAuthHeaders()
      });
      return data;
    },
  });

  return {
    ...rest,
    data,
    statistics
  };
};

// Fetch single shipping zone
export const useShippingZone = (id: number) => {
  return useQuery<ShippingZone>({
    queryKey: ['shipping-zone', id],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.shippingZones.detail(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    enabled: !!id,
  });
};

// Create new shipping zone
export const useCreateShippingZone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shippingZone: ShippingZoneFormData) => 
      api.post(apiEndpoints.shippingZones.create, shippingZone, { 
        headers: getAuthHeaders() 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones', 'statistics'] });
    },
  });
};

// Update shipping zone
export const useUpdateShippingZone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & ShippingZoneFormData) =>
      api.put(apiEndpoints.shippingZones.update(id), data, { 
        headers: getAuthHeaders() 
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zone', id] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones', 'statistics'] });
    },
  });
};

// Delete shipping zone
export const useDeleteShippingZone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(apiEndpoints.shippingZones.delete(id), { 
        headers: getAuthHeaders() 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones', 'statistics'] });
    },
  });
};
