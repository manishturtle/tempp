import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

export interface Pincode {
  id: number;
  pincode: string;
  city?: string | null;
  district: string;
  state: string;
  country_code: string;
  created_at: string;
  updated_at: string;
  client_id: number;
  company_id: number;
}

export type PincodeListResponse = Pincode[];

export interface PincodeUniqueValues {
  [country: string]: {
    [state: string]: string[];
  };
}

export interface Pincode {
  id: number;
  pincode: string;
  city?: string | null;
  district: string;
  state: string;
  country_code: string;
  is_assigned: string; // "disable" or ""
}

export interface PincodeFormData {
  pincode: string;
  city?: string | null;
  district: string;
  state: string;
  country_code: string;
  zone_ids?: number[];
}

export interface PincodeZoneAssignment {
  id: number;
  pincode: string;
  city?: string | null;
  district: string;
  state: string;
  country_code: string;
  zone_id: number;
}

export interface ValidatePincodeResponse {
  valid: boolean;
  message?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Fetch all pincodes
export const usePincodes = (params?: { 
  is_active?: boolean;
  search?: string;
  zone_id?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
  // Extended filter parameters
  country_code?: string;
  state?: string;
  district?: string;
}) => {
  return useQuery<PincodeListResponse>({
    queryKey: ['pincodes', params],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.pincodes.list(), { 
        params,
        headers: getAuthHeaders() 
      });
      // Return the data directly as an array
      return Array.isArray(data) ? data : [];
    },
  });
};

// Fetch single pincode
export const usePincode = (id: number) => {
  return useQuery<Pincode>({
    queryKey: ['pincode', id],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.pincodes.detail(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    enabled: !!id,
  });
};

// Get unique values for countries, states, and districts in hierarchical structure
export const usePincodeUniqueValues = (params?: {
  country_code?: string;
  state?: string;
}) => {
  return useQuery<PincodeUniqueValues>({
    queryKey: ['pincode-unique-values', params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiEndpoints.pincodes.list()}unique_values/`,
        { 
          params,
          headers: getAuthHeaders() 
        }
      );
      return data;
    },
    // Helper functions to extract flattened data from the hierarchical structure
    select: (data) => {
      return data;
    },
  });
};

// Helper functions to extract data from the hierarchical structure
export const extractCountriesFromHierarchy = (data?: PincodeUniqueValues): string[] => {
  if (!data) return [];
  return Object.keys(data);
};

export const extractStatesFromHierarchy = (data?: PincodeUniqueValues, country?: string): string[] => {
  if (!data || !country || !data[country]) return [];
  return Object.keys(data[country]);
};

export const extractDistrictsFromHierarchy = (data?: PincodeUniqueValues, country?: string, state?: string): string[] => {
  if (!data || !country || !state || !data[country] || !data[country][state]) return [];
  return data[country][state];
};

// Validate pincode
export const useValidatePincode = () => {
  return useMutation<ValidatePincodeResponse, Error, string>({
    mutationFn: async (pincode: string) => {
      const { data } = await api.post(
        apiEndpoints.pincodes.validate, 
        { pincode },
        { headers: getAuthHeaders() }
      );
      return data;
    },
  });
};

// Create new pincode
export const useCreatePincode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pincode: PincodeFormData) => {
      const { zone_ids, ...pincodeData } = pincode;
      const response = await api.post(apiEndpoints.pincodes.create, pincodeData, { 
        headers: getAuthHeaders() 
      });

      // If zone_ids are provided, create zone assignments
      if (zone_ids?.length) {
        await Promise.all(
          zone_ids.map(zoneId => 
            api.post(
              apiEndpoints.shippingZones.pincodes(zoneId), 
              { pincode: pincodeData.pincode }, 
              { headers: getAuthHeaders() }
            )
          )
        );
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
    },
  });
};

// Update pincode
export const useUpdatePincode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<PincodeFormData>) => {
      const { zone_ids, ...pincodeData } = data;
      const response = await api.put(apiEndpoints.pincodes.update(id), pincodeData, { 
        headers: getAuthHeaders() 
      });

      // Update zone assignments if zone_ids are provided
      if (zone_ids) {
        // First, get current zone assignments
        const { data: currentZones } = await api.get<PincodeZoneAssignment[]>(
          apiEndpoints.shippingZones.list(),
          { 
            params: { pincode: pincodeData.pincode },
            headers: getAuthHeaders() 
          }
        );

        const currentZoneIds = currentZones.map(zone => zone.zone_id);
        const zonesToAdd = zone_ids.filter(id => !currentZoneIds.includes(id));
        const zonesToRemove = currentZoneIds.filter(id => !zone_ids.includes(id));

        // Add new zone assignments
        await Promise.all(
          zonesToAdd.map(zoneId => 
            api.post(
              apiEndpoints.shippingZones.pincodes(zoneId), 
              { pincode: pincodeData.pincode }, 
              { headers: getAuthHeaders() }
            )
          )
        );

        // Remove old zone assignments
        await Promise.all(
          zonesToRemove.map(zoneId =>
            api.delete(
              `${apiEndpoints.shippingZones.pincodes(zoneId)}?pincode=${encodeURIComponent(pincodeData.pincode!)}`,
              { headers: getAuthHeaders() }
            )
          )
        );
      }

      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
      queryClient.invalidateQueries({ queryKey: ['pincode', id] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
    },
  });
};

// Delete pincode
export const useDeletePincode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      // First get the pincode to get the pincode value
      const { data: pincode } = await api.get<Pincode>(apiEndpoints.pincodes.detail(id), {
        headers: getAuthHeaders()
      });
      
      // Delete the pincode
      await api.delete(apiEndpoints.pincodes.delete(id), { 
        headers: getAuthHeaders() 
      });
      
      return pincode;
    },
    onSuccess: (deletedPincode) => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
    },
  });
};
