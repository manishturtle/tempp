import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Product, 
  ProductListingResponse, 
  ProductListingParams 
} from '@/app/types/store/product-listing';
import api from '@/lib/storeapi';

const fetchProducts = async (params: ProductListingParams = {}): Promise<ProductListingResponse> => {
  // Convert array parameters to comma-separated strings if needed
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, String(value));
      }
    }
  });

  const queryString = queryParams.toString();
  const url = `/om/storefront/products/${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data;
};

export const useProductListing = (params: ProductListingParams = {}) => {
  const router = useRouter();
  
  return useQuery<ProductListingResponse, Error>({
    queryKey: ['products', 'listing', params],
    queryFn: () => fetchProducts(params),
  });
};

// Hook for fetching a single product by ID
export const useProduct = (productId: string | number) => {
  return useQuery<Product, Error>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get(`/om/storefront/products/${productId}/`);
      return response.data;
    },
    enabled: !!productId,
  });
};
