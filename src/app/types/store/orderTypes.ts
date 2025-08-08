/**
 * Types related to orders in the store
 */

/**
 * Order status types
 */
export type OrderStatus = 
  | 'pending' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'processing_return' 
  | 'returned'
  | 'pending_payment';

/**
 * Interface for the order preview information
 */
/**
 * Interface for order item preview in the order history
 */
export interface OrderItemPreview {
  /** Unique identifier for the order item */
  id: number;
  /** Name of the product */
  name: string;
  /** Stock keeping unit */
  sku: string;
  /** Product image URL */
  image_url: string;
  /** Quantity ordered */
  quantity: number;
  /** Unit price */
  unit_price: number;
  /** Total price for this line item */
  total_price: number;
}

export interface ItemsPreview {
  /** Number of items in the order */
  count: number;
  /** Name of the primary item */
  primaryItemName?: string;
  /** Image URL of the primary item */
  primaryItemImage?: string;
  /** Number of additional items beyond the primary one */
  additionalItemsCount?: number;
  /** Array of all items in the order for detailed display */
  items?: OrderItemPreview[];
}

/**
 * Interface for order action links
 */
export interface OrderActions {
  /** URL to view order details */
  viewDetailsUrl: string;
  /** URL to track the order (if available) */
  trackUrl?: string;
  /** URL to request a return (if available) */
  requestReturnUrl?: string;
  /** URL to track a return (if available) */
  trackReturnUrl?: string;
}

/**
 * Interface for the order summary information
 */
export interface OrderSummary {
  /** Unique identifier for the order */
  id: string | number;
  /** Display identifier for the order (e.g., ORD-12345) */
  displayId: string;
  /** Current status of the order */
  status: OrderStatus;
  /** Translation key for the status text */
  statusTextKey: string;
  /** Order date */
  date: string;
  /** Formatted total amount with currency symbol */
  totalAmountFormatted: string;
  /** Preview of items in the order */
  itemsPreview: ItemsPreview;
  /** Available actions for this order */
  actions: OrderActions;
}

/**
 * Interface for order list query parameters
 */
export interface OrderListParams {
  /** Page number for pagination */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Filter by order status */
  status?: string;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Search term for filtering orders */
  searchTerm?: string;
}

/**
 * Interface for paginated response of orders
 */
export interface PaginatedOrdersResponse {
  /** List of order summaries */
  orders: OrderSummary[];
  /** Pagination information */
  pagination: {
    /** Current page number */
    currentPage: number;
    /** Total number of pages */
    totalPages: number;
    /** Total number of items across all pages */
    totalItems: number;
    /** Number of items per page */
    perPage: number;
  };
}

/**
 * Interface for order progress step
 */
export interface OrderProgressStep {
  /** i18n key for step label */
  labelKey: string;
  /** Whether the step has been completed */
  completed: boolean;
  /** Whether this is the current active step */
  active: boolean;
}

/**
 * Interface for order RMA (Return Merchandise Authorization) item summary
 */
export interface OrderRMAItemSummary {
  /** Name of the product being returned */
  productName: string;
  /** Quantity being returned */
  quantity: number;
}

/**
 * Interface for order RMA summary
 */
export interface OrderRMASummary {
  /** Unique identifier for the RMA */
  id: string;
  /** Display identifier for the RMA */
  displayId: string;
  /** Date the RMA was requested */
  dateRequested: string;
  /** Current status of the RMA */
  status: 'requested' | 'approved' | 'processing' | 'items_received' | 'completed' | 'rejected' | 'cancelled';
  /** Raw status text from the API (for direct display) */
  statusText?: string;
  /** Translation key for the RMA status */
  statusTextKey: string;
  /** Summary of items in this RMA */
  items: OrderRMAItemSummary[];
  /** Resolution status */
  resolutionStatus?: string;
  /** Translation key for resolution status */
  resolutionStatusTextKey?: string;
}

/**
 * Interface for order item details
 */
export interface OrderItemDetail {
  /** Unique identifier for the order item */
  id: string;
  /** Product name */
  name: string;
  /** Variant information (e.g., "Blue / Medium") */
  variantInfo: string;
  /** Stock keeping unit */
  sku: string;
  /** Product image URL */
  image_url: string;
  /** Quantity ordered */
  quantity: number;
  /** Unit price as a number */
  unitPrice: number;
  /** Formatted unit price for display */
  unitPriceFormatted: string;
  /** Total line price as a number */
  lineTotal: number;
  /** Formatted line total for display */
  lineTotalFormatted: string;
}

/**
 * Interface for address information
 */
export interface AddressDetail {
  /** Full name of the recipient */
  fullName: string;
  /** First address line */
  addressLine1: string;
  /** Second address line (optional) */
  addressLine2?: string;
  /** City name */
  city: string;
  /** State/province */
  state: string;
  /** Postal/ZIP code */
  postalCode: string;
  /** Country */
  country: string;
  /** Phone number */
  phoneNumber: string;
  /** Combined city, state, postal code, and country */
  cityStateZipCountry: string;
}

/**
 * Interface for payment method details
 */
export interface PaymentMethodDetail {
  /** Payment method type */
  type: string;
  /** Display name for the payment method */
  displayName: string;
  /** Last four digits for card payments */
  lastFour?: string;
}

/**
 * Interface for order totals
 */
export interface OrderTotals {
  /** Subtotal amount */
  subtotal: number;
  /** Formatted subtotal for display */
  subtotalFormatted: string;
  /** Shipping amount */
  shipping: number;
  /** Formatted shipping amount for display */
  shippingFormatted: string;
  /** Tax amount */
  tax: number;
  /** Formatted tax amount for display */
  taxFormatted: string;
  /** Discount amount (optional) */
  discountAmount?: number;
  /** Formatted discount amount for display (optional) */
  discountAmountFormatted?: string;
  /** Discount code used (optional) */
  discountCode?: string;
  /** Loyalty points used (optional) */
  loyaltyPointsUsed?: number;
  /** Formatted loyalty points used for display (optional) */
  loyaltyPointsUsedFormatted?: string;
  /** Grand total amount */
  grandTotal: number;
  /** Formatted grand total for display */
  grandTotalFormatted: string;
}

/**
 * Comprehensive interface for a detailed order
 */
export interface OrderDetail {
  /** Order ID */
  id: string;
  /** Display order ID (for customer-facing UI) */
  displayId: string;
  /** Order date */
  date: string;
  /** Order status */
  status: string;
  /** Translation key for status text */
  statusTextKey: string;
  /** Order progress steps */
  progressSteps: OrderProgressStep[];
  /** Shipping address information */
  shippingAddress: AddressDetail;
  /** Billing address information */
  billingAddress: AddressDetail;
  /** Whether shipping and billing addresses are the same */
  sameShippingAndBilling: boolean;
  /** Shipping method name */
  shippingMethodName: string;
  /** Shipping carrier (optional) */
  carrier?: string;
  /** Tracking number (optional) */
  trackingNumber?: string;
  /** Tracking URL (optional) */
  trackingUrl?: string;
  /** Payment method details */
  paymentMethod: PaymentMethodDetail;
  /** Order items */
  items: OrderItemDetail[];
  /** Order totals */
  totals: OrderTotals;
  /** Whether customer can initiate a return */
  canInitiateReturn: boolean;
  /** Existing RMA summaries (optional) */
  existingRmas?: OrderRMASummary[];
}
