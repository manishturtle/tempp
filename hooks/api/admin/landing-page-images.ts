import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Define API response and error types
interface UploadImageResponse {
  url: string;
  gcs_path: string;
}

interface DeleteImageResponse {
  detail: string;
}

interface ApiError {
  detail?: string;
  message?: string;
}

/**
 * Uploads an image for landing page content blocks to Google Cloud Storage
 * Returns a public URL that can be directly used in content blocks
 * 
 * @returns UseMutationResult for uploading an image and getting back the public URL
 */
export const useUploadLandingPageImage = (): UseMutationResult<
  UploadImageResponse,
  AxiosError<ApiError>,
  File
> => {
  return useMutation<UploadImageResponse, AxiosError<ApiError>, File>({
    mutationFn: async (file: File) => {
      // Create form data object with the image file
      const formData = new FormData();
      formData.append('image', file);
      
      // Add the image file to the form data
      const { data } = await api.post<UploadImageResponse>(
        '/pages/admin/upload-image/',
        formData,
        {
          headers: {
            // Important: Get the auth headers for proper authentication
            ...(await getAuthHeaders()),
            // Set content type to multipart/form-data for file uploads
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return data;
    }
  });
};

/**
 * Deletes an image from Google Cloud Storage using its URL
 * 
 * @returns UseMutationResult for deleting an image by its URL
 */
export const useDeleteLandingPageImage = (): UseMutationResult<
  DeleteImageResponse,
  AxiosError<ApiError>,
  string
> => {
  return useMutation<DeleteImageResponse, AxiosError<ApiError>, string>({
    mutationFn: async (imageUrl: string) => {
      const { data } = await api.post<DeleteImageResponse>(
        '/pages/admin/delete-image/',
        { url: imageUrl },
        {
          headers: {
            // Important: Get the auth headers for proper authentication
            ...(await getAuthHeaders()),
          }
        }
      );
      
      return data;
    }
  });
};
