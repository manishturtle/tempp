// Types for product images
export interface ProductImage {
  id: number;
  client_id: number;
  company_id: number;
  product: number;
  image: string;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Types for product price
interface ProductPrice {
  min: number;
  max: number;
}

// Main product type
export interface Product {
  id: number;
  client_id: number;
  company_id: number;
  sku: string;
  name: string;
  product_type: string;
  publication_status: string;
  is_active: boolean;
  category: number;
  subcategory: number;
  price: ProductPrice;
  compare_at_price: number | null;
  currency_code: string;
  images: ProductImage[];
  stock_status: string;
  atp_quantity: number;
  short_description: string;
  key_features: string | null;
  created_at: string;
  updated_at: string;
}

// Filter item type
interface FilterItem {
  id: number;
  count: number;
  label: string;
}

// Filter group type
interface FilterGroup {
  [key: string]: FilterItem[];
}

// Filters type
export interface ProductFilters {
  divisions: Array<{
    division__id: number;
    division__name: string;
    count: number;
  }>;
  categories: Array<{
    category__id: number;
    category__name: string;
    count: number;
  }>;
  subcategories: Array<{
    subcategory__id: number;
    subcategory__name: string;
    count: number;
  }>;
  attributes: {
    [key: string]: Array<{
      id: number;
      count: number;
      label: string;
    }>;
  };
  price_range: {
    min: number;
    max: number;
  };
  // For filter parameters
  category_id?: number | number[];
  subcategory_id?: number | number[];
  division_id?: number | number[];
  price__gte?: number;
  price__lte?: number;
  brand?: string[];
}

// Pagination type
export interface Pagination {
  total_count: number;
  current_page: number;
  page_size: number;
  total_pages: number;
  total_results?: number; // For backwards compatibility
  has_next?: boolean; // For pagination control
}

// API response type
export interface ProductListingResponse {
  data: Product[];
  pagination: Pagination;
  filters: ProductFilters;
}

// Query parameters type
export interface ProductListingParams {
  category_id?: string | number | (string | number)[];
  division_id?: string | number | (string | number)[];
  subcategory_id?: string | number | (string | number)[];
  price_min?: number;
  price_max?: number;
  price__gte?: number; 
  price__lte?: number; 
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  // Delivery parameters
  pincode?: string;
  country?: string;
  customer_group_selling_channel_id?: string | number;
  // Add any other query parameters as needed
  [key: string]: any;
}
