'use client';

import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
// import * as campaignService from '../../../services/campaignService';
import * as campaignService from '../../../services_engagement/campaignService';
import { Campaign, ChannelType, CampaignStatus } from '../../../types/engagement/marketing';
import { CampaignCreationPayload } from '../../../types/engagement/schemas/campaignSchemas';
import { CampaignUpdateData } from '../../../services_engagement/campaignService';

// Simple notification helpers - can be replaced with a proper notification system later
const showSuccessNotification = (message: string) => console.log('SUCCESS:', message);
const showErrorNotification = (message: string) => console.error('ERROR:', message);

/**
 * Hook to fetch campaigns with pagination, search, and filtering
 */
export const useGetCampaigns = (
  tenantSlug: string,
  page: number = 1,
  search: string = '',
  channelType?: ChannelType,
  status?: CampaignStatus
) => {
  return useQuery({
    queryKey: ['campaigns', tenantSlug, { page, search, channelType, status }],
    queryFn: () => campaignService.getCampaigns(tenantSlug, page, search, channelType, status),
    placeholderData: (previousData) => previousData, // For smoother pagination
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tenantSlug,
  });
};

/**
 * Hook to fetch a single campaign by ID
 */
export const useGetCampaignById = (tenantSlug: string, campaignId?: number) => {
  return useQuery({
    queryKey: ['campaign', tenantSlug, campaignId],
    queryFn: () => {
      if (!campaignId) {
        return Promise.reject(new Error('Campaign ID is not defined.'));
      }
      return campaignService.getCampaignById(tenantSlug, campaignId);
    },
    enabled: !!tenantSlug && !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new campaign
 */
export const useCreateCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CampaignCreationPayload & { attachments?: File[] }) => {
      console.log('Creating campaign with payload:', payload);
      console.log('Attachments in hook:', payload.attachments);
      return campaignService.createCampaign(tenantSlug, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
      showSuccessNotification(`Campaign '${data.name}' created successfully in DRAFT status!`);
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      let errorMessage = "Failed to create campaign.";
      
      if (errorData) {
        // Attempt to parse specific errors from backend
        const errors: string[] = [];
        for (const key in errorData) {
          if (Array.isArray(errorData[key])) {
            errors.push(`${key}: ${errorData[key].join(', ')}`);
          } else if (typeof errorData[key] === 'object' && errorData[key] !== null) {
            // Handle nested error objects
            const nestedErrors = Object.entries(errorData[key])
              .map(([nestedKey, nestedValue]) => `${key}.${nestedKey}: ${nestedValue}`)
              .join(', ');
            errors.push(nestedErrors);
          } else {
            errors.push(`${key}: ${errorData[key]}`);
          }
        }
        
        if (errors.length > 0) {
          errorMessage = errors.join('; ');
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to update an existing campaign
 */
export const useUpdateCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CampaignUpdateData }) =>
      campaignService.updateCampaign(tenantSlug, id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, variables.id] });
      showSuccessNotification(`Campaign '${data.name}' updated successfully!`);
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      let errorMessage = "Failed to update campaign.";
      
      if (errorData) {
        // Attempt to parse specific errors from backend
        const errors: string[] = [];
        for (const key in errorData) {
          if (Array.isArray(errorData[key])) {
            errors.push(`${key}: ${errorData[key].join(', ')}`);
          } else if (typeof errorData[key] === 'object' && errorData[key] !== null) {
            // Handle nested error objects
            const nestedErrors = Object.entries(errorData[key])
              .map(([nestedKey, nestedValue]) => `${key}.${nestedKey}: ${nestedValue}`)
              .join(', ');
            errors.push(nestedErrors);
          } else {
            errors.push(`${key}: ${errorData[key]}`);
          }
        }
        
        if (errors.length > 0) {
          errorMessage = errors.join('; ');
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to delete a campaign
 */
export const useDeleteCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: number) => campaignService.deleteCampaign(tenantSlug, campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
      queryClient.removeQueries({ queryKey: ['campaign', tenantSlug, campaignId] });
      showSuccessNotification(`Campaign (ID: ${campaignId}) deleted successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          "Failed to delete campaign. Ensure it's in DRAFT status.";
      showErrorNotification(errorMessage);
    },
  });
};

// Placeholder for future actions like scheduling and sending campaigns
/*
export const useScheduleCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ campaignId, scheduleAt }: { campaignId: number; scheduleAt: string }) =>
      campaignService.scheduleCampaign(tenantSlug, campaignId, scheduleAt),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, variables.campaignId] });
      showSuccessNotification(`Campaign '${data.name}' scheduled successfully for ${new Date(variables.scheduleAt).toLocaleString()}!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to schedule campaign.";
      showErrorNotification(errorMessage);
    },
  });
};

export const useSendCampaignNow = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: number) => campaignService.sendCampaignNow(tenantSlug, campaignId),
    onSuccess: (data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, campaignId] });
      showSuccessNotification(`Campaign '${data.name}' is being sent now!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to send campaign.";
      showErrorNotification(errorMessage);
    },
  });
};
*/
