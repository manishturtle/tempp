'use client';

/**
 * Inventory TypeScript type definitions
 * 
 * This file exports types and interfaces for inventory entities:
 * AdjustmentReason, StockAdjustment, etc.
 */

// Base interface for common fields
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  created_by?: User;
  updated_by?: User;
}

// User interface for audit fields
export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// User summary for audit fields
export interface UserSummary { 
  id: number; 
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// Adjustment Reason entity
export interface AdjustmentReason extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
}

// Define the adjustment types to match backend
export type AdjustmentType = 
  | 'ADD'       // Addition
  | 'SUB'       // Subtraction
  | 'RES'       // Reservation
  | 'REL_RES'   // Release Reservation
  | 'NON_SALE'  // Mark Non-Saleable
  | 'RECV_PO'   // Receive Purchase Order
  | 'SHIP_ORD'  // Ship Sales Order
  | 'RET_STOCK' // Return to Stock
  | 'RET_NON_SALE' // Return to Non-Saleable
  | 'HOLD'      // Place on Hold
  | 'REL_HOLD'  // Release from Hold
  | 'CYCLE'     // Cycle Count Adjustment
  | 'INIT';     // Initial Stock Load

// Paginated response interface for API responses
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Filter types for inventory entities
export interface InventoryFilter {
  search?: string;
  is_active?: boolean;
  adjustment_type?: string;
  page?: number;
  page_size?: number;
}

// Inventory List Parameters for API queries
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

// Product entity
export interface Product extends BaseEntity {
  id: number;
  name: string;
  sku: string;
  is_serialized: boolean;
  is_lotted: boolean;
  description?: string;
  is_active: boolean;
}

// Location entity
export interface Location extends BaseEntity {
  id: number;
  name: string;
  location_type: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  is_active: boolean;
  notes?: string;
}

// Parameters for location list API requests
export interface LocationListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  ordering?: string;
}

// Inventory Item entity
export interface InventoryItem extends BaseEntity {
  id: number;
  product: Product;
  location: Location;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  is_active: boolean;
}

// Inventory Adjustment entity
export interface InventoryAdjustment extends BaseEntity {
  id: number;
  inventory: number;
  adjustment_type: string;
  reason: number;
  quantity: number;
  lot_number?: string;
  expiry_date?: string;
  notes?: string;
}

// Adjustment history log entry
export interface AdjustmentLog {
  id: number;
  inventory: number;
  product_sku?: string;
  location_name?: string;
  user: UserSummary;
  adjustment_type: AdjustmentType;
  quantity_change: number;
  reason: AdjustmentReason;
  notes?: string;
  new_stock_quantity: number;
  timestamp: string;
}

// Parameters for adjustment history list API requests
export interface AdjustmentListParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  product_id?: number;
  location_id?: number;
  user_id?: number;
  adjustment_type?: string;
  timestamp__gte?: string;
  timestamp__lte?: string;
  search?: string;
}

// Form data state for inventory adjustment form
export interface FormDataState {
  productId: number | null;
  locationId: number | null;
  inventoryId: number | null; // Resolved after product/location selection
  adjustment_type: string; // 'INCREASE' | 'DECREASE'
  quantity_change: string; // Keep as string for input control
  reason: number | null;
  notes: string;
  serial_number: string;
  lot_number: string;
  expiry_date: Date | null; // MUI DatePicker often uses Date objects
}

// Payload for creating an inventory adjustment
export interface AdjustmentPayload {
  product_id: number;
  location_id: number;
  inventory_id?: number; // Optional, can be used instead of product_id/location_id
  adjustment_type: AdjustmentType;
  quantity_change: number;
  reason: number;
  notes?: string;
  serial_number?: string;
  lot_number?: string;
  expiry_date?: string; // Format as YYYY-MM-DD
}

// Response from creating an inventory adjustment
export interface AdjustmentResponse extends BaseEntity {
  id: number;
  inventory: number;
  adjustment_type: string;
  reason: AdjustmentReason;
  quantity_change: number;
  serial_number?: string;
  lot_number?: string;
  expiry_date?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// Inventory summary for displaying current quantities
export interface InventorySummary {
  stock_quantity: number;
  reserved_quantity: number;
  non_saleable_quantity: number;
  on_order_quantity: number;
  in_transit_quantity: number;
  returned_quantity: number;
  hold_quantity: number;
  backorder_quantity: number;
  low_stock_threshold: number;
  available_to_promise: number;
  total_available: number;
  total_unavailable: number;
  stock_status: string;
}

// Product summary for serialized inventory
export interface ProductSummary {
  id: number;
  name: string;
  sku: string;
  is_active: boolean;
}

// Location summary for serialized inventory
export interface LocationSummary {
  id: number;
  name: string;
  location_type: string;
  is_active: boolean;
}

// Serial Number Status enum
export enum SerialNumberStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  NON_SALEABLE = 'NON_SALEABLE',
  ON_HOLD = 'ON_HOLD',
  DAMAGED = 'DAMAGED',
  RETURNED = 'RETURNED',
  IN_TRANSIT = 'IN_TRANSIT',
  LOST = 'LOST'
}

// Serialized Inventory Item interface
export interface SerializedInventoryItem extends BaseEntity {
  id: number;
  inventory_record: number;
  product: ProductSummary;
  location: LocationSummary;
  serial_number: string;
  status: SerialNumberStatus;
  status_display: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  received_date: string;
  last_updated: string;
}

// Lot Inventory Types
export interface LotItem extends BaseEntity {
  id: number;
  inventory_record: number;
  product: ProductSummary;
  location: LocationSummary;
  lot_number: string;
  quantity: number;
  expiry_date?: string | null;
  received_date: string;
  created_at: string;
  updated_at: string;
}

export interface LotListParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  product_id?: number;
  location_id?: number;
  lot_number__icontains?: string;
  expiry_date__gte?: string;
  expiry_date__lte?: string;
  is_expired?: boolean;
}

export interface UpdateLotPayload {
  quantity?: number;
  expiry_date?: string | null;
}

// Parameters for serialized inventory list API requests
export interface SerializedListParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  product_id?: number;
  location_id?: number;
  status?: SerialNumberStatus;
  serial_number__icontains?: string;
}

// Payload for updating serialized inventory status
export interface UpdateSerializedStatusPayload {
  status: SerialNumberStatus;
  notes?: string;
}
