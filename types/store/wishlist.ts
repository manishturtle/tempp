/**
 * Types for the wishlist functionality
 */

/**
 * Interface for the wishlist item details
 */
export interface WishlistItem {
  id: number;
  product_sku: string;
  product_details: {
    name: string;
    price: number | null;
    description: string;
    image_url: string | null;
    category: number;
    sku: string;
  };
  created_at: string;
}

/**
 * Interface for the wishlist
 */
export interface Wishlist {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: WishlistItem[];
}

/**
 * Payload for adding an item to the wishlist
 */
export interface AddToWishlistPayload {
  product_sku: string;
}
