import { OrderStatus } from '../store/order';

export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

/**
 * Parameters for fetching admin order list with pagination, sorting, and filtering
 */
export interface AdminOrderListParams {
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Sort field */
  sort_by?: string;
  /** Sort direction: 'asc' or 'desc' */
  sort_direction?: 'asc' | 'desc';
  /** Filter by order number */
  order_number?: string;
  /** Filter by customer name */
  customer_name?: string;
  /** Filter by email */
  email?: string;
  /** Filter by order status */
  status?: OrderStatus;
  /** Filter by date range - start date */
  date_from?: string;
  /** Filter by date range - end date */
  date_to?: string;
  /** Filter by minimum total amount */
  total_min?: number;
  /** Filter by maximum total amount */
  total_max?: number;
  /** Filter by payment method */
  payment_method?: string;
  /** Filter by payment status */
  payment_status?: string;
}

/**
 * Represents an order in the admin list view
 */
export interface AdminOrder {
  /** Unique order identifier */
  id: string;
  /** Order number for display */
  order_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  currency: string;
  account_id: number | null;
  contact_id: number | null;
  customer_details: CustomerDetails | null;
  subtotal_amount: string;
  discount_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total_amount: string;
  shipping_address: Address;
  billing_address: Address;
  shipping_method_name: string | null;
  shipping_method_id: string | null;
  tracking_number: string | null;
  carrier_name: string | null;
  items: OrderItem[];
  returns: any[];
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
  guest_access_token: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

/**
 * Response structure for paginated admin orders
 */
/**
 * Customer details in order
 */
export interface CustomerDetails {
  /** Customer name */
  name: string;
  /** Customer email */
  email: string;
  /** Customer phone number */
  phone?: string;
  /** Customer company name */
  company?: string;
  /** Account status */
  account_status?: string;
  /** Contact ID */
  contact_id?: number;
}

/**
 * Address information
 */
export interface Address {
  /** City name */
  city: string;
  /** State or province name */
  state: string;
  /** Country code */
  country: string;
  /** Full name on the address */
  full_name: string;
  /** Postal or ZIP code */
  postal_code: string;
  /** Phone number */
  phone_number: string;
  /** Address line 1 */
  address_line1: string;
  /** Address line 2 */
  address_line2?: string;
  /** Whether to save this address for future use */
  save_for_future?: boolean;
}

/**
 * Order item details
 */
export interface OrderItem {
  /** Item ID */
  id: number;
  /** Order ID this item belongs to */
  order_id: number;
  /** Product SKU */
  product_sku: string;
  /** Product name */
  product_name: string;
  /** Quantity ordered */
  quantity: number;
  /** Unit price */
  unit_price: string;
  /** Total price */
  total_price: string;
  /** Product image URL */
  image_url?: string;
  /** Creation date */
  created_at: string;
  /** Last update date */
  updated_at: string;
}

/**
 * Response structure for paginated admin orders
 */
export interface PaginatedAdminOrdersResponse {
  /** List of orders */
  results: AdminOrder[];
  /** Total number of orders matching the filters */
  count: number;
  /** Number of pages available */
  total_pages: number;
  /** Current page number */
  current_page: number;
  /** Number of items per page */
  page_size: number;
  /** Link to next page if available */
  next?: string | null;
  /** Link to previous page if available */
  previous?: string | null;
}
