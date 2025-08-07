import api from '@/lib/storeapi';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import AuthService from '@/app/auth/services/authService';

/**
 * ReturnRequestPayloadItem interface defines the structure for a single item in a return request
 */
interface ReturnRequestPayloadItem {
  order_item_id: number; // Changed from itemId to order_item_id to match backend
  quantity: number;
  reason: string; // Changed from reasonId to reason to match backend
}

/**
 * ReturnRequestPayload interface defines the structure for a complete return request
 */
export interface ReturnRequestPayload {
  order_id: number; // Changed from orderId to order_id to match backend
  items: ReturnRequestPayloadItem[]; // Changed from itemsToReturn to items to match backend
  comments?: string;
  preferred_resolution_id?: string; // Changed from preferredResolutionId to preferred_resolution_id to match backend
}

/**
 * SubmitReturnResponse interface defines the structure of the response from the backend
 */
export interface SubmitReturnResponse {
  rma_number: string;
  order_id: number;
  status: string;
  message: string;
}

/**
 * ReturnItem interface defines the structure for a return item in the order response
 */
export interface ReturnItem {
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
 * Return interface defines the structure for a return in the order response
 */
export interface Return {
  id: number;
  rma_number: string;
  order_id: number;
  contact_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ReturnItem[];
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
 * OrderWithReturn interface extends the Order interface to include return data
 */
export interface OrderWithReturns {
  id: number;
  order_id: string;
  // Other order fields...
  returns: Return[];
}

/**
 * Checks if an order has any associated returns
 * 
 * @param order - The order object from the API
 * @returns Boolean indicating if the order has returns
 */
export const hasReturns = (order: OrderWithReturns): boolean => {
  return order.returns && order.returns.length > 0;
};

/**
 * Gets return details for a specific order item
 * 
 * @param order - The order object from the API
 * @param orderItemId - The ID of the order item
 * @returns Return item details if found, undefined otherwise
 */
export const getReturnForOrderItem = (order: OrderWithReturns, orderItemId: number): ReturnItem | undefined => {
  if (!hasReturns(order)) return undefined;
  
  for (const returnData of order.returns) {
    const returnItem = returnData.items.find(item => item.order_item_id === orderItemId);
    if (returnItem) return returnItem;
  }
  
  return undefined;
};

/**
 * Gets the return status for an order
 * 
 * @param order - The order object from the API
 * @returns String representing the return status, or undefined if no returns
 */
export const getOrderReturnStatus = (order: OrderWithReturns): string | undefined => {
  if (!hasReturns(order)) return undefined;
  
  // If there are multiple returns, this will return the status of the first one
  return order.returns[0].status;
};

/**
 * Submits a return request to the API
 * 
 * @param payload - The return request data
 * @returns Promise resolving to the API response
 */
export const submitReturnRequest = async (
  payload: ReturnRequestPayload
): Promise<SubmitReturnResponse> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    // Use the api instance with explicit token in headers
    const response = await api.post(
      '/om/returns/initiate/',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error submitting return request:', error);
    throw error;
  }
};
