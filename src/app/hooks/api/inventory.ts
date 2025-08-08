'use client';

/**
 * Inventory API functions
 * 
 * This file contains functions for interacting with the inventory API endpoints.
 */
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { 
  InventoryItem, 
  InventoryListParams, 
  PaginatedResponse, 
  InventorySummary,
  Product,
  Location,
  AdjustmentPayload,
  AdjustmentResponse,
  AdjustmentLog,
  AdjustmentListParams,
  LocationListParams,
  SerializedInventoryItem,
  SerializedListParams,
  SerialNumberStatus,
  UpdateSerializedStatusPayload,
  LotItem,
  LotListParams,
  UpdateLotPayload,
  AdjustmentReason,
  InventoryFilter
} from '@/app/types/inventory';
import { ApiInventoryItem } from '@/app/types/inventory-types';
import { getAuthHeaders } from './auth';

// Helper function to build query params from filters
const buildQueryParams = (params?: InventoryListParams): string => {
  if (!params) return '';
  
  const urlParams = new URLSearchParams();
  
  // Add each parameter to the URL params if it exists
  if (params.page !== undefined) urlParams.append('page', String(params.page));
  if (params.pageSize !== undefined) urlParams.append('page_size', String(params.pageSize));
  
  // Map last_updated to updated_at for sorting
  if (params.ordering === '-last_updated') {
    urlParams.append('ordering', '-updated_at');
  } else if (params.ordering === 'last_updated') {
    urlParams.append('ordering', 'updated_at');
  } else if (params.ordering !== undefined) {
    urlParams.append('ordering', params.ordering);
  }
  
  if (params.product__name__icontains) urlParams.append('product__name__icontains', params.product__name__icontains);
  if (params.location__name__icontains) urlParams.append('location__name__icontains', params.location__name__icontains);
  if (params.stock_quantity__gte !== undefined) urlParams.append('stock_quantity__gte', String(params.stock_quantity__gte));
  if (params.stock_quantity__lte !== undefined) urlParams.append('stock_quantity__lte', String(params.stock_quantity__lte));
  if (params.available_to_promise__gte !== undefined) urlParams.append('available_to_promise__gte', String(params.available_to_promise__gte));
  if (params.available_to_promise__lte !== undefined) urlParams.append('available_to_promise__lte', String(params.available_to_promise__lte));
  if (params.isActive !== undefined) urlParams.append('is_active', String(params.isActive));
  
  return urlParams.toString() ? `?${urlParams.toString()}` : '';
};

// Direct API functions for server components
export const fetchInventoryItems = async (params?: InventoryListParams): Promise<PaginatedResponse<ApiInventoryItem>> => {
  // Set default params if not provided
  const defaultParams: InventoryListParams = {
    page: 1,
    pageSize: 10,
    ordering: 'updated_at',
    product__name__icontains: '',
    location__name__icontains: '',
    stock_quantity__gte: undefined,
    stock_quantity__lte: undefined,
    available_to_promise__gte: undefined,
    available_to_promise__lte: undefined,
    isActive: true
  };

  const finalParams = { ...defaultParams, ...params };

  const response = await api.get<PaginatedResponse<ApiInventoryItem>>(
    `${apiEndpoints.inventory.list()}${buildQueryParams(finalParams)}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const fetchInventoryItem = async (id: number): Promise<InventoryItem> => {
  const response = await api.get(
    apiEndpoints.inventory.detail(id),
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Fetch products with optional filtering
 * 
 * @param params - Filter parameters for products
 * @returns Promise with paginated products
 */
export const fetchProducts = async (params?: { 
  search?: string; 
  is_active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Product>> => {
  const urlParams = new URLSearchParams();
  
  if (params?.search) urlParams.append('search', params.search);
  if (params?.is_active !== undefined) urlParams.append('is_active', String(params.is_active));
  if (params?.page) urlParams.append('page', String(params.page));
  if (params?.page_size) urlParams.append('page_size', String(params.page_size));
  
  const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
  
  const response = await api.get(
    `${apiEndpoints.products.list()}${queryString}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Fetch locations with optional filtering
 * 
 * @param params - Filter parameters for locations
 * @returns Promise with paginated locations
 */
export const fetchLocations = async (params?: { 
  search?: string; 
  is_active?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;
}): Promise<PaginatedResponse<Location>> => {
  const urlParams = new URLSearchParams();
  
  if (params?.search) urlParams.append('search', params.search);
  if (params?.is_active !== undefined) urlParams.append('is_active', String(params.is_active));
  if (params?.page) urlParams.append('page', String(params.page));
  if (params?.page_size) urlParams.append('page_size', String(params.page_size));
  if (params?.ordering) urlParams.append('ordering', params.ordering);
  
  // Direct URL construction without using the API endpoints object
  let url = '/inventory/fulfillment-locations/';
  if (urlParams.toString()) {
    url += `?${urlParams.toString()}`;
  }
  
  const response = await api.get(
    url,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Hook to fetch locations with React Query
 * 
 * @param params - Filter parameters for locations
 * @returns Object containing locations data, loading state, error state, and refetch function
 */
export const useFetchLocations = (params?: LocationListParams) => {
  return useQuery({
    queryKey: ['locations', params],
    queryFn: () => fetchLocations(params)
  });
};

/**
 * Fetch inventory details for a specific product and location
 * 
 * @param productId - Product ID
 * @param locationId - Location ID
 * @returns Promise with inventory details
 */
export const fetchInventoryDetail = async (
  productId: number, 
  locationId: number
): Promise<{ inventoryId: number; summary: InventorySummary }> => {
  try {
    // Get tenant slug directly
    const tenantSlug = typeof window !== 'undefined' ? localStorage.getItem('tenant_schema') || 'turtle' : 'turtle';
    
    // Construct the URL manually with the tenant slug
    const url = `/${tenantSlug}/inventory/inventory/?product__id=${productId}&location__id=${locationId}`;
    
    console.log('Fetching inventory with URL:', url);
    
    // Make the API request
    const response = await api.get(
      url,
      { headers: getAuthHeaders() }
    );
    
    console.log('Inventory API response:', response.data);
    
    // Directly use the response data since we're getting a single object
    const inventoryData = response.data;
    
    if (!inventoryData) {
      console.warn('No inventory data found for product ID:', productId, 'and location ID:', locationId);
      return {
        inventoryId: 0,
        summary: {
          stock_quantity: 0,
          reserved_quantity: 0,
          non_saleable_quantity: 0,
          on_order_quantity: 0,
          in_transit_quantity: 0,
          returned_quantity: 0,
          hold_quantity: 0,
          backorder_quantity: 0,
          low_stock_threshold: 0,
          available_to_promise: 0,
          total_available: 0,
          total_unavailable: 0,
          stock_status: 'UNKNOWN'
        }
      };
    }
    
    console.log('Using inventory data:', inventoryData);
    
    return {
      inventoryId: inventoryData.id,
      summary: {
        stock_quantity: inventoryData.stock_quantity || 0,
        reserved_quantity: inventoryData.reserved_quantity || 0,
        non_saleable_quantity: inventoryData.non_saleable_quantity || 0,
        on_order_quantity: inventoryData.on_order_quantity || 0,
        in_transit_quantity: inventoryData.in_transit_quantity || 0,
        returned_quantity: inventoryData.returned_quantity || 0,
        hold_quantity: inventoryData.hold_quantity || 0,
        backorder_quantity: inventoryData.backorder_quantity || 0,
        low_stock_threshold: inventoryData.low_stock_threshold || 0,
        available_to_promise: inventoryData.available_to_promise || 0,
        total_available: inventoryData.total_available || 0,
        total_unavailable: inventoryData.total_unavailable || 0,
        stock_status: inventoryData.stock_status || 'UNKNOWN'
      }
    };
  } catch (error) {
    console.error('Error fetching inventory detail:', error);
    throw error;
  }
};

/**
 * Create an inventory adjustment
 * 
 * @param payload - Adjustment payload
 * @returns Promise with adjustment response
 */
export const createAdjustment = async (payload: AdjustmentPayload): Promise<AdjustmentResponse> => {
  const response = await api.post(
    apiEndpoints.inventory.adjustments.list,
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const createInventoryItem = async (inventoryItem: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> => {
  const response = await api.post(
    apiEndpoints.inventory.list(),
    inventoryItem,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateInventoryItem = async (id: number, data: Partial<InventoryItem>): Promise<InventoryItem> => {
  const response = await api.put(
    apiEndpoints.inventory.detail(id),
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteInventoryItem = async (id: number): Promise<void> => {
  await api.delete(
    apiEndpoints.inventory.detail(id),
    { headers: getAuthHeaders() }
  );
};

/**
 * Fetch adjustment history with optional filtering
 * 
 * @param params - Filter parameters for adjustment history
 * @returns Promise with paginated adjustment history
 */
export const fetchAdjustmentHistory = async (params?: AdjustmentListParams): Promise<PaginatedResponse<AdjustmentLog>> => {
  const urlParams = new URLSearchParams();
  
  if (params?.page) urlParams.append('page', String(params.page));
  if (params?.page_size) urlParams.append('page_size', String(params.page_size));
  if (params?.ordering) urlParams.append('ordering', params.ordering);
  if (params?.product_id) urlParams.append('product_id', String(params.product_id));
  if (params?.location_id) urlParams.append('location_id', String(params.location_id));
  if (params?.user_id) urlParams.append('user_id', String(params.user_id));
  if (params?.adjustment_type) urlParams.append('adjustment_type', params.adjustment_type);
  if (params?.timestamp__gte) urlParams.append('timestamp__gte', params.timestamp__gte);
  if (params?.timestamp__lte) urlParams.append('timestamp__lte', params.timestamp__lte);
  if (params?.search) urlParams.append('search', params.search);
  
  const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
  
  const response = await api.get(
    `${apiEndpoints.inventory.adjustments.list}${queryString}`,
    { headers: getAuthHeaders() }
  );
  
  return response.data;
};

/**
 * Hook to fetch adjustment history with React Query
 * 
 * @param params - Filter parameters for adjustment history
 * @returns Object containing adjustment history data, loading state, error state, and refetch function
 */
export function useFetchAdjustmentHistory(params?: AdjustmentListParams) {
  const queryParams = params || { page: 1, page_size: 10 };
  const cacheKey = ['adjustmentHistory', queryParams];
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchAdjustmentHistory(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// Hook to fetch a paginated list of inventory items with optional filtering
export const useFetchInventoryList = (params?: InventoryListParams) => {
  return useQuery({
    queryKey: ['inventoryItems', params],
    queryFn: () => fetchInventoryItems(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch a single inventory item by ID
export const useFetchInventoryItem = (id: number | null) => {
  return useQuery({
    queryKey: ['inventoryItem', id],
    queryFn: async () => {
      if (!id) throw new Error('Inventory ID is required');
      const response = await api.get<InventoryItem>(
        apiEndpoints.inventory.detail(id),
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!id,
    placeholderData: (previousData) => previousData
  });
};

// Hook to create a new inventory item
export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (inventoryItem: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await api.post<InventoryItem>(
        apiEndpoints.inventory.list(),
        inventoryItem,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    }
  });
};

// Hook to update an existing inventory item
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InventoryItem> & { id: number }) => {
      const response = await api.put<InventoryItem>(
        apiEndpoints.inventory.detail(id),
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryItem'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    }
  });
};

// Hook to delete an inventory item
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(
        apiEndpoints.inventory.detail(id),
        { headers: getAuthHeaders() }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    }
  });
};

// Hook to fetch inventory summary statistics
export const useFetchInventorySummary = () => {
  return useQuery({
    queryKey: ['inventorySummary'],
    queryFn: async () => {
      const response = await api.get<InventorySummary>(
        apiEndpoints.inventory.summary(),
        { headers: getAuthHeaders() }
      );
      return response.data;
    }
  });
};

/**
 * Build query parameters for serialized inventory list
 * 
 * @param params - Filter parameters for serialized inventory
 * @returns Query string for API request
 */
const buildSerializedQueryParams = (params?: SerializedListParams): string => {
  if (!params) return '';
  
  const urlParams = new URLSearchParams();
  
  if (params.page !== undefined) urlParams.append('page', String(params.page));
  if (params.page_size !== undefined) urlParams.append('page_size', String(params.page_size));
  
  if (params.ordering !== undefined) {
    urlParams.append('ordering', params.ordering);
  }
  
  if (params.product_id !== undefined) urlParams.append('product_id', String(params.product_id));
  if (params.location_id !== undefined) urlParams.append('location_id', String(params.location_id));
  if (params.status !== undefined) urlParams.append('status', params.status);
  if (params.serial_number__icontains) urlParams.append('serial_number__icontains', params.serial_number__icontains);
  
  return urlParams.toString() ? `?${urlParams.toString()}` : '';
};

/**
 * Fetch serialized inventory items with optional filtering
 * 
 * @param params - Filter parameters for serialized inventory
 * @returns Promise with paginated serialized inventory items
 */
export const fetchSerializedInventory = async (params?: SerializedListParams): Promise<PaginatedResponse<SerializedInventoryItem>> => {
  // Set default params if not provided
  const defaultParams: SerializedListParams = {
    page: 1,
    page_size: 50,
  };
  
  const finalParams = params ? { ...defaultParams, ...params } : defaultParams;
  
  const response = await api.get(
    `${apiEndpoints.inventory.serialized.list}${buildSerializedQueryParams(finalParams)}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Fetch a single serialized inventory item by ID
 * 
 * @param id - Serialized inventory item ID
 * @returns Promise with serialized inventory item
 */
export const fetchSerializedInventoryItem = async (id: number): Promise<SerializedInventoryItem> => {
  const response = await api.get(
    apiEndpoints.inventory.serialized.detail(id),
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Update the status of a serialized inventory item
 * 
 * @param id - Serialized inventory item ID
 * @param payload - Status update payload
 * @returns Promise with updated serialized inventory item
 */
export const updateSerializedStatus = async (
  id: number, 
  payload: UpdateSerializedStatusPayload
): Promise<SerializedInventoryItem> => {
  const response = await api.patch(
    apiEndpoints.inventory.serialized.detail(id),
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Hook to fetch serialized inventory items with React Query
 * 
 * @param params - Filter parameters for serialized inventory
 * @returns Object containing serialized inventory data, loading state, error state, and refetch function
 */
export function useFetchSerializedInventory(params?: SerializedListParams) {
  const queryParams = params || { page: 1, page_size: 10 };
  const cacheKey = ['serializedInventory', queryParams];
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchSerializedInventory(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook to update the status of a serialized inventory item
 * 
 * @returns Mutation function and status
 */
export function useUpdateSerializedStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      payload 
    }: { 
      id: number; 
      payload: UpdateSerializedStatusPayload 
    }) => {
      return updateSerializedStatus(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serializedInventory'] });
    },
  });
}

/**
 * Build query parameters for lot inventory list
 * 
 * @param params - Filter parameters for lot inventory
 * @returns Query string for API request
 */
const buildLotQueryParams = (params?: LotListParams): string => {
  if (!params) return '';
  
  const urlParams = new URLSearchParams();
  
  if (params.page !== undefined) urlParams.append('page', String(params.page));
  if (params.page_size !== undefined) urlParams.append('page_size', String(params.page_size));
  
  if (params.ordering !== undefined) {
    urlParams.append('ordering', params.ordering);
  }
  
  if (params.product_id !== undefined) urlParams.append('product_id', String(params.product_id));
  if (params.location_id !== undefined) urlParams.append('location_id', String(params.location_id));
  if (params.lot_number__icontains) urlParams.append('lot_number__icontains', params.lot_number__icontains);
  if (params.expiry_date__gte) urlParams.append('expiry_date__gte', params.expiry_date__gte);
  if (params.expiry_date__lte) urlParams.append('expiry_date__lte', params.expiry_date__lte);
  if (params.is_expired !== undefined) urlParams.append('is_expired', String(params.is_expired));
  
  return urlParams.toString() ? `?${urlParams.toString()}` : '';
};

/**
 * Fetch lot inventory items with optional filtering
 * 
 * @param params - Filter parameters for lot inventory
 * @returns Promise with paginated lot inventory items
 */
export const fetchLots = async (params?: LotListParams): Promise<PaginatedResponse<LotItem>> => {
  // Set default params if not provided
  const defaultParams: LotListParams = {
    page: 1,
    page_size: 50,
  };
  
  const finalParams = params ? { ...defaultParams, ...params } : defaultParams;
  
  const response = await api.get(
    `${apiEndpoints.inventory.lots.list}${buildLotQueryParams(finalParams)}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Fetch a single lot inventory item by ID
 * 
 * @param id - Lot inventory item ID
 * @returns Promise with lot inventory item
 */
export const fetchLotItem = async (id: number): Promise<LotItem> => {
  const response = await api.get(
    apiEndpoints.inventory.lots.detail(id),
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Update a lot inventory item
 * 
 * @param id - Lot inventory item ID
 * @param payload - Update payload
 * @returns Promise with updated lot inventory item
 */
export const updateLot = async (
  id: number, 
  payload: UpdateLotPayload
): Promise<LotItem> => {
  const response = await api.patch(
    apiEndpoints.inventory.lots.detail(id),
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Hook to fetch lot inventory items with React Query
 * 
 * @param params - Filter parameters for lot inventory
 * @returns Object containing lot inventory data, loading state, error state, and refetch function
 */
export function useFetchLots(params?: LotListParams) {
  const queryParams = params || { page: 1, page_size: 10 };
  const cacheKey = ['lotInventory', queryParams];
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchLots(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook to update a lot inventory item
 * 
 * @returns Mutation function and status
 */
export function useUpdateLot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      payload 
    }: { 
      id: number; 
      payload: UpdateLotPayload 
    }) => {
      return updateLot(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotInventory'] });
    },
  });
}

/**
 * Fetch a single location by ID
 * 
 * @param id - Location ID
 * @returns Promise with location
 */
export const fetchLocation = async (id: number): Promise<Location> => {
  const response = await api.get(
    apiEndpoints.inventory.locations.detail(id),
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Create a new location
 * 
 * @param payload - Location data
 * @returns Promise with created location
 */
export const createLocation = async (payload: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location> => {
  // Direct URL construction without using the API endpoints object
  const url = '/inventory/fulfillment-locations/';
  
  const response = await api.post(
    url,
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Update an existing location
 * 
 * @param id - Location ID
 * @param payload - Update data
 * @returns Promise with updated location
 */
export const updateLocation = async (id: number, payload: Partial<Location>): Promise<Location> => {
  const response = await api.patch(
    apiEndpoints.inventory.locations.detail(id),
    payload,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Hook to fetch a single location
 * 
 * @param id - Location ID
 * @param options - Query options
 * @returns Object containing location data, loading state, and error state
 */
export function useFetchLocation(id: number, options?: { enabled?: boolean }) {
  const queryKey = ['location', id];
  
  return useQuery({
    queryKey,
    queryFn: () => fetchLocation(id),
    enabled: options?.enabled !== false && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to create a new location
 * 
 * @returns Mutation function and status
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

/**
 * Hook to update an existing location
 * 
 * @returns Mutation function and status
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Location> & { id: number }) => {
      return updateLocation(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

/**
 * Builds query parameters for adjustment reasons API requests
 * 
 * @param params - Filter parameters for adjustment reasons
 * @returns URL query string
 */
const buildAdjustmentReasonsQueryParams = (params?: InventoryFilter): string => {
  if (!params) return '';
  
  const urlParams = new URLSearchParams();
  
  if (params.search) urlParams.append('search', params.search);
  if (params.is_active !== undefined) urlParams.append('is_active', String(params.is_active));
  if (params.adjustment_type) urlParams.append('adjustment_type', params.adjustment_type);
  if (params.page !== undefined) urlParams.append('page', String(params.page));
  if (params.page_size !== undefined) urlParams.append('page_size', String(params.page_size));
  
  return urlParams.toString() ? `?${urlParams.toString()}` : '';
};

/**
 * Fetches adjustment reasons from the API
 * 
 * @param params - Filter parameters for adjustment reasons
 * @returns Promise with paginated adjustment reasons
 */
export const fetchAdjustmentReasons = async (params?: InventoryFilter): Promise<PaginatedResponse<AdjustmentReason>> => {
  // Set default params if not provided
  const defaultParams: InventoryFilter = {
    is_active: true,
    page: 1,
    page_size: 100,
  };
  
  const finalParams = params ? { ...defaultParams, ...params } : defaultParams;
  
  const response = await api.get(
    `${apiEndpoints.inventory.adjustmentReasons.list}${buildAdjustmentReasonsQueryParams(finalParams)}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Interface for the return value of the useAdjustmentReasons hook
 */
interface UseAdjustmentReasonsReturn {
  reasons: AdjustmentReason[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Hook to fetch and cache adjustment reasons
 * 
 * @param params - Optional filter parameters
 * @returns Object containing reasons, loading state, error state, and refetch function
 */
export function useAdjustmentReasons(params?: InventoryFilter): UseAdjustmentReasonsReturn {
  // Use a stable key for React Query caching
  const queryParams = params || { is_active: true, page_size: 100 };
  const cacheKey = ['adjustmentReasons', queryParams];
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchAdjustmentReasons(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    reasons: data?.results || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Fetch a single adjustment reason by ID
 * 
 * @param id - Adjustment reason ID
 * @returns Promise with adjustment reason
 */
export const fetchAdjustmentReason = async (id: number): Promise<AdjustmentReason> => {
  const response = await api.get(
    apiEndpoints.inventory.adjustmentReasons.detail(id),
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Create a new adjustment reason
 * 
 * @param payload - Adjustment reason data
 * @returns Promise with created adjustment reason
 */
export const createAdjustmentReason = async (payload: Omit<AdjustmentReason, 'id' | 'created_at' | 'updated_at'>): Promise<AdjustmentReason> => {
  const response = await api.post(
    apiEndpoints.inventory.adjustmentReasons.list,
    {
      name: payload.name,
      description: payload.description,
      is_active: payload.is_active,
    },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Update an existing adjustment reason
 * 
 * @param id - Adjustment reason ID
 * @param payload - Update data
 * @returns Promise with updated adjustment reason
 */
export const updateAdjustmentReason = async (id: number, payload: Partial<AdjustmentReason>): Promise<AdjustmentReason> => {
  const response = await api.patch(
    apiEndpoints.inventory.adjustmentReasons.detail(id),
    {
      name: payload.name,
      description: payload.description,
      is_active: payload.is_active,
    },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Delete an adjustment reason
 * 
 * @param id - Adjustment reason ID
 * @returns Promise with void
 */
export const deleteAdjustmentReason = async (id: number): Promise<void> => {
  await api.delete(
    apiEndpoints.inventory.adjustmentReasons.detail(id),
    { headers: getAuthHeaders() }
  );
};

/**
 * Hook to fetch a single adjustment reason
 * 
 * @param id - Adjustment reason ID
 * @param options - Query options
 * @returns Object containing adjustment reason data, loading state, and error state
 */
export function useFetchAdjustmentReason(id: number, options?: { enabled?: boolean }) {
  const queryKey = ['adjustmentReason', id];
  
  return useQuery({
    queryKey,
    queryFn: () => fetchAdjustmentReason(id),
    enabled: options?.enabled !== false && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to create a new adjustment reason
 * 
 * @returns Mutation function and status
 */
export function useCreateAdjustmentReason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: Omit<AdjustmentReason, 'id' | 'created_at' | 'updated_at'>) => 
      createAdjustmentReason(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustmentReasons'] });
    },
  });
}

/**
 * Hook to update an existing adjustment reason
 * 
 * @returns Mutation function and status
 */
export function useUpdateAdjustmentReason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdjustmentReason> & { id: number }) => {
      return updateAdjustmentReason(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustmentReasons'] });
    },
  });
}

/**
 * Hook to delete an adjustment reason
 * 
 * @returns Mutation function and status
 */
export function useDeleteAdjustmentReason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deleteAdjustmentReason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustmentReasons'] });
    },
  });
}
