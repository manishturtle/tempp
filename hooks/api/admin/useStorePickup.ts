import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { 
  StorePickup, 
  StorePickupListResponse, 
  StorePickupPayload 
} from '@/app/types/admin/storePickup';
import { getAuthHeaders } from '@/app/hooks/api/auth';

/**
 * Hook for fetching all store pickups with filtering options
 * @param params Query parameters for filtering, searching, and pagination
 * @returns Query result with store pickup list data
 */
export const useStorePickups = (params?: { 
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  paginate?: boolean;
}) => {
  return useQuery<StorePickupListResponse>({
    queryKey: ['store-pickups', params],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.storePickup.list, { 
        params,
        headers: getAuthHeaders() 
      });
      return data;
    },
  });
};

/**
 * Hook for fetching a single store pickup by ID
 * @param id Store pickup ID
 * @returns Query result with store pickup data
 */
export const useStorePickup = (id: number) => {
  return useQuery<StorePickup>({
    queryKey: ['store-pickup', id],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.storePickup.detail(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Hook for creating a new store pickup
 * @returns Mutation function for creating store pickup
 */
export const useCreateStorePickup = () => {
  const queryClient = useQueryClient();
  
  return useMutation<StorePickup, Error, StorePickupPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post(
        apiEndpoints.storePickup.create, 
        payload,
        { headers: getAuthHeaders() }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pickups'] });
    },
  });
};

/**
 * Hook for updating an existing store pickup
 * @param id Store pickup ID
 * @returns Mutation function for updating store pickup
 */
export const useUpdateStorePickup = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation<StorePickup, Error, Partial<StorePickupPayload>>({
    mutationFn: async (payload) => {
      const { data } = await api.patch(
        apiEndpoints.storePickup.update(id), 
        payload,
        { headers: getAuthHeaders() }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['store-pickup', id] });
    },
  });
};

/**
 * Hook for deleting a store pickup
 * @returns Mutation function for deleting store pickup
 */
export const useDeleteStorePickup = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(apiEndpoints.storePickup.delete(id), {
        headers: getAuthHeaders()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pickups'] });
    },
  });
};

/**
 * Hook for toggling the active status of a store pickup
 * @param id Store pickup ID
 * @returns Mutation function for toggling active status
 */
export const useToggleStorePickupStatus = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation<StorePickup, Error, { is_active: boolean }>({
    mutationFn: async ({ is_active }) => {
      const { data } = await api.patch(
        apiEndpoints.storePickup.update(id), 
        { is_active },
        { headers: getAuthHeaders() }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['store-pickup', id] });
    },
  });
};
