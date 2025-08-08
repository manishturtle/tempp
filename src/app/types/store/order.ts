/**
 * Types for Order, Order Confirmation, and Order Tracking
 */

import { ShippingMethod } from './checkout';

/**
 * Order status enum
 */
export type OrderStatus = 
  | 'PLACED' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'RETURNED';

/**
 * Order item interface
 */
export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  image_url?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

/**
 * Order address interface
 */
export interface OrderAddress {
  full_name: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone_number: string;
}

/**
 * Order payment method interface
 */
export interface OrderPaymentMethod {
  id: string;
  type: string;
  name: string;
  last_four?: string;
  expiry_month?: string;
  expiry_year?: string;
  wallet_amount_applied?: number;
  loyalty_points_redeemed?: number;
  loyalty_value_applied?: number;
}

/**
 * Order summary interface
 */
export interface OrderSummary {
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  grand_total: number;
  currency: string;
}

/**
 * Shipment tracking information interface
 */
export interface ShipmentTracking {
  carrier: string;
  tracking_number: string;
  tracking_url?: string;
  shipped_at: string;
  estimated_delivery_date?: string;
  items: OrderItem[];
}

/**
 * Return eligibility interface
 */
export interface ReturnEligibility {
  is_eligible: boolean;
  eligibility_end_date?: string;
  reason?: string;
  days_remaining?: number;
}

/**
 * Order confirmation interface
 */
/**
 * Order item from API response
 */
export interface OrderItemResponse {
  id: number;
  order_id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice information interface
 */
export interface InvoiceInfo {
  id: number;
  invoice_number: string;
  date: string;
  due_date: string;
  payment_status: string;
  invoice_status: string;
  total_amount: string;
  currency: string;
}

/**
 * Order confirmation interface matching the actual API response
 */
export interface OrderConfirmation {
  id: number;
  order_id: string;
  order_number: string;
  account_id: number;
  contact_id: number;
  status: string;
  currency: string;
  subtotal_amount: string;
  discount_amount: string;
  shipping_amount: string;
  tax_amount: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
  shipping_address: OrderAddress;
  billing_address: OrderAddress;
  // Invoice information
  invoice?: InvoiceInfo;
  // Legacy fields that might be used in some places
  shipping_method?: ShippingMethod;
  payment_method?: OrderPaymentMethod;
  summary?: OrderSummary;
  guest_access_token?: string;
  customer_email?: string;
  contact_email?: string;
  estimated_delivery_date?: string;
}

/**
 * Guest order tracking interface
 */
export interface GuestOrderTracking {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  processed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  estimated_delivery_date?: string;
  items: OrderItem[];
  shipping_address: OrderAddress;
  billing_address: OrderAddress;
  shipping_method: ShippingMethod;
  payment_method: OrderPaymentMethod;
  summary: OrderSummary;
  shipment_tracking?: ShipmentTracking;
  return_eligibility?: ReturnEligibility;
}
