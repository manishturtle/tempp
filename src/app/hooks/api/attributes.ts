/**
 * Attributes API hooks
 * 
 * This file provides custom React hooks for interacting with the attributes API endpoints
 * using TanStack Query for data fetching and caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import {
  AttributeGroup, Attribute, AttributeOption, AttributeDataType,
  AttributesFilter, AttributesListResponse, AttributeFormValues, AttributeOptionInput
} from '@/app/types/attributes';
import { AxiosError } from 'axios';

// Helper function to build query params from filters
const buildQueryParams = (filters?: AttributesFilter): string => {
  if (!filters) return '';
  
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
  if (filters.data_type) params.append('data_type', filters.data_type);
  if (filters.use_for_variants !== undefined) {
    params.append('use_for_variants', String(filters.use_for_variants));
  }
  
  // Handle group parameter - can be single number or array of numbers
  if (filters.group) {
    if (Array.isArray(filters.group)) {
      // If it's an array, add each group ID as a separate 'group' parameter
      filters.group.forEach(groupId => {
        params.append('group', String(groupId));
      });
    } else {
      // If it's a single value, add it as before
      params.append('group', String(filters.group));
    }
  }
  
  // Add pagination params
  if (filters.page_size) params.append('page_size', String(filters.page_size));
  if (filters.page) params.append('page', String(filters.page));
  
  return params.toString() ? `?${params.toString()}` : '';
};

// =============================================================================
// Attribute Group Hooks
// =============================================================================

export const useFetchAttributeGroups = (filters?: AttributesFilter) => {
  return useQuery({
    queryKey: ['attributeGroups', filters],
    queryFn: async () => {
      const response = await api.get<AttributesListResponse<AttributeGroup>>(
        `${apiEndpoints.attributes.attributeGroups.list}${buildQueryParams(filters)}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  });
};

export const useFetchAttributeGroup = (id: number) => {
  return useQuery({
    queryKey: ['attributeGroup', id],
    queryFn: async () => {
      const response = await api.get<AttributeGroup>(
        apiEndpoints.attributes.attributeGroups.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  });
};

// Type for API error response
interface ApiErrorResponse {
  detail?: string;
  [key: string]: any;
}

interface AttributeGroupMutationOptions {
  onSuccess?: () => void;
  onError?: (error: AxiosError<ApiErrorResponse>) => void;
}

export const useCreateAttributeGroup = (options?: AttributeGroupMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<AttributeGroup>) => {
      // Client ID and company ID will be handled by the backend
      const response = await api.post<AttributeGroup>(
        apiEndpoints.attributes.attributeGroups.list, 
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

interface UpdateAttributeGroupParams {
  id: number;
  data: Partial<AttributeGroup>;
}

export const useUpdateAttributeGroup = (options?: AttributeGroupMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: UpdateAttributeGroupParams) => {
      // Client ID and company ID will be handled by the backend
      const response = await api.patch<AttributeGroup>(
        `${apiEndpoints.attributes.attributeGroups.detail(id)}`, 
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
      queryClient.invalidateQueries({ queryKey: ['attributeGroup', variables.id] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

export const useDeleteAttributeGroup = (options?: AttributeGroupMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.attributes.attributeGroups.detail(id),
        { headers: getAuthHeaders() }
      );
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
      queryClient.invalidateQueries({ queryKey: ['attributeGroup', id] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

// =============================================================================
// Attribute Hooks
// =============================================================================

// export const useFetchAttributes = (filters?: AttributesFilter) => {
//   return useQuery({
//     queryKey: ['attributes', filters],
//     queryFn: async () => {
//       const response = await api.get<AttributesListResponse<Attribute>>(
//         `${apiEndpoints.attributes.attributes.list}${buildQueryParams(filters)}`
//       );
//       return response.data;
//     }
//   });
// };
export const useFetchAttributes = (filters?: AttributesFilter) => {
  return useQuery({
    queryKey: ['attributes', filters],
    queryFn: async () => {
      try {
        // console.log('Fetching attributes with filters:', filters);
        // console.log('API URL:', `${apiEndpoints.attributes.attributes.list}${buildQueryParams(filters)}`);
        
        const response = await api.get<AttributesListResponse<Attribute>>(
          `${apiEndpoints.attributes.attributes.list}${buildQueryParams(filters)}`,
          { headers: getAuthHeaders() }
        );
        
        // console.log('Raw API Response:', response);
        return response.data;
      } catch (error) {
        // console.error('Error fetching attributes:', error);
        throw error;
      }
    }
  });
};

export const useFetchAttribute = (id: number) => {
  return useQuery({
    queryKey: ['attribute', id],
    queryFn: async () => {
      const response = await api.get<Attribute>(
        apiEndpoints.attributes.attributes.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  });
};

interface AttributeMutationOptions {
  onSuccess?: () => void;
  onError?: (error: AxiosError<ApiErrorResponse>) => void;
}

export const useCreateAttribute = (options?: AttributeMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AttributeFormValues & { options_input?: AttributeOptionInput[] }) => {
      const response = await api.post<Attribute>(
        '/products/attributes/attributes/', 
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

interface UpdateAttributeParams {
  id: number;
  data: Partial<AttributeFormValues> & { options_input?: AttributeOptionInput[] };
}

export const useUpdateAttribute = (options?: AttributeMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: UpdateAttributeParams) => {
      const response = await api.patch<Attribute>(
        apiEndpoints.attributes.attributes.detail(id),
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      queryClient.invalidateQueries({ queryKey: ['attribute', variables.id] });
      // Also invalidate attribute options as they might have changed
      queryClient.invalidateQueries({ queryKey: ['attributeOptions', variables.id] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

export const useDeleteAttribute = (options?: AttributeMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.attributes.attributes.detail(id),
        { headers: getAuthHeaders() }
      );
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      queryClient.invalidateQueries({ queryKey: ['attribute', id] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

// =============================================================================
// Attribute Option Hooks
// =============================================================================

export const useFetchAttributeOptions = (attributeId?: number) => {
  return useQuery({
    queryKey: ['attributeOptions', attributeId],
    queryFn: async () => {
      let url = apiEndpoints.attributes.attributeOptions.list;
      if (attributeId) {
        url += `?attribute=${attributeId}`;
      }
      const response = await api.get<AttributesListResponse<AttributeOption>>(url, { headers: getAuthHeaders() });
      return response.data;
    },
    enabled: !!attributeId // Only run the query if attributeId is provided
  });
};

export const useFetchAttributeOption = (id: number) => {
  return useQuery({
    queryKey: ['attributeOption', id],
    queryFn: async () => {
      const response = await api.get<AttributeOption>(apiEndpoints.attributes.attributeOptions.detail(id));
      return response.data;
    }
  });
};

interface AttributeOptionMutationOptions {
  onSuccess?: () => void;
  onError?: (error: AxiosError<ApiErrorResponse>) => void;
}

export const useCreateAttributeOption = (options?: AttributeOptionMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AttributeOption) => {
      const response = await api.post<AttributeOption>(
        apiEndpoints.attributes.attributeOptions.list, 
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attributeOptions'] });
      queryClient.invalidateQueries({ queryKey: ['attributeOptions', data.attribute] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

interface UpdateAttributeOptionParams {
  id: number;
  data: Partial<AttributeOption>;
}

export const useUpdateAttributeOption = (options?: AttributeOptionMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: UpdateAttributeOptionParams) => {
      const response = await api.patch<AttributeOption>(
        apiEndpoints.attributes.attributeOptions.detail(id),
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attributeOptions'] });
      queryClient.invalidateQueries({ queryKey: ['attributeOptions', data.attribute] });
      queryClient.invalidateQueries({ queryKey: ['attributeOption', variables.id] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};

export const useDeleteAttributeOption = (options?: AttributeOptionMutationOptions) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.get<AttributeOption>(
        apiEndpoints.attributes.attributeOptions.detail(id),
        { headers: getAuthHeaders() }
      );
      const attributeId = response.data.attribute;
      await api.delete(
        apiEndpoints.attributes.attributeOptions.detail(id),
        { headers: getAuthHeaders() }
      );
      return { id, attributeId };
    },
    onSuccess: ({ id, attributeId }) => {
      queryClient.invalidateQueries({ queryKey: ['attributeOptions'] });
      queryClient.invalidateQueries({ queryKey: ['attributeOptions', attributeId] });
      queryClient.invalidateQueries({ queryKey: ['attributeOption', id] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error: AxiosError) => {
      if (options?.onError) options.onError(error as AxiosError<ApiErrorResponse>);
    }
  });
};
