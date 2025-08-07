import axios from 'axios';
// import { API_BASE_URL, getToken, getAuthHeaders, handleMissingToken, STORAGE_KEYS } from '../constants/apiConstants';

import {ENGAGEMENT_API_BASE_URL} from "../../utils/constants";
import { getAuthHeaders } from '../hooks/api/auth';
import {STORAGE_KEYS, handleMissingToken} from "../services_engagement/apiConstants"




// Create an axios instance for API calls
const apiClient = axios.create({
  baseURL: ENGAGEMENT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  // Get token from centralized configuration
  const token = getAuthHeaders().Authorization;
  if (token) {
    config.headers.Authorization = token;
  } else {
    console.warn('No authentication token found. API requests may fail.');
  }
  return config;
});

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access detected. Please log in again.');
      
      // Clear the invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      // Redirect to login
      handleMissingToken();
    }
    return Promise.reject(error);
  }
);

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

export const emailVerificationService = {
  /**
   * Upload a file containing email addresses for bulk verification
   * @param tenantSlug - The tenant slug
   * @param formData - The form data containing the file and optional job name
   * @returns Promise with the upload response
   */
  uploadBulkEmailList: async (tenantSlug: string, formData: FormData): Promise<UploadResponse> => {
    try {
      const response = await apiClient.post<UploadResponse>(
        `/api/${tenantSlug}/email-verification/api/verify/bulk/submit/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      // Format error response
      const formattedError: UploadError = {
        message: error.response?.data?.message || 'Failed to upload email list',
        status: error.response?.status?.toString(),
        details: error.response?.data
      };
      throw formattedError;
    }
  },

  /**
   * Get the status of a bulk verification job
   * @param tenantSlug - The tenant slug
   * @param jobId - The job ID
   * @returns Promise with the job status
   */
  getBulkVerificationJobStatus: async (tenantSlug: string, jobId: string) => {
    try {
      const response = await apiClient.get(
        `/api/${tenantSlug}/email-verification/api/verify/bulk/${jobId}/`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to get job status' };
    }
  },

  /**
   * Get a list of bulk verification jobs
   * @param tenantSlug - The tenant slug
   * @param page - Page number (1-based)
   * @param pageSize - Number of items per page
   * @returns Promise with the list of jobs and pagination info
   */
  getBulkVerificationJobs: async (tenantSlug: string, page: number = 1, pageSize: number = 10) => {
    try {
      // Add pagination parameters to the request
      const response = await apiClient.get(
        `/api/${tenantSlug}/email-verification/api/verify/bulk/`,
        {
          params: {
            page,
            page_size: pageSize
          }
        }
      );

      // Log the response structure for debugging
      console.log('Bulk verification jobs response:', response.data);

      // Handle both array and object responses
      const jobsData = Array.isArray(response.data) ? response.data : 
                      response.data.jobs ? response.data.jobs : 
                      response.data.results ? response.data.results : [];

      // Map the backend response to our frontend interface
      const jobs = jobsData.map((job: any) => ({
        id: job.id || '',
        job_name: job.job_name || job.name || 'Untitled Job',
        original_filename: job.original_filename || job.filename || '',
        status: job.status || 'Unknown',
        emails_processed_count: parseInt(job.emails_processed_count) || 0,
        total_emails_in_file: parseInt(job.total_emails_in_file) || 0,
        valid_count: parseInt(job.valid_count) || 0,
        invalid_count: parseInt(job.invalid_count) || 0,
        risky_count: parseInt(job.risky_count) || 0,
        unknown_count: parseInt(job.unknown_count) || 0,
        credits_consumed: parseInt(job.credits_consumed) || 0,
        submitted_at: job.submitted_at || job.created_at || null,
        completed_at: job.completed_at || null,
        gcs_input_file_path: job.gcs_input_file_path || '',
        gcs_output_file_path: job.gcs_output_file_path || '',
        created_by: job.created_by || null,
        updated_by: job.updated_by || null
      }));

      // Get total count from response or use jobs length
      const total_count = response.data.total_count || response.data.count || jobs.length;

      return {
        jobs,
        total_count
      };
    } catch (error: any) {
      console.error('Error fetching bulk verification jobs:', error);
      throw {
        message: error.response?.data?.message || error.message || 'Failed to get jobs list',
        status: error.response?.status,
        details: error.response?.data
      };
    }
  },

  /**
   * Get the download URL for a completed job's results
   * @param tenantSlug - The tenant slug
   * @param jobId - The job ID
   * @returns Promise with the download URL
   */
  getJobResultsDownloadUrl: async (tenantSlug: string, jobId: string) => {
    try {
      const response = await apiClient.get(
        `/api/${tenantSlug}/evs-api/verify/bulk/${jobId}/results/`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to get download URL' };
    }
  },

  /**
   * Get account information including credit balance and API key details
   * @param tenantSlug - The tenant slug
   * @returns Promise with the account information
   */
  getAccountInfo: async (tenantSlug: string) => {
    if (!tenantSlug) {
      throw new Error('Tenant slug is required');
    }

    try {
      // Get credit balance
      const creditResponse = await apiClient.get(
        `/api/${tenantSlug}/evs-api/account/credits/`
      );

      // Get API key information
      const apiKeyResponse = await apiClient.get(
        `/api/${tenantSlug}/evs-api/api-keys/`
      );

      const creditData = creditResponse.data;
      const apiKeyInfo = apiKeyResponse.data.api_keys?.length > 0 ? apiKeyResponse.data.api_keys[0] : null;

      // Return combined data
      return {
        creditsAvailable: creditData.creditsAvailable || 0,
        apiKeyIdentifier: apiKeyInfo?.key_identifier || null,
        apiKeyStatus: apiKeyInfo?.status || null,
        apiKeyProvisionedDate: apiKeyInfo?.created_at || null
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch account information';
      console.error('Error in getAccountInfo:', error);
      throw {
        message: errorMessage,
        status: error.response?.status,
        details: error.response?.data
      };
    }
  }
};
