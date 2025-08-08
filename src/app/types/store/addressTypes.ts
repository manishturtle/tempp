/**
 * Type definitions for address-related data
 */

/**
 * Enum for address types
 */
export enum AddressType {
  SHIPPING = "SHIPPING",
  BILLING = "BILLING"
}

/**
 * ApiAddress interface matching the structure received from the API with camelCase fields
 */
export interface ApiAddress {
  id: string;
  address_type: AddressType;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

/**
 * Legacy Address interface representing a shipping or billing address
 * with both snake_case and camelCase fields
 */
export interface Address {
  id: string | number;
  type: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string; // Or province
  postal_code: string;
  country: string;
  // phone_number?: string;
  is_default: boolean;
  address_type: AddressType;
  business_name?: string;
  gst_number?: string;
  
  
  // Keeping these for backward compatibility during transition
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  phoneNumber?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}
export interface CheckoutAddress {
  id: string | number;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string; // Or province
  postal_code: string;
  country: string;
  type: string;
  is_default: boolean;
  address_type: AddressType;
}
