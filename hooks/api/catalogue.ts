/**
 * Catalogue API hooks
 * 
 * This file provides custom React hooks for interacting with the catalogue API endpoints
 * using TanStack Query for data fetching and caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
// import storeApi from '@/lib/storeapi';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import {
  Division, Category, Subcategory, 
  ProductStatus,
  CatalogueFilter, CatalogueListResponse
} from '@/app/types/catalogue';

// Helper function to build query params from filters
const buildQueryParams = (filters?: CatalogueFilter): string => {
  if (!filters) return '';
  
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
  if (filters.division) params.append('division', String(filters.division));
  if (filters.category) params.append('category', String(filters.category));
  
  // Add pagination parameters
  if (filters.page) params.append('page', String(filters.page));
  if (filters.page_size) params.append('page_size', String(filters.page_size));
  
  return params.toString() ? `?${params.toString()}` : '';
};

// =============================================================================
// Division Hooks
// =============================================================================

export interface DivisionHierarchy extends Division {
  categories: Array<Category & {
    subcategories: Subcategory[];
  }>;
}

export const useFetchActiveDivisionHierarchy = () => {
  const headers = getAuthHeaders();
  
  return useQuery<DivisionHierarchy[]>({
    queryKey: ['catalogue', 'divisions', 'active-hierarchy'],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.catalogue.divisions.activeHierarchy(), { headers });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch divisions with pagination (default behavior)
 */
export const useFetchDivisions = (filters?: CatalogueFilter) => {
  return useQuery({
    queryKey: ['divisions', filters],
    queryFn: async () => {
      const response = await api.get<CatalogueListResponse<Division>>(
        `${apiEndpoints.catalogue.divisions.list}${buildQueryParams(filters)}`,
        { headers: getAuthHeaders() }
      );
      // Return the complete pagination data
      return response.data;
    },
    // Add these options to control refetching behavior
    refetchOnWindowFocus: false,  // Don't refetch when window regains focus
    staleTime: 30000,            // Consider data fresh for 30 seconds
  });
};

/**
 * Hook to fetch all divisions without pagination
 * This is useful for dropdowns and autocomplete fields where we want all options
 */
export const useFetchDivisionsNoPagination = () => {
  return useQuery({
    queryKey: ['divisions-no-pagination'],
    queryFn: async () => {
      const response = await api.get<Division[]>(
        `${apiEndpoints.catalogue.divisions.list}?paginate=false`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: false                 // Don't retry failed requests automatically
  });
};

export const useFetchDivision = (id: number) => {
  return useQuery({
    queryKey: ['division', id],
    queryFn: async () => {
      const response = await api.get<Division>(
        apiEndpoints.catalogue.divisions.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!id // Only run the query if id is provided
  });
};

export const useCreateDivision = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (divisionData: Omit<Division, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by' | 'updated_by'>) => {
      // We don't need to send company_id anymore as it's handled by the backend
      const response = await api.post<Division>(
        apiEndpoints.catalogue.divisions.list, 
        divisionData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate divisions list query to refetch data
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
    }
  });
};

export const useUpdateDivision = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (division: Division) => {
      // We don't need to send company_id anymore as it's handled by the backend
      const response = await api.put<Division>(
        apiEndpoints.catalogue.divisions.detail(division.id), 
        division,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate divisions list query to refetch data
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
    }
  });
};

export const useDeleteDivision = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.catalogue.divisions.detail(id),
        { headers: getAuthHeaders() }
      );
      return id;
    },
    onSuccess: () => {
      // Invalidate divisions list query to refetch data
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
    }
  });
};

// =============================================================================
// Category Hooks
// =============================================================================

export const useFetchCategories = (filters?: CatalogueFilter) => {
  return useQuery({
    queryKey: ['categories', filters],
    queryFn: async () => {
      const response = await api.get<CatalogueListResponse<Category>>(
        `${apiEndpoints.catalogue.categories.list()}${buildQueryParams(filters)}`
      );
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: false
  });
};

/**
 * Hook to fetch all categories without pagination
 * This is useful for dropdowns and autocomplete fields where we want all options
 */
export const useFetchCategoriesNoPagination = () => {
  return useQuery({
    queryKey: ['categories-no-pagination'],
    queryFn: async () => {
      const response = await api.get<Category[]>(
        `${apiEndpoints.catalogue.categories.list()}?paginate=false`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: false
  });
};

export const useFetchCategory = (id: number) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const response = await api.get<Category>(
        apiEndpoints.catalogue.categories.detail(id)
      );
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Category>) => {
      const response = await api.post<Category>(
        apiEndpoints.catalogue.categories.list(),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the categories list query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    retry: false
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Category> }) => {
      const response = await api.put<Category>(
        apiEndpoints.catalogue.categories.detail(id),
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific category query and categories list
      queryClient.invalidateQueries({ queryKey: ['category', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    retry: false
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.catalogue.categories.detail(id)
      );
    },
    onSuccess: (_, id) => {
      // Invalidate specific category query and categories list
      queryClient.invalidateQueries({ queryKey: ['category', id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    retry: false
  });
};

// =============================================================================
// Subcategory Hooks
// =============================================================================

export const useFetchSubcategories = (filters?: CatalogueFilter) => {
  return useQuery({
    queryKey: ['subcategories', filters],
    queryFn: async () => {
      const response = await api.get<CatalogueListResponse<Subcategory>>(
        `${apiEndpoints.catalogue.subcategories.list}${buildQueryParams(filters)}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    staleTime: 30000, // Data remains fresh for 30 seconds
    refetchOnWindowFocus: false // Prevent refetching when window regains focus
  });
};

export const useFetchSubcategory = (id: number) => {
  return useQuery({
    queryKey: ['subcategory', id],
    queryFn: async () => {
      const response = await api.get<Subcategory>(
        apiEndpoints.catalogue.subcategories.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateSubcategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subcategoryData: Omit<Subcategory, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by' | 'updated_by'>) => {
      // We don't need to send company_id anymore as it's handled by the backend
      const response = await api.post<Subcategory>(
        apiEndpoints.catalogue.subcategories.list, 
        subcategoryData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    }
  });
};

export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subcategory: Subcategory) => {
      // We don't need to send company_id anymore as it's handled by the backend
      const response = await api.put<Subcategory>(
        apiEndpoints.catalogue.subcategories.detail(subcategory.id), 
        subcategory,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    }
  });
};

export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.catalogue.subcategories.detail(id),
        { headers: getAuthHeaders() }
      );
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    }
  });
};

// =============================================================================
// UnitOfMeasure Hooks
// =============================================================================

/**
 * Unit of Measure API Types and Hooks
 */
export interface UnitOfMeasure {
  id: number;
  company_id: string;
  name: string;
  symbol: string;
  description: string;
  unit_type: 'COUNTABLE' | 'MEASURABLE';
  type_display: string;
  associated_value: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: any;
  updated_by: any;
}

export const useFetchUnitOfMeasures = (filters?: CatalogueFilter) => {
  return useQuery({
    queryKey: ['unitOfMeasures', filters],
    queryFn: async () => {
      const response = await api.get<CatalogueListResponse<UnitOfMeasure>>(
        `${apiEndpoints.catalogue.unitOfMeasures.list}${buildQueryParams(filters)}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  });
};

export const useFetchUnitOfMeasure = (id: number) => {
  return useQuery({
    queryKey: ['unitOfMeasure', id],
    queryFn: async () => {
      const response = await api.get<UnitOfMeasure>(
        apiEndpoints.catalogue.unitOfMeasures.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateUnitOfMeasure = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<UnitOfMeasure>) => {
      const response = await api.post(
        apiEndpoints.catalogue.unitOfMeasures.list, 
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitOfMeasures'] });
    }
  });
};

export const useUpdateUnitOfMeasure = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UnitOfMeasure) => {
      const response = await api.put(
        apiEndpoints.catalogue.unitOfMeasures.detail(data.id),
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unitOfMeasure', data.id] });
      queryClient.invalidateQueries({ queryKey: ['unitOfMeasures'] });
    }
  });
};

export const useDeleteUnitOfMeasure = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.catalogue.unitOfMeasures.detail(id),
        { headers: getAuthHeaders() }
      );
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitOfMeasures'] });
    }
  });
};

// =============================================================================
// ProductStatus Hooks
// =============================================================================

export const useFetchProductStatuses = (filters?: CatalogueFilter) => {
  return useQuery({
    queryKey: ['productStatuses', filters],
    queryFn: async () => {
      const response = await api.get<CatalogueListResponse<ProductStatus>>(
        `${apiEndpoints.catalogue.productStatuses.list}${buildQueryParams(filters)}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  });
};

export const useFetchProductStatus = (id: number) => {
  return useQuery({
    queryKey: ['productStatus', id],
    queryFn: async () => {
      const response = await api.get<ProductStatus>(
        apiEndpoints.catalogue.productStatuses.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateProductStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (status: Omit<ProductStatus, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await api.post<ProductStatus>(
        apiEndpoints.catalogue.productStatuses.list, 
        status,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productStatuses'] });
    }
  });
};

export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: ProductStatus) => {
      const response = await api.put<ProductStatus>(
        apiEndpoints.catalogue.productStatuses.detail(id),
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['productStatus', data.id] });
      queryClient.invalidateQueries({ queryKey: ['productStatuses'] });
    }
  });
};

export const useDeleteProductStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.catalogue.productStatuses.detail(id),
        { headers: getAuthHeaders() }
      );
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productStatuses'] });
    }
  });
};
