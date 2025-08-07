/**
 * Product interface matching the backend ProductSerializer output
 */
export interface Product {
  id: number;
  sku: string;
  name: string;
  short_description?: string;
  description?: string;
  price: number;
  sale_price?: number;
  display_price: string;
  rating: number;
  review_count: number;
  image_url: string;
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock';
  is_featured?: boolean;
  is_new?: boolean;
  category?: string;
  brand?: string;
  colors?: string[];
  sizes?: string[];
  created_at?: string;
  updated_at?: string;
  currency_code?: string;
  atp_quantity?: number;
}

/**
 * Product filter interface
 */
export interface ProductFilter {
  id: number;
  label: string;
  value: string;
  count?: number;
}

/**
 * Sort option interface
 */
export interface SortOption {
  value: string;
  label: string;
}
