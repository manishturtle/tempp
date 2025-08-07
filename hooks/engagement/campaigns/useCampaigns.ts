'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Campaign } from '../../../types/engagement/campaign';
import {MARKETING_API} from "../../../services_engagement/apiConstants"
import { getAuthHeaders } from '../../../hooks/api/auth';

import { handleMissingToken} from "../../../services_engagement/apiConstants"




/**
 * Hook to fetch all campaigns with optional filtering
 */
export const useCampaigns = (tenantSlug: string, filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['campaigns', tenantSlug, filters],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const token = getAuthHeaders().Authorization;
      
      // If no token is available, redirect to login
      if (!token) {
        handleMissingToken();
        return [];
      }
      
      // API returns paginated response with results array
      interface PaginatedResponse {
        count: number;
        next: string | null;
        previous: string | null;
        results: Campaign[];
      }
      
      const response = await axios.get<PaginatedResponse>(
        MARKETING_API.CAMPAIGNS(tenantSlug) + queryString,
        { headers: getAuthHeaders() }
      );
      
      // Return the results array from the paginated response
      return response.data.results || [];
    },
    enabled: !!tenantSlug,
  });
};

/**
 * Hook to fetch a single campaign by ID
 */
export const useCampaignDetails = (tenantSlug: string, campaignId?: string | number) => {
  return useQuery({
    queryKey: ['campaign', tenantSlug, campaignId],
    queryFn: async () => {
      const token = getAuthHeaders().Authorization;
      
      // If no token is available, redirect to login
      if (!token) {
        handleMissingToken();
        return [];
      }
      
      const response = await axios.get<Campaign>(
        `${MARKETING_API.CAMPAIGNS(tenantSlug)}${campaignId}/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!tenantSlug && !!campaignId,
  });
};
