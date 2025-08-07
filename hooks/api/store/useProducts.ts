import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/storeapi';
import AuthService from '@/app/auth/services/authService';
import CartService from '@/app/auth/services/cartService';

// Types
export interface ProductFilters {
  category?: string[];
  brand?: string[];
  price_min?: number;
  price_max?: number;
  color?: string[];
  size?: string[];
  in_stock?: boolean;
  [key: string]: any;
}

export interface ProductQueryParams extends ProductFilters {
  sort?: string;
  page?: number;
  page_size?: number;
  search?: string;
}

export interface ApiProduct {
  sku: string;
  name: string;
  price: string;
  description: string;
  short_description: string;
  key_features: string;
  image_url?: string | null;
  category: string;
  subcategory: string;
  atp_quantity: number;
  stock_status: string;
  display_price?: string;
  currency_code?: string;
  images?: {
    id: number;
    image: string;
    alt_text: string;
    is_default: boolean;
    sort_order: number;
  }[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  sale_price?: number;
  display_price: string;
  rating: number;
  review_count: number;
  image_url: string;
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock';
  is_featured?: boolean;
  is_new?: boolean;
  description?: string;
  short_description?: string;
  key_features?: string;
  currency_code?: string;
  images?: {
    id: number;
    image: string;
    alt_text: string;
    is_default: boolean;
    sort_order: number;
  }[];
}

export interface ProductResponse {
  maxPrice: string;
  minPrice: string;
  data: Product[];
  totalCount: number; // Total count of products across all pages
}

// Helper function to transform API product to our Product interface
const transformApiProduct = (apiProduct: ApiProduct): Product => {
  const price = parseFloat(apiProduct.price) || 0;
  
  // Get the default image or the first image from the images array
  let imageUrl = ''; // Fallback image
  if (apiProduct.images && apiProduct.images.length > 0) {
    // Try to find the default image first
    const defaultImage = apiProduct.images.find(img => img.is_default);
    if (defaultImage) {
      imageUrl = defaultImage.image;
    } else {
      // If no default image, use the first image
      imageUrl = apiProduct.images[0].image;
    }
  } else if (apiProduct.image_url) {
    // Fallback to image_url if available
    imageUrl = apiProduct.image_url;
  }
  
  return {
    id: Math.random(), // Generate a random ID since API doesn't provide one
    sku: apiProduct.sku,
    name: apiProduct.name,
    price: price,
    display_price: apiProduct.display_price || apiProduct.price || '0.00', // Use display_price from API or fallback to price
    rating: 0, // Default values since API doesn't provide these
    review_count: 0,
    image_url: imageUrl,
    stock_status: apiProduct.stock_status === 'IN_STOCK' 
      ? 'in_stock' 
      : apiProduct.stock_status === 'LOW_STOCK' 
        ? 'low_stock' 
        : 'out_of_stock',
    description: apiProduct.description,
    short_description: apiProduct.short_description,
    key_features: apiProduct.key_features,
    is_new: false, // Default values
    is_featured: false,
    currency_code: apiProduct.currency_code,
    images: apiProduct.images || []
  };
};

/**
 * Hook to fetch products with filtering, sorting, and pagination
 * 
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Query result with products data
 */
export const useProducts = (params: ProductQueryParams = {}) => {
  return useQuery<ProductResponse>({
    queryKey: ['products', params],
    queryFn: async () => {
      // Convert params object to URLSearchParams
      const queryParams = new URLSearchParams();
      
      // Add all params to query string
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => {
              queryParams.append(key, item.toString());
            });
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      const token = AuthService.getToken();
      const response = await api.get<{
        maxPrice: string;
        minPrice: string;
        data: ApiProduct[];
        count?: number; // Total count of products
      }>(`/om/products/?${queryParams.toString()}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      // Transform the API response to match our expected format
      return {
        maxPrice: response.data.maxPrice,
        minPrice: response.data.minPrice,
        data: response.data.data.map(transformApiProduct),
        totalCount: response.data.count || response.data.data.length // Use count if available, otherwise fallback to length
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to add a product to the cart
 * 
 * @returns Mutation for adding product to cart
 */
export const useAddToCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productSku, quantity = 1 }: { productSku: string; quantity?: number }) => {
      // Use the dedicated CartService to ensure consistent session handling
      return CartService.addToCart(productSku, quantity);
    },
    onSuccess: () => {
      // Invalidate cart queries to update cart count
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

/**
 * Hook to add a product to the wishlist
 * 
 * @returns Mutation for adding product to wishlist
 */
export const useAddToWishlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productSku: string) => {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      try {
        const response = await api.post(
          '/om/wishlist/', // Updated endpoint
          { product_sku: productSku }, // Updated payload structure
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return { success: true, data: response.data, isExisting: false };
      } catch (error: any) {
        // Check if the error is because the item already exists in wishlist
        if (error.response?.status === 400 && 
            error.response?.data?.detail === "Item already exists in wishlist.") {
          // Return success with a flag indicating item was already in wishlist
          return { 
            success: true, 
            data: { message: "Item already in wishlist" },
            isExisting: true 
          };
        }
        // Re-throw other errors
        throw error;
      }
    },
    onSuccess: (result) => {
      // Invalidate wishlist queries
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      return result; // Return the result for the component to handle
    },
    onError: (error: any) => {
      console.error('Error adding to wishlist:', error);
      throw error; // Re-throw to allow component to handle the error
    }
  });
};
