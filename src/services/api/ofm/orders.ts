import api from '@/app/services/api';
import { OrderFulfillmentDetail } from '@/types/ofm/orders';

/**
 * Fetch detailed order fulfillment information for a specific order
 * 
 * @param orderId The unique identifier of the order
 * @returns Promise resolving to the complete order fulfillment details
 */
export const getOrderFulfillmentDetails = async (
  orderId: string
): Promise<OrderFulfillmentDetail> => {
  try {
    // Use the configured API service which includes auth headers
    const response = await api.get(`/api/yash/ofm/execution/orders/${orderId}/fulfillment_details/`);
    return response.data;
  } catch (error) {
    // Enhance error with additional context
    const enhancedError = error as Error;
    enhancedError.message = `Failed to fetch order fulfillment details: ${enhancedError.message}`;
    throw enhancedError;
  }
};

export default {
  getOrderFulfillmentDetails,
};
