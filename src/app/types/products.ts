/**
 * Type definitions for product-related data structures
 */

export enum ProductType {
  REGULAR = 'REGULAR',
  PARENT = 'PARENT',
  VARIANT = 'VARIANT',
  KIT = 'KIT'
}

export enum PublicationStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  sort_order: number;
  is_default: boolean;
}

export interface ProductAttributeValue {
  id: number;
  attribute_id: number;
  attribute_name: string;
  attribute_code: string;
  attribute_type: string;
  value: any;
  use_variant: boolean;
  is_deleted?: boolean;
}

/**
 * Interface for attribute values from the API response
 */
export interface ApiAttributeValue {
  id?: number;
  client_id?: number;
  company_id?: number;
  product?: number;
  attribute: number | { id: number; name: string; code: string; data_type: string };
  attribute_name?: string;
  attribute_code?: string;
  attribute_type?: string;
  value: any;
  value_text?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value_option?: number | null;
  use_variant?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for attribute values in the API payload format
 * This matches the Django backend's expected structure
 */
export interface AttributeValueInput {
  attribute: number;
  value: any;
}

export interface AttributeValue {
  value: string | number | boolean | Date | { id: number; name: string; code?: string } | Array<number | { id: number; name: string; code?: string }>;
  use_variant: boolean;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  product_type: ProductType;
  description: string;
  short_description: string;
  category: number;
  category_name: string;
  default_tax_rate_profile: number | null;
  is_tax_exempt: boolean;
  display_price: number;
  is_active: boolean;
  allow_reviews: boolean;
  inventory_tracking_enabled: boolean;
  backorders_allowed: boolean;
  quantity_on_hand: number;
  is_serialized: boolean;
  is_lotted: boolean;
  publication_status: PublicationStatus;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  created_at: string;
  updated_at: string;
}

export interface ProductDetail {
  id: number;
  /**
   * productstatus is used by the backend for product status reference (id or object)
   */
  productstatus?: number | { id: number; name: string; description?: string };

  name: string;
  product_type: ProductType;
  description: string;
  short_description: string;
  division?: {
    id: number;
    name: string;
  };
  category?: {
    id: number;
    name: string;
  };
  status?: {
    id: number;
    name: string;
  };
  uom?: {
    id: number;
    name: string;
  };
  is_active: boolean;
  currency_code: string;
  display_price: number;
  default_tax_rate_profile?: {
    id: number;
    name: string;
  };
  is_tax_exempt: boolean;
  compare_at_price: number | null;
  sku: string;
  inventory_tracking_enabled: boolean;
  quantity_on_hand: number;
  is_serialized: boolean;
  is_lotted: boolean;
  backorders_allowed: boolean;
  allow_reviews: boolean;
  pre_order_available: boolean;
  pre_order_date: string | null;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  attribute_values?: {
    id: number;
    attribute: {
      id: number;
      name: string;
      code: string;
      data_type: string;
    };
    value: string | number | boolean | Date | { id: number; name: string; code?: string } | (number | { id: number; name: string; code?: string })[];
    use_variant: boolean;
  }[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  tags?: string[];
  slug?: string;
  subcategory?: {
    id: number;
    name: string;
  };
  variant_defining_attributes?: number[];
  publication_status?: PublicationStatus;
  
  /**
   * Product images array from API response
   * Contains both product images and their metadata
   */
  images?: ProductImage[];
}

export interface ProductVariant {
  id: number;
  product: number;
  sku: string;
  display_price: number;
  is_active: boolean;
  quantity_on_hand: number;
  options: number[];
  options_display: string;
  status_override: number | null;
  is_serialized: boolean;
  is_lotted: boolean;
  created_at: string;
  updated_at: string;
  /**
   * Variant images array from API response
   * Contains both variant images and their metadata
   */
  images?: ProductImage[];
}

export interface KitComponent {
  id: number;
  kit_product: number;
  component_product: number | null;
  component_variant: number | null;
  quantity: number;
  is_swappable_group: boolean;
  component_display: string;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListItem[];
}

export interface TemporaryImageData {
  id: string;
  alt_text?: string;
  sort_order?: number;
  is_default?: boolean;
}

export interface ProductFormData {
  name: string;
  product_type: ProductType;
  attributes: Record<string, ProductAttributeValue>;
  publication_status?: PublicationStatus;
  division: number;
  category: number;
  subcategory?: number;
  productstatus: number;
  uom_id: number;
  is_active: boolean;
  allow_reviews: boolean;
  is_tax_exempt: boolean;
  currency_code: string;
  display_price: number;
  compare_at_price?: number | null;
  default_tax_rate_profile?: number | null;
  sku: string;
  inventory_tracking_enabled: boolean;
  quantity_on_hand: number;
  is_serialized: boolean;
  is_lotted: boolean;
  backorders_allowed: boolean;
  pre_order_available: boolean;
  pre_order_date?: string | null;
  description: string;
  short_description: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  faqs: Array<{ question: string; answer: string }>;
  tags: string[];
  key_features?: string[];
  temp_images: TemporaryImageData[];
  variant_defining_attributes: number[];
  attribute_values_input: AttributeValueInput[];
  slug?: string;
  // Inventory management fields
  low_stock_count?: number;
  min_count?: number;
  max_count?: number;
  cost_price?: number;
  active_from_date?: string | null;
  active_to_date?: string | null;
  // Shipping restrictions
  zone_restrictions_input?: Array<{ zone: number; restriction_mode: string }>;
}

export interface ProductVariantFormData {
  sku?: string;
  display_price: number;
  is_active: boolean;
  quantity_on_hand: number;
  options: number[];
  status_override?: number | null;
  is_serialized?: boolean;
  is_lotted?: boolean;
  temp_images?: TemporaryImageData[];
}
