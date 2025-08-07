/**
 * Inventory Types
 * 
 * Type definitions for inventory-related data structures
 */

/**
 * Product summary information
 */
export interface ProductSummary {
  id: number;
  sku: string;
  name: string;
}

/**
 * Location summary information
 */
export interface LocationSummary {
  id: number;
  name: string;
}

/**
 * Inventory item with product and location details
 */
export interface InventoryItem {
  id: number;
  product: ProductSummary;
  location: LocationSummary;
  stock_quantity: number;
  reserved_quantity: number;
  non_saleable_quantity: number;
  on_order_quantity: number;
  in_transit_quantity: number;
  returned_quantity: number;
  hold_quantity: number;
  backorder_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  available_to_promise: number;
  total_available: number;
  total_unavailable: number;
  stock_status: string;
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Processed inventory item with formatted fields for display
 */
export interface ProcessedInventoryItem {
  id: number;
  product: {
    id: number;
    name: string;
    sku?: string;
    is_active?: boolean;
  };
  location: {
    id: number;
    name: string;
    location_type?: string;
  };
  stock_quantity: number;
  reserved_quantity: number;
  non_saleable_quantity: number;
  on_order_quantity: number;
  in_transit_quantity: number;
  returned_quantity: number;
  hold_quantity: number;
  backorder_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  available_to_promise: number;
  total_available: number;
  total_unavailable: number;
  stock_status: string;
  formattedLastUpdated: string;
  formattedCreatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
}

/**
 * API response structure for inventory items
 */
export interface ApiInventoryItem {
  id: number;
  product: {
    id: number;
    sku: string;
    name: string;
    is_active: boolean;
  };
  location: {
    id: number;
    name: string;
    location_type: string;
  };
  stock_quantity: number;
  reserved_quantity: number;
  non_saleable_quantity: number;
  on_order_quantity: number;
  in_transit_quantity: number;
  returned_quantity: number;
  hold_quantity: number;
  backorder_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  available_to_promise: number;
  total_available: number;
  total_unavailable: number;
  stock_status: string;
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Paginated response structure from the API
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Parameters for inventory list API requests
 */
export interface InventoryListParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  product__name__icontains?: string;
  location__name__icontains?: string;
  stock_quantity__gte?: number;
  stock_quantity__lte?: number;
  available_to_promise__gte?: number;
  available_to_promise__lte?: number;
  isActive?: boolean;
}

/**
 * Filter state for inventory list
 */
export interface InventoryFilterState {
  field: string;
  operator: string;
  value: any;
}

/**
 * Inventory summary stats
 */
export interface InventorySummary {
  total_items: number;
  draft_items: number;
  in_transit_items: number;
  low_stock_items: number;
  total_items_change: number;
  draft_items_change: number;
  in_transit_items_change: number;
  low_stock_items_change: number;
}
