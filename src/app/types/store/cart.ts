/**
 * Types related to the shopping cart functionality
 */

export interface ProductImage {
  id: number | null;
  image: string | null;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
}

export interface ProductDetails {
  id: string;
  sku: string;
  name: string;
  price: string;
  images: ProductImage[];
  unit_name: string;
  unit_tax?: string;
  // Delivery eligibility fields
  delivery_eligible?: boolean;
  delivery_error?: string;
  // Inventory thresholds
  min_count?: number;
  max_count?: number;
  // Quantity error message (from backend)
  quantity_error?: string;
}

export interface CartItem {
  id: number;
  product_sku: string;
  quantity: number;
  product_details: ProductDetails;
  created_at: string;
  updated_at: string;
  taxes: {
    tax_id: number;
    tax_code: string;
    tax_rate: string;
    tax_amount: string;
  }[];
}

export interface CartSummary {
  subtotal_amount: number;
  shipping_estimate?: number;
  tax_estimate?: number;
  total_amount: number;
  total_quantity: number;
  currency: string;
}

export interface Cart {
  id: number;
  status: string;
  items: CartItem[];
  total_quantity: number;
  subtotal_amount: string;
  total_tax: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

export interface AddToCartPayload {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface UpdateCartItemPayload {
  item_id: string;
  quantity: number;
}
