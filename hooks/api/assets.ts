/**
 * API hooks for asset-related operations
 */
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

/**
 * Interface for temporary upload response
 */
export interface TemporaryUploadResponse {
  temp_id: string;
  original_filename: string;
  file_size: number;
  content_type: string;
}

/**
 * Hook to upload a temporary image
 * 
 * This hook handles the temporary file upload process and returns the temporary ID
 * that can be used when creating or updating products and variants.
 */
export const useUploadTemporaryImage = () => {
  return useMutation<TemporaryUploadResponse, Error, { file: File; ownerType?: 'product' | 'variant' | 'division' | 'category' |'subcategory'; context?: string }>({
    mutationFn: async ({ file, ownerType, context = 'default' }) => {
      // Log the upload context to help with debugging
      console.log(`Uploading temporary image for ${ownerType || 'unknown'} in context: ${context}`);
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Add owner type to form data if available
      if (ownerType) {
        formData.append('owner_type', ownerType);
      }
      
      // Get authentication headers
      const authHeaders = await getAuthHeaders();
      
      // Upload the file
      const response = await api.post<TemporaryUploadResponse>(
        '/assets/temporary-uploads/',
        formData,
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response.data;
    }
  });
};

/**
 * Hook to delete an image
 * 
 * This hook handles the deletion of images from both the database and storage
 * for different owner types (product, variant, division, category, subcategory).
 */
export const useDeleteImage = () => {
  return useMutation<{status: string; message: string}, Error, { 
    imageId: string; 
    ownerType: 'product' | 'variant' | 'division' | 'category' | 'subcategory' 
  }>({
    mutationFn: async ({ imageId, ownerType }) => {
      console.log(`Deleting image ${imageId} for ${ownerType}`);
      
      // Get authentication headers
      const authHeaders = await getAuthHeaders();
      
      // Make the delete request
      const response = await api.delete(
        `/products/catalogue/delete-image/`,
        {
          data: {
            image_id: imageId,
            owner_type: ownerType
          },
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    }
  });
};
