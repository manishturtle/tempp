import AuthService from '@/app/auth/services/authService';
import api from '@/lib/storeapi';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import { 
  OrderListParams, 
  OrderSummary, 
  PaginatedOrdersResponse, 
  OrderStatus,
  OrderDetail,
  OrderProgressStep,
  AddressDetail,
  PaymentMethodDetail 
} from '@/app/types/store/orderTypes';
import { formatCurrency } from '@/app/utils/formatters';

/**
 * API response interface matching the actual backend response
 */
interface ApiOrderResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: ApiOrder[];
}

/**
 * Order data structure from the API
 */
interface ApiOrder {
  id: number;
  order_id: string;
  account_id: number;
  contact_id: number;
  status: string;
  payment_status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
  items: ApiOrderItem[];
}

/**
 * Order detail data structure from the API, based on actual API response
 */
interface ApiOrderDetail {
  id: number;
  order_id: string;
  account_id: number;
  contact_id: number;
  status: string;
  currency: string;
  total_amount: string;
  subtotal_amount: string;
  tax_amount: string;
  shipping_amount: string;
  discount_amount: string;
  created_at: string;
  updated_at: string;
  shipping_address: ApiActualAddress;
  billing_address: ApiActualAddress;
  items: ApiOrderItem[];
  // Optional fields that might not be present in all responses
  shipping_method?: string;
  payment_method?: ApiPaymentMethod;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  can_return?: boolean;
  returns?: ApiOrderReturn[];
}

/**
 * Order item detail from the API
 */
interface ApiOrderDetailItem {
  id: number;
  product_id: number;
  product_name: string;
  variant_info: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  image_url: string | null;
}

/**
 * Address data structure from the actual API
 */
interface ApiActualAddress {
  full_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone_number: string;
}

/**
 * Payment method data structure from the API
 */
interface ApiPaymentMethod {
  type: string;
  display_name: string;
  last_four: string | null;
}

/**
 * Map an API payment method to our frontend format
 * 
 * @param paymentMethod - Payment method from API
 * @returns Frontend payment method format
 */
const mapPaymentMethod = (paymentMethod?: ApiPaymentMethod): PaymentMethodDetail => {
  if (!paymentMethod) {
    return {
      type: 'credit_card',
      displayName: 'Credit Card',
      lastFour: undefined
    };
  }
  
  return {
    type: paymentMethod.type,
    displayName: paymentMethod.display_name,
    lastFour: paymentMethod.last_four || undefined
  };
};

/**
 * Order return data structure from the API (actual format)
 */
interface ApiOrderReturn {
  id: number;
  rma_number: string;
  order_id: number;
  contact_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ApiOrderReturnItem[];
  order_details: {
    id: number;
    order_id: string;
    total_amount: string;
    currency: string;
    account_id: number;
    created_at: string;
  };
}

/**
 * Order return item data structure from the API (actual format)
 */
interface ApiOrderReturnItem {
  id: number;
  order_item_id: number;
  quantity_requested: number;
  received_quantity: number;
  resolution: string;
  condition: string;
  reason: string;
  order_item_details: {
    id: number;
    product_sku: string;
    product_name: string;
    unit_price: string;
    quantity: number;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Order item data structure from the API
 */
interface ApiOrderItem {
  id: number;
  order_id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  image_url?: string; // Added to match API response
  created_at: string;
  updated_at: string;
}

/**
 * Fetches orders for the current workspace user
 * 
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Promise with paginated orders response
 */
export const fetchOrders = async (params: OrderListParams): Promise<PaginatedOrdersResponse> => {
  try {
    // Ensure authentication check is done before making the API call
    if (!isAuthenticated()) {
      throw new Error('User is not authenticated');
    }

    const {
      page = 1,
      limit = 10,
      status,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    if (status) {
      queryParams.append('status', status);
    }

    const response = await api.get(`/om/orders?${queryParams.toString()}`);
    const apiResponse = response.data as ApiOrderResponse;
    
    return {
      orders: apiResponse.results.map(transformOrderData),
      pagination: {
        currentPage: apiResponse.current_page,
        totalPages: apiResponse.total_pages,
        totalItems: apiResponse.count,
        perPage: apiResponse.page_size
      }
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

/**
 * Fetches orders for the current user
 * 
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Promise with paginated orders response
 */
export const fetchUserOrders = async (params: OrderListParams): Promise<PaginatedOrdersResponse> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    // Use the api instance with explicit token in headers
    const response = await api.get('/om/order-history/', {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    
    // Transform the API response to our frontend data structure
    const apiResponse = response.data as ApiOrderResponse;
    
    return {
      orders: apiResponse.results.map(transformOrderData),
      pagination: {
        currentPage: apiResponse.current_page || 1,
        totalPages: apiResponse.total_pages || 1,
        totalItems: apiResponse.count || 0,
        perPage: apiResponse.page_size || params.limit || 10
      }
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error fetching user orders:', error);
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Transforms API order data to the frontend OrderSummary format
 * 
 * @param apiOrders - Array of orders from the API
 * @returns Array of transformed OrderSummary objects
 */
const transformOrdersData = (apiOrders: ApiOrder[]): OrderSummary[] => {
  return apiOrders.map(order => transformOrderData(order));
};

/**
 * Fetches detailed information for a specific order
 * 
 * @param orderId - The ID of the order to fetch
 * @returns Promise resolving to a detailed order object
 */
export const fetchUserOrderDetail = async (orderId: string): Promise<OrderDetail> => {
  try {
    // Ensure authentication check is done before making the API call
    if (!isAuthenticated()) {
      throw new Error('User is not authenticated');
    }

    const token = AuthService.getToken();
    
    // Use the api instance with explicit token in headers
    const response = await api.get(`/om/orders/${orderId}/`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    
    const apiOrderDetail = response.data as ApiOrderDetail;
    return transformOrderDetailData(apiOrderDetail);
  } catch (error) {
    console.error(`Error fetching order details for order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Transforms API order detail data to the frontend OrderDetail format
 * 
 * @param apiOrderDetail - Order detail data from the API
 * @returns Transformed OrderDetail object
 */
const transformOrderDetailData = (apiOrderDetail: ApiOrderDetail): OrderDetail => {
  // Format the address for display
  const formatAddress = (address: ApiActualAddress): AddressDetail => {
    const cityStateZipCountry = `${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}, ${address.country || ''}`;
    
    return {
      fullName: address.full_name || '',
      addressLine1: address.address_line1 || '',
      addressLine2: address.address_line2 || undefined,
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || '',
      country: address.country || '',
      phoneNumber: address.phone_number || '',
      cityStateZipCountry
    };
  };
  
  // Transform order items
  const transformedItems = apiOrderDetail.items.map(item => ({
    id: item.id.toString(),
    name: item.product_name,
    variantInfo: '', // Not provided in the API
    sku: item.product_sku,
    image_url: item.image_url || `/images/products/${item.product_sku}.jpg`, // Use image_url from API or fallback to default
    quantity: item.quantity,
    unitPrice: parseFloat(item.unit_price),
    unitPriceFormatted: formatCurrency(parseFloat(item.unit_price), apiOrderDetail.currency),
    lineTotal: parseFloat(item.total_price),
    lineTotalFormatted: formatCurrency(parseFloat(item.total_price), apiOrderDetail.currency)
  }));
  
  // Transform the returns data from the new API format
  const transformedReturns = apiOrderDetail.returns?.map(returnItem => {
    // Map API status values to the expected enum values in OrderRMASummary
    const statusMapping: Record<string, 'requested' | 'approved' | 'processing' | 'items_received' | 'completed' | 'rejected' | 'cancelled'> = {
      'PENDING_APPROVAL': 'requested',
      'APPROVED': 'approved',
      'PROCESSING': 'processing',
      'RECEIVED': 'items_received',
      'COMPLETED': 'completed',
      'REJECTED': 'rejected',
      'CLOSED': 'cancelled',
    };
    
    // Use the mapped value or default to 'requested' if unknown
    const mappedStatus = statusMapping[returnItem.status] || 'requested';
    
    return {
      id: returnItem.id.toString(),
      displayId: returnItem.rma_number,
      dateRequested: new Date(returnItem.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      // Use the mapped status for type compatibility
      status: mappedStatus,
      // Use the original status for display
      statusText: returnItem.status,
      // Still include the translation key for potential future use
      statusTextKey: `orders.status.rma.${returnItem.status.toLowerCase().replace(/[_-]/g, '')}`,
      items: returnItem.items.map(item => ({
        productName: item.order_item_details.product_name,
        quantity: item.quantity_requested
      })),
      // Keep the resolution in the original format from API
      resolutionStatus: returnItem.items[0]?.resolution || undefined,
      // Still include the translation key for potential future use
      resolutionStatusTextKey: returnItem.items[0]?.resolution ? 
        `orders.returns.resolution.${returnItem.items[0].resolution.toLowerCase().replace(/\s+/g, '')}` : 
        undefined
    };
  }) || [];
  
  // Generate progress steps based on order status
  const progressSteps: OrderProgressStep[] = generateOrderProgressSteps(apiOrderDetail.status);
  
  // Format the date
  const formattedDate = new Date(apiOrderDetail.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Determine if shipping and billing addresses are the same
  const sameShippingAndBilling = 
    apiOrderDetail.shipping_address.full_name === apiOrderDetail.billing_address.full_name &&
    apiOrderDetail.shipping_address.address_line1 === apiOrderDetail.billing_address.address_line1 &&
    apiOrderDetail.shipping_address.city === apiOrderDetail.billing_address.city;
  
  // Payment method will be mapped using our helper function
  
  return {
    id: apiOrderDetail.id.toString(),
    displayId: apiOrderDetail.order_id,
    date: formattedDate,
    status: apiOrderDetail.status.toLowerCase(),
    statusTextKey: `orders.status.${apiOrderDetail.status.toLowerCase()}`,
    progressSteps,
    shippingAddress: formatAddress(apiOrderDetail.shipping_address),
    billingAddress: formatAddress(apiOrderDetail.billing_address),
    sameShippingAndBilling,
    shippingMethodName: apiOrderDetail.shipping_method || 'Standard Shipping',
    carrier: apiOrderDetail.carrier || undefined,
    trackingNumber: apiOrderDetail.tracking_number || undefined,
    trackingUrl: apiOrderDetail.tracking_url || undefined,
    paymentMethod: mapPaymentMethod(apiOrderDetail.payment_method),
    items: transformedItems,
    totals: {
      subtotal: parseFloat(apiOrderDetail.subtotal_amount),
      subtotalFormatted: formatCurrency(parseFloat(apiOrderDetail.subtotal_amount), apiOrderDetail.currency),
      shipping: parseFloat(apiOrderDetail.shipping_amount),
      shippingFormatted: formatCurrency(parseFloat(apiOrderDetail.shipping_amount), apiOrderDetail.currency),
      tax: parseFloat(apiOrderDetail.tax_amount),
      taxFormatted: formatCurrency(parseFloat(apiOrderDetail.tax_amount), apiOrderDetail.currency),
      discountAmount: parseFloat(apiOrderDetail.discount_amount) || undefined,
      discountAmountFormatted: parseFloat(apiOrderDetail.discount_amount) > 0 ? 
        `-${formatCurrency(parseFloat(apiOrderDetail.discount_amount), apiOrderDetail.currency)}` : 
        undefined,
      discountCode: undefined, // Not provided in the API
      loyaltyPointsUsed: undefined, // Not provided in the API
      loyaltyPointsUsedFormatted: undefined, // Not provided in the API
      grandTotal: parseFloat(apiOrderDetail.total_amount),
      grandTotalFormatted: formatCurrency(parseFloat(apiOrderDetail.total_amount), apiOrderDetail.currency)
    },
    // Allow returns by default for delivered orders, otherwise use API value
    canInitiateReturn: apiOrderDetail.status === 'DELIVERED' ? true : (apiOrderDetail.can_return || false),
    existingRmas: transformedReturns.length > 0 ? transformedReturns : undefined
  };
};

/**
 * Generates order progress steps based on order status
 * 
 * @param status - Order status from API
 * @returns Array of OrderProgressStep objects
 */
const generateOrderProgressSteps = (status: string): OrderProgressStep[] => {
  const statusLower = status.toLowerCase();
  
  // Define all possible steps
  const steps: OrderProgressStep[] = [
    {
      labelKey: 'orders.progress.orderPlaced',
      completed: true,
      active: statusLower === 'pending'
    },
    {
      labelKey: 'orders.progress.processing',
      completed: ['processing', 'shipped', 'delivered'].includes(statusLower),
      active: statusLower === 'processing'
    },
    {
      labelKey: 'orders.progress.shipped',
      completed: ['shipped', 'delivered'].includes(statusLower),
      active: statusLower === 'shipped'
    },
    {
      labelKey: 'orders.progress.delivered',
      completed: statusLower === 'delivered',
      active: statusLower === 'delivered'
    }
  ];
  
  return steps;
};

/**
 * Transforms a single API order to the frontend OrderSummary format
 * 
 * @param apiOrder - Order data from the API
 * @returns Transformed OrderSummary object
 */
const transformOrderData = (apiOrder: ApiOrder): OrderSummary => {
  // Map the status from API format to our frontend format
  const statusMap: Record<string, OrderStatus> = {
    'PENDING': 'pending',
    'PENDING_PAYMENT': 'pending_payment',
    'PROCESSING': 'processing',
    'SHIPPED': 'shipped',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
    'PROCESSING_RETURN': 'processing_return',
    'RETURNED': 'returned'
  };
  
  // Handle null or undefined items array
  const items = apiOrder.items || [];
  
  // Get the primary item information
  const primaryItem = items.length > 0 ? items[0] : null;
  
  // Format the date (assuming ISO format from API)
  const orderDate = new Date(apiOrder.created_at);
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Map the API order to our frontend OrderSummary format
  return {
    id: apiOrder.id,
    displayId: apiOrder.order_id,
    status: statusMap[apiOrder.status] || 'pending',
    statusTextKey: `orderHistory.orderStatus.${statusMap[apiOrder.status] || 'pending'}`,
    date: formattedDate,
    totalAmountFormatted: formatCurrency(parseFloat(apiOrder.total_amount), apiOrder.currency),
    itemsPreview: {
      count: items.length,
      primaryItemName: primaryItem ? primaryItem.product_name : undefined,
      primaryItemImage: primaryItem?.image_url || (primaryItem ? `/images/products/${primaryItem.product_sku}.jpg` : undefined),
      additionalItemsCount: Math.max(0, items.length - 1),
      // Include all items for grid view
      items: items.map(item => ({
        id: item.id,
        name: item.product_name,
        sku: item.product_sku,
        image_url: item.image_url || `/images/products/${item.product_sku}.jpg`,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price)
      }))
    },
    actions: {
      viewDetailsUrl: `/store/account/orders/${apiOrder.id}`,
      trackUrl: apiOrder.status === 'SHIPPED' ? `/store/track-order/${apiOrder.id}` : undefined,
      requestReturnUrl: ['DELIVERED'].includes(apiOrder.status) 
        ? `/store/account/orders/${apiOrder.id}/return` 
        : undefined,
      trackReturnUrl: ['PROCESSING_RETURN', 'RETURNED'].includes(apiOrder.status) 
        ? `/store/account/orders/${apiOrder.id}/track-return` 
        : undefined,
    },
  };
};
