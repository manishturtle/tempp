/**
 * API hooks for product-related operations
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import { 
  ProductListResponse, 
  ProductDetail, 
  ProductType, 
  PublicationStatus,
  ProductFormData,
  ProductVariantFormData,
  TemporaryImageData
} from '@/app/types/products';

interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  search?: string;
  product_type?: string;
  category?: number;
  is_active?: boolean;
  publication_status?: PublicationStatus;
}

// Type for API submission data
type ProductSubmissionData = Omit<ProductFormData, 'attributes'>;

/**
 * Hook to fetch products with filtering, pagination, and sorting
 */
export const useFetchProducts = (params: ProductQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 10,
    ordering,
    search,
    product_type,
    category,
    is_active,
    publication_status,
  } = params;

  // Ensure page is at least 1 (Django REST Framework pagination starts at 1)
  const safePage = Math.max(1, page);

  return useQuery<ProductListResponse>({
    queryKey: ['products', safePage, pageSize, ordering, search, product_type, category, is_active, publication_status],
    queryFn: async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', safePage.toString());
      queryParams.append('page_size', pageSize.toString());
      
      if (ordering) queryParams.append('ordering', ordering);
      if (search) queryParams.append('search', search);
      if (product_type) queryParams.append('product_type', product_type);
      if (category !== undefined) queryParams.append('category', category.toString());
      if (is_active !== undefined) queryParams.append('is_active', is_active.toString());
      if (publication_status) queryParams.append('publication_status', publication_status);
      
      const response = await api.get(`${apiEndpoints.products.list()}?${queryParams.toString()}`, { headers: getAuthHeaders() });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to fetch a single product by ID
 */
export const useFetchProduct = (productId: number | null) => {
  return useQuery<ProductDetail>({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await api.get(apiEndpoints.products.detail(productId), { headers: getAuthHeaders() });
      return response.data;
    },
    enabled: !!productId,
  });
};

/**
 * Hook to fetch product variants for a specific product
 */
export const useFetchProductVariants = (productId: number | null, params: { search?: string } = {}) => {
  const { search } = params;
  
  return useQuery({
    queryKey: ['productVariants', productId, search],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      
      const response = await api.get(`${apiEndpoints.products.variants.list(productId)}?${queryParams.toString()}`, { headers: getAuthHeaders() });
      return response.data;
    },
    enabled: !!productId,
  });
};

/**
 * Hook to fetch a single product variant by ID
 */
export const useFetchProductVariant = (productId: number | null, variantId: number | null) => {
  return useQuery({
    queryKey: ['productVariant', productId, variantId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      if (!variantId) throw new Error('Variant ID is required');
      const response = await api.get(apiEndpoints.products.variants.detail(productId, variantId), { headers: getAuthHeaders() });
      return response.data;
    },
    enabled: !!productId && !!variantId,
  });
};

/**
 * Hook to create a new product
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productData: ProductFormData) => {
      console.group('Product Creation Mutation');
      console.log('Mutation Input:', JSON.stringify(productData, null, 2));

      // Validate input data
      if (!productData) {
        console.error('No product data provided');
        throw new Error('No product data provided');
      }

      // Ensure attribute_values_input is an array
      if (productData.attribute_values_input && !Array.isArray(productData.attribute_values_input)) {
        console.warn('attribute_values_input is not an array:', productData.attribute_values_input);
        productData.attribute_values_input = [];
      }
      
      // Set default publication status if not provided
      if (!productData.publication_status) {
        productData.publication_status = PublicationStatus.DRAFT;
      }

      // Format temp_images data if present
      if (productData.temp_images && Array.isArray(productData.temp_images)) {
        // Ensure each temp image has the required fields
        productData.temp_images = productData.temp_images.map((img, index) => ({
          id: img.id,
          alt_text: img.alt_text || '',
          sort_order: img.sort_order || index,
          is_default: img.is_default || index === 0 // First image is default if not specified
        }));
      }

      try {
        console.log('Making API request to:', apiEndpoints.products.list());
        const response = await api.post(apiEndpoints.products.list(), productData, { headers: getAuthHeaders() });
        console.log('Create Response:', JSON.stringify(response.data, null, 2));
        console.groupEnd();
        return response.data;
      } catch (error: any) {
        console.error('Create Error:', {
          error: error,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: error.config
        });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate products list query to refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      throw error;
    }
  });
};

/**
 * Hook to update an existing product
 */
export const useUpdateProduct = (productId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productData: ProductFormData) => {
      console.group('Product Update Mutation');
      console.log('Updating product:', productId);
      console.log('Update data:', JSON.stringify(productData, null, 2));

      // Validate input data
      if (!productData) {
        console.error('No product data provided');
        throw new Error('No product data provided');
      }

      // Ensure attribute_values_input is an array
      if (productData.attribute_values_input && !Array.isArray(productData.attribute_values_input)) {
        console.warn('attribute_values_input is not an array:', productData.attribute_values_input);
        productData.attribute_values_input = [];
      }

      // Format temp_images data if present
      if (productData.temp_images && Array.isArray(productData.temp_images)) {
        // Ensure each temp image has the required fields
        productData.temp_images = productData.temp_images.map((img, index) => ({
          id: img.id,
          alt_text: img.alt_text || '',
          sort_order: img.sort_order || index,
          is_default: img.is_default || index === 0 // First image is default if not specified
        }));
      }

      try {
        console.log('Making API request to:', apiEndpoints.products.detail(productId));
        const response = await api.put(apiEndpoints.products.detail(productId), productData, { headers: getAuthHeaders() });
        console.log('Update Response:', JSON.stringify(response.data, null, 2));
        console.groupEnd();
        return response.data;
      } catch (error: any) {
        console.error('Update Error:', {
          error: error,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: error.config
        });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both the products list and the specific product query
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      throw error;
    }
  });
};

/**
 * Hook to delete a product
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: number) => {
      console.log('Deleting product with endpoint:', apiEndpoints.products.detail(productId));
      await api.delete(apiEndpoints.products.detail(productId), { headers: getAuthHeaders() });
      return productId;
    },
    onSuccess: () => {
      // Invalidate products list query to refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

/**
 * Hook to create a new product variant
 */
export const useCreateProductVariant = (productId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variantData: ProductVariantFormData) => {
      console.group('Variant Creation Mutation');
      console.log('Mutation Input:', JSON.stringify(variantData, null, 2));
      
      // Format temp_images data if present
      if (variantData.temp_images && Array.isArray(variantData.temp_images)) {
        // Ensure each temp image has the required fields
        variantData.temp_images = variantData.temp_images.map((img, index) => ({
          id: img.id,
          alt_text: img.alt_text || '',
          sort_order: img.sort_order || index,
          is_default: img.is_default || index === 0 // First image is default if not specified
        }));
      }
      
      const response = await api.post(apiEndpoints.products.variants.list(productId), variantData, { headers: getAuthHeaders() });
      console.groupEnd();
      return response.data;
    },
    onSuccess: () => {
      // Invalidate variants list query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['productVariants', productId] });
      
      // Also invalidate the parent product query
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
};

/**
 * Hook to update an existing product variant
 */
export const useUpdateProductVariant = (productId: number, variantId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variantData: ProductVariantFormData) => {
      console.group('Variant Update Mutation');
      console.log('Mutation Input:', JSON.stringify(variantData, null, 2));
      
      // Format temp_images data if present
      if (variantData.temp_images && Array.isArray(variantData.temp_images)) {
        // Ensure each temp image has the required fields
        variantData.temp_images = variantData.temp_images.map((img, index) => ({
          id: img.id,
          alt_text: img.alt_text || '',
          sort_order: img.sort_order || index,
          is_default: img.is_default || index === 0 // First image is default if not specified
        }));
      }
      
      const response = await api.put(apiEndpoints.products.variants.detail(productId, variantId), variantData, { headers: getAuthHeaders() });
      console.groupEnd();
      return response.data;
    },
    onSuccess: () => {
      // Invalidate specific variant query and variants list
      queryClient.invalidateQueries({ queryKey: ['productVariant', productId, variantId] });
      queryClient.invalidateQueries({ queryKey: ['productVariants', productId] });
    },
  });
};

/**
 * Hook to delete a product variant
 */
export const useDeleteProductVariant = (productId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variantId: number) => {
      await api.delete(apiEndpoints.products.variants.detail(productId, variantId), { headers: getAuthHeaders() });
      return variantId;
    },
    onSuccess: () => {
      // Invalidate variants list query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['productVariants', productId] });
    },
  });
};

/**
 * Hook to fetch kit components for a specific product
 */
export const useFetchKitComponents = (productId: number | null) => {
  return useQuery({
    queryKey: ['kitComponents', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await api.get(apiEndpoints.products.kitComponents.list(productId), { headers: getAuthHeaders() });
      return response.data;
    },
    enabled: !!productId,
  });
};

/**
 * Hook to create a new kit component
 */
export const useCreateKitComponent = (productId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (componentData: any) => {
      const response = await api.post(apiEndpoints.products.kitComponents.list(productId), componentData, { headers: getAuthHeaders() });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate kit components list query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['kitComponents', productId] });
    },
  });
};

/**
 * Hook to update an existing kit component
 */
export const useUpdateKitComponent = (productId: number, componentId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (componentData: any) => {
      const response = await api.put(apiEndpoints.products.kitComponents.detail(productId, componentId), componentData, { headers: getAuthHeaders() });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate kit components list query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['kitComponents', productId] });
    },
  });
};

/**
 * Hook to delete a kit component
 */
export const useDeleteKitComponent = (productId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (componentId: number) => {
      await api.delete(apiEndpoints.products.kitComponents.detail(productId, componentId), { headers: getAuthHeaders() });
      return componentId;
    },
    onSuccess: () => {
      // Invalidate kit components list query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['kitComponents', productId] });
    },
  });
};

/**
 * Hook to fetch product images
 * 
 * This hook can fetch images for either a product or a variant
 */
export const useFetchProductImages = ({ productId, variantId }: { productId?: number | null, variantId?: number | null } = {}) => {
  let endpoint = '';
  let queryKey: any[] = ['productImages'];
  
  if (productId && variantId) {
    // Fetch variant images
    endpoint = apiEndpoints.products.variants.images.list(productId, variantId);
    queryKey = ['variantImages', productId, variantId];
  } else if (productId) {
    // Fetch product images
    endpoint = apiEndpoints.products.images.list(productId);
    queryKey = ['productImages', productId];
  } else {
    // No valid ID provided
    return {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Either productId or variantId must be provided')
    };
  }
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get(endpoint, { headers: getAuthHeaders() });
      return response.data;
    },
    enabled: !!endpoint,
  });
};

/**
 * Hook to update an existing product image
 */
export const useUpdateProductImage = ({ 
  productId, 
  variantId, 
  imageId 
}: { 
  productId?: number | null, 
  variantId?: number | null, 
  imageId: number 
}) => {
  const queryClient = useQueryClient();
  let endpoint = '';
  let queryKey: any[] = [];
  
  if (productId && variantId) {
    // Update variant image
    endpoint = apiEndpoints.products.variants.images.detail(productId, variantId, imageId);
    queryKey = ['variantImages', productId, variantId];
  } else if (productId) {
    // Update product image
    endpoint = apiEndpoints.products.images.detail(productId, imageId);
    queryKey = ['productImages', productId];
  } else {
    throw new Error('Either productId or variantId must be provided');
  }
  
  return useMutation({
    mutationFn: async (imageData: {
      alt_text?: string;
      sort_order?: number;
      is_default?: boolean;
    }) => {
      const response = await api.put(endpoint, imageData, { headers: getAuthHeaders() });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate image queries
      queryClient.invalidateQueries({ queryKey });
      
      // Also invalidate the parent product/variant query
      if (productId && variantId) {
        queryClient.invalidateQueries({ queryKey: ['productVariant', productId, variantId] });
      } else if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
      }
    },
  });
};

/**
 * Hook to delete a product image
 */
export const useDeleteProductImage = ({ 
  productId, 
  variantId, 
  imageId 
}: { 
  productId?: number | null, 
  variantId?: number | null, 
  imageId: number 
}) => {
  const queryClient = useQueryClient();
  let endpoint = '';
  let queryKey: any[] = [];
  
  if (productId && variantId) {
    // Delete variant image
    endpoint = apiEndpoints.products.variants.images.detail(productId, variantId, imageId);
    queryKey = ['variantImages', productId, variantId];
  } else if (productId) {
    // Delete product image
    endpoint = apiEndpoints.products.images.detail(productId, imageId);
    queryKey = ['productImages', productId];
  } else {
    throw new Error('Either productId or variantId must be provided');
  }
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete(endpoint, { headers: getAuthHeaders() });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate image queries
      queryClient.invalidateQueries({ queryKey });
      
      // Also invalidate the parent product/variant query
      if (productId && variantId) {
        queryClient.invalidateQueries({ queryKey: ['productVariant', productId, variantId] });
      } else if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
      }
    },
  });
};
