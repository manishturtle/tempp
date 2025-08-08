import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
// import { API_BASE_URL, getToken, getAuthHeader } from '../../../constants/apiConstants';

import {ENGAGEMENT_API_BASE_URL} from "../../../../utils/constants";
import { getAuthHeaders } from "../../../hooks/api/auth";

// Define types for email analytics
export interface EmailAnalyticsResult {
  id: string | number;
  email: string;
  verification_status?: string;
  delivery_status?: string;
  sent_at?: string;
  opens?: number;
  clicks?: number;
  subject?: string;
}

export interface EmailCampaignAnalytics {
  total: number;
  results: EmailAnalyticsResult[];
  // Delivery metrics (some will be populated from backend in future)
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  // Additional metrics
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface EmailAnalyticsParams {
  page: number;
  batchSize: number;
  statusFilter: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Create an axios instance for API calls
const apiClient = axios.create({
  baseURL: ENGAGEMENT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthHeaders().Authorization;
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

/**
 * Hook to fetch email campaign analytics data
 * This leverages the verification job results API to get email data
 * In the future, we'll need a dedicated campaign analytics API
 */
export const useEmailCampaignAnalytics = (
  tenantSlug: string, 
  campaignId: string,
  verificationJobId: string | undefined,
  params: EmailAnalyticsParams,
  enabled = true
) => {
  return useQuery({
    queryKey: ['emailCampaignAnalytics', tenantSlug, campaignId, verificationJobId, params],
    queryFn: async (): Promise<EmailCampaignAnalytics> => {
      if (!verificationJobId) {
        // If no verification job ID, return empty result
        return {
          total: 0,
          results: [],
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          page: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        };
      }

      // Fetch email verification results as a starting point
      const response = await apiClient.get(
        `/api/${tenantSlug}/email-verification/api/verify/bulk/${verificationJobId}/all_emails/`,
        { 
          params: { 
            page: params.page, 
            batch_size: params.batchSize, 
            status_filter: params.statusFilter,
            sort_by: params.sortBy,
            sort_direction: params.sortDirection
          } 
        }
      );

      const emailData = response.data;
      const total = emailData.total || emailData.results?.length || 0;
      
      // In a real implementation, we would have a dedicated API for campaign analytics
      // For now, we'll add placeholder metrics based on the verification data
      
      // Calculate simulated metrics (to be replaced with real backend data in future)
      const delivered = Math.round(total * 0.85); // 85% delivered
      const opened = Math.round(delivered * 0.67);  // 67% of delivered emails opened
      const clicked = Math.round(opened * 0.52);    // 52% of opened emails clicked
      const bounced = Math.round(total * 0.09);     // 9% bounced
      
      // Add open/click data to each email (simulated for now)
      const resultsWithEngagement = emailData.results.map((email: EmailAnalyticsResult) => {
        // Only valid emails can have engagement metrics
        const isDeliverable = email.verification_status?.toLowerCase() === 'valid';
        
        return {
          ...email,
          // Randomly assign open/click counts to simulate engagement data
          opens: isDeliverable ? Math.floor(Math.random() * 3) : 0,
          clicks: isDeliverable ? Math.floor(Math.random() * 2) : 0,
        };
      });

      return {
        ...emailData,
        results: resultsWithEngagement,
        total,
        delivered,
        opened,
        clicked,
        bounced,
        page: params.page,
        totalPages: Math.ceil(total / params.batchSize),
        hasNext: params.page * params.batchSize < total,
        hasPrevious: params.page > 1
      };
    },
    enabled: enabled && !!tenantSlug && !!campaignId && !!verificationJobId,
  });
};

/**
 * Hook to fetch campaign details
 */
export const useCampaignDetails = (tenantSlug: string, campaignId: string) => {
  return useQuery({
    queryKey: ['campaign', tenantSlug, campaignId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/${tenantSlug}/marketing/campaigns/${campaignId}/`);
      return response.data;
    },
    enabled: !!tenantSlug && !!campaignId,
  });
};
