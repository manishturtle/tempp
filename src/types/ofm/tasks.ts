/**
 * TypeScript types for batch actions on Order Item Fulfillments (OIFs)
 */

/**
 * Payload for executing batch actions on OIFs
 * 
 * Note: This is a simplified version. In the future, this may be extended to support
 * more complex scenarios where different OIFs require different actions or data.
 */
export interface BatchActionPayload {
  /** The action to perform on all OIFs */
  action: 'COMPLETE_STEP' | 'HOLD' | 'EXCEPTION' | 'CANCEL' | string;
  
  /** Array of OIF IDs to perform the action on */
  oif_ids: string[];
  
  /** Common data to apply to all OIFs in the batch */
  common_data?: Record<string, any>;
  
  /**
   * Optional per-item data for more complex scenarios
   * This would allow different data for each OIF in the batch
   * 
   * Note: This is commented out as it depends on backend support
   * Uncomment and use this when backend supports mixed actions/data
   */
  // items?: {
  //   oif_id: string;
  //   step_id: string;
  //   data: Record<string, any>;
  // }[];
}

/**
 * Result item for a single OIF in a batch action
 */
export interface BatchActionResultItem {
  /** The OIF ID that was processed */
  oif_id: string;
  
  /** Whether the action was successful for this OIF */
  status: 'success' | 'failed';
  
  /** Optional reason for failure */
  reason?: string;
}

/**
 * Response from the batch action API
 */
export interface BatchActionResponse {
  /** Array of successfully processed OIFs */
  success: BatchActionResultItem[];
  
  /** Array of OIFs that failed processing */
  failed: BatchActionResultItem[];
}
