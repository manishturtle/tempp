/**
 * Types for the checkout process
 */

/**
 * Represents the different steps in the checkout process
 */
export type CheckoutStep = 'identification' | 'shipping' | 'payment' | 'review';

/**
 * Form data for the user identification step
 */
export interface UserIdentificationFormData {
  email: string;
  saveForFuture?: boolean;
}

/**
 * Saved address interface for a user
 */
export interface SavedAddress {
  id: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone_number: string;
  is_default?: boolean;
  address_type?: 'SHIPPING' | 'BILLING';
}

/**
 * Recipient details for shipping (snake_case)
 */
export interface RecipientDetailsData {
  recipient_name: string;
  recipient_phone: string;
}

/**
 * Recipient data (camelCase) used in components
 */
export interface RecipientData {
  fullName: string;
  phoneNumber: string;
}

/**
 * Form data for the shipping address form
 */
export interface ShippingAddressFormData {
  full_name: string;
  type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  business_name?: string;
  gst_number?: string;
}

/**
 * Form data for the billing address form
 */
export interface BillingAddressFormData extends ShippingAddressFormData {
  use_shipping_address?: boolean;
  address_id?: string;
  use_saved_address?: boolean;
}

/**
 * Payload for saving shipping address to checkout session
 */
export interface SaveShippingAddressPayload {
  address_data?: ShippingAddressFormData;
}

/**
 * Payload for saving billing address to checkout session
 */
export interface SaveBillingAddressPayload {
  use_shipping_address?: boolean;
  address_id?: string | number;
  use_saved_address?: boolean;
  address_data?: BillingAddressFormData;
}

/**
 * Shipping method option available during checkout
 */
export interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  estimated_delivery_time: string;
  description?: string;
  is_default: boolean;
  estimated_delivery_date?: string;
}

/**
 * Payload for saving selected shipping method to checkout session
 */
export interface SaveShippingMethodPayload {
  shipping_method_id: string;
}

/**
 * Payment method interface
 */
export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_default: boolean;
  type: 'card' | 'paypal' | 'cod' | 'other';
  icon?: string;
  requires_additional_info: boolean;
}

/**
 * Wallet balance interface
 */
export interface PaymentWalletBalance {
  balance: number;
  currency: string;
}

/**
 * Loyalty points balance interface
 */
export interface PaymentLoyaltyBalance {
  points: number;
  value_per_point: number;
  currency: string;
}

/**
 * Payload for saving selected payment method
 */
export interface SavePaymentMethodPayload {
  payment_method_id: string;
  apply_wallet: boolean;
  redeemed_points: number;
}

/**
 * Promo code data
 */
export interface PromoCodeData {
  code: string;
  discount_amount?: number;
  discount_percentage?: number;
  is_valid: boolean;
  error_message?: string;
}

/**
 * Cart data for checkout
 */
export interface CartData {
  id: string;
  subtotal_amount: number;
  total_amount: number;
  currency: string;
  items: Array<CartItem>;
  item_count: number;
}

/**
 * Cart item details
 */
export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  image_url?: string;
  variant?: string;
}

/**
 * Order summary data displayed during checkout
 */
export interface OrderSummaryData {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  items: CartItem[];
  shipping_method?: ShippingMethod;
  promo_code?: PromoCodeData;
  wallet_amount_applied?: number;
  loyalty_discount_applied?: number;
}
