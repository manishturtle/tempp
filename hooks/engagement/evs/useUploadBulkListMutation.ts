import { useMutation } from '@tanstack/react-query';
import { emailVerificationService } from '../../../services_engagement/emailVerificationService';

interface UploadResponse {
  jobId: string;
  message: string;
  status: string;
}

interface UploadError {
  message: string;
  status?: string;
  details?: Record<string, unknown>;
}

/**
 * Custom hook for uploading a bulk email list for verification
 * @param tenantSlug - The tenant slug
 * @returns TanStack Query mutation object
 */
export const useUploadBulkListMutation = (tenantSlug: string | undefined) => {
  return useMutation<UploadResponse, UploadError, FormData>({
    mutationFn: async (formData: FormData) => {
      if (!tenantSlug) {
        throw new Error("Tenant slug is required for API call");
      }
      return emailVerificationService.uploadBulkEmailList(tenantSlug, formData);
    },
  });
};
