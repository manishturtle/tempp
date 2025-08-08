import { useQuery, useMutation } from '@tanstack/react-query';
// import { emailVerificationService } from '../../../services/emailVerificationService';
import { emailVerificationService } from '../../../services_engagement/emailVerificationService';

// Define types for the verification job
export interface VerificationJob {
  id: string;
  job_name: string;
  original_filename: string;
  status: 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'PartiallyCompleted_OutOfCredits' | string;
  emails_processed_count: number;
  total_emails_in_file: number;
  valid_count: number;
  invalid_count: number;
  risky_count: number;
  unknown_count: number;
  credits_consumed: number;
  submitted_at: string;
  completed_at: string | null;
  gcs_input_file_path?: string;
  gcs_output_file_path?: string;
  created_by?: number;
  updated_by?: number;
}

export interface VerificationJobsResponse {
  jobs: VerificationJob[];
  total_count: number;
}

/**
 * Custom hook to fetch all verification jobs with pagination
 * @param tenantSlug - The tenant slug
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Query result with verification jobs
 */
export const useVerificationJobs = (
  tenantSlug: string | undefined,
  page: number = 1,
  pageSize: number = 10
) => {
  return useQuery<VerificationJobsResponse>({
    queryKey: ['verificationJobs', tenantSlug, page, pageSize],
    queryFn: async () => {
      if (!tenantSlug) {
        throw new Error("Tenant slug is required for API call");
      }
      return emailVerificationService.getBulkVerificationJobs(tenantSlug, page, pageSize);
    },
    enabled: !!tenantSlug,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Custom hook to fetch a single verification job by ID
 * @param tenantSlug - The tenant slug
 * @param jobId - The job ID
 * @returns Query result with verification job details
 */
export const useVerificationJobDetails = (tenantSlug: string | undefined, jobId: string | undefined) => {
  return useQuery<VerificationJob>({
    queryKey: ['verificationJob', tenantSlug, jobId],
    queryFn: async () => {
      if (!tenantSlug || !jobId) {
        throw new Error("Tenant slug and job ID are required for API call");
      }
      return emailVerificationService.getBulkVerificationJobStatus(tenantSlug, jobId);
    },
    enabled: !!tenantSlug && !!jobId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: (query) => {
      // Auto-refresh for jobs that are still in progress
      const data = query.state.data;
      if (data && (data.status === 'Queued' || data.status === 'Processing')) {
        return 5000; // 5 seconds
      }
      return false; // Don't auto-refresh for completed jobs
    },
  });
};

/**
 * Interface for job results download URL response
 */
export interface JobResultsURL {
  job_id: string;
  download_url: string;
  expires_at: string; // ISO datetime string
  status: string;
}

/**
 * Custom hook to get the download URL for a job's results
 * @param tenantSlug - The tenant slug
 * @returns Mutation result for getting download URL
 */
export const useJobResultsDownloadUrl = (tenantSlug: string | undefined) => {
  return useMutation<JobResultsURL, Error, string>({
    mutationFn: async (jobId: string) => {
      if (!tenantSlug) {
        throw new Error("Tenant slug is required for API call");
      }
      return emailVerificationService.getJobResultsDownloadUrl(tenantSlug, jobId);
    },
  });
};
