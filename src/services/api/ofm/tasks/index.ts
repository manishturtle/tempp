import api from '@/app/services/api';
import { BatchActionPayload, BatchActionResponse } from '@/types/ofm/tasks/';

/**
 * Execute a batch action on multiple Order Item Fulfillments (OIFs)
 * 
 * @param payload The batch action payload containing action type, OIF IDs, and data
 * @returns Promise resolving to the batch action response
 */
export const executeBatchAction = async (
  payload: BatchActionPayload
): Promise<BatchActionResponse> => {
  try {
    // Use the configured API service which includes auth headers
    const response = await api.post('/api/yash/ofm/execution/tasks/batch/', payload);
    return response.data;
  } catch (error) {
    // Enhance error with additional context
    const enhancedError = error as Error;
    enhancedError.message = `Batch action failed: ${enhancedError.message}`;
    throw enhancedError;
  }
};

export default {
  executeBatchAction,
};
