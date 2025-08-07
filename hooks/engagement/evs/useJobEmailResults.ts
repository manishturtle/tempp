import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
// import { API_BASE_URL, getToken, getAuthHeader, EVS_API } from '../../../constants/apiConstants';

import {ENGAGEMENT_API_BASE_URL} from "../../../../utils/constants";
import { getAuthHeaders } from "../../../hooks/api/auth";


// Create an axios instance for API calls using centralized configuration
const apiClient = axios.create({
  baseURL: ENGAGEMENT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  // Get the token from centralized configuration
  const token = getAuthHeaders().Authorization;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No authentication token found. API requests may fail.');
  }
  return config;
});

export interface VerificationFlags {
  is_disposable: boolean;
  is_role_account: boolean;
  is_catch_all: boolean;
}

export interface EmailResult {
  email: string;
  verification_status: string;
  sub_status: string;
  verification_flags: VerificationFlags;
}

export interface JobEmailResultsResponse {
  status: string;
  job_id: string;
  emails: EmailResult[];
  pagination: {
    page: number;
    batch_size: number;
    total_emails: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  summary: {
    total_valid: number;
    total_risky: number;
    total_invalid: number;
    total_filtered: number;
  };
}

/**
 * Hook to fetch email results for a specific verification job with pagination, search, and filtering
 */
export const useJobEmailResults = (
  tenantSlug: string,
  jobId: string,
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  statusFilter?: string
) => {
  return useQuery({
    queryKey: ['jobEmailResults', tenantSlug, jobId, page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        batch_size: pageSize
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // Always include status_filter, defaults to 'all'
      params.status_filter = statusFilter;
      
      // Using the new all_emails endpoint that includes all emails (valid, risky, and invalid)
      const response = await apiClient.get(`/api/${tenantSlug}/email-verification/api/verify/bulk/${jobId}/all_emails`, { params });
      return response.data as JobEmailResultsResponse;
    },
    enabled: !!tenantSlug && !!jobId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch detailed information about a specific verification job
 */
export const useVerificationJobDetails = (tenantSlug: string, jobId: string) => {
  return useQuery({
    queryKey: ['verificationJobDetails', tenantSlug, jobId],
    queryFn: async () => {
      // Fixed API endpoint to match backend URL structure
      const response = await apiClient.get(`/api/${tenantSlug}/email-verification/api/verify/bulk/${jobId}`);
      return response.data;
    },
    enabled: !!tenantSlug && !!jobId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
