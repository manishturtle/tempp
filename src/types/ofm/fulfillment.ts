// Types for Order Fulfillment

export interface FulfillmentFilterOption {
  key: string;
  name: string;
  count: number;
}

export interface FulfillmentFilterOptions {
  statuses: FulfillmentFilterOption[];
  workflows?: FulfillmentFilterOption[];
}

export interface OrderFulfillmentItem {
  order_id: string;
  order_date: string;
  customer_id: string;
  item_count: number;
  overall_fulfillment_status: string;
  involved_workflow_names: string[];
  next_action_hint: string;
  total_value?: number;
}

export interface OrderFulfillmentListResponse {
  count: number;
  next: number | null;
  previous: number | null;
  results: OrderFulfillmentItem[];
}
