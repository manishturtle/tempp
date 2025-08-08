/**
 * TypeScript types for Order Fulfillment Details
 */

/**
 * Represents a workflow step in the progress bar
 */
export interface WorkflowStepBasic {
  id: number;
  name: string;
  sequence_order: number;
}

/**
 * Status options for Order Item Fulfillments
 */
export enum OIFStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  EXCEPTION = 'EXCEPTION'
}

/**
 * Represents a single item within the order detail
 */
export interface OIFDetailItem {
  oif_id: number;
  order_line_item_id: string;
  product_id: string;
  sku: string;
  quantity: number;
  status: OIFStatus;
  assigned_workflow_name: string;
  current_step_id: number | null;
  current_step_name: string | null;
  lock_version: number;
  all_steps_in_version: WorkflowStepBasic[];
  product_name: string;
  product_image_url: string | null;
}

/**
 * Complete order fulfillment details response
 */
export interface OrderFulfillmentDetail {
  order_id: string;
  order_date: string;
  overall_fulfillment_status: OIFStatus;
  customer_id: string;
  items: OIFDetailItem[];
}
