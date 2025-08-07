'use client';

import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Campaign, CampaignFormValues } from '../../../types/engagement/campaign';
import { ENGAGEMENT_API_BASE_URL } from '@/utils/constants';
import {MARKETING_API} from "../../../services_engagement/apiConstants"
import { getAuthHeaders } from '../../api/auth';


/**
 * Hook to create a new campaign
 */
export const useCreateCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignData: CampaignFormValues) => {
      // Create FormData to match backend's expected payload structure
      const formData = new FormData();
      
      // Required fields as per backend serializer
      formData.append('name', campaignData.name || campaignData.campaign_name || '');
      formData.append('campaign_channel_type', campaignData.campaign_channel_type || 'EMAIL');
      formData.append('sender_identifier', campaignData.sender_identifier || '');
      
      // Handle target list IDs - backend expects target_list_ids[0], target_list_ids[1], etc.
      if (campaignData.target_list_ids && Array.isArray(campaignData.target_list_ids)) {
        campaignData.target_list_ids.forEach((listId, index) => {
          formData.append(`target_list_ids[${index}]`, String(listId));
        });
      }
      
      // Handle file attachment if present
      if (campaignData.attachment instanceof File) {
        formData.append('attachment', campaignData.attachment);
      }
      
      // Create message_details_for_create as JSON object with the exact structure expected by the backend
      // The form uses a nested structure for content, so we need to extract it correctly
      console.log('Full campaign data:', campaignData);
      
      // Determine if we're using custom content or a template with overrides
      let htmlContent = '';
      let subjectContent = '';
      let textContent = '';
      
      // Check if we have custom content in the nested structure
      if (campaignData.custom_content?.resolved_content) {
        console.log('Found custom_content in form data:', campaignData.custom_content);
        htmlContent = campaignData.custom_content.resolved_content.body_html || '';
        subjectContent = campaignData.custom_content.resolved_content.subject || '';
        textContent = campaignData.custom_content.resolved_content.body_text || '';
      } 
      // Check if we have template overrides
      else if (campaignData.overrides) {
        console.log('Found overrides in form data:', campaignData.overrides);
        htmlContent = campaignData.overrides.body_html || '';
        subjectContent = campaignData.overrides.subject || '';
        textContent = campaignData.overrides.body_text || '';
      }
      // Fallback to top-level fields (legacy support)
      else {
        console.log('Using top-level fields as fallback');
        htmlContent = campaignData.body_html || campaignData.body || '';
        subjectContent = campaignData.subject || '';
        textContent = campaignData.body_text || '';
      }
      
      console.log('Extracted HTML content:', htmlContent);
      
      // Check if message_details_for_create is already provided in the payload
      if (campaignData.message_details_for_create) {
        console.log('Using message_details_for_create from payload:', campaignData.message_details_for_create);
        // Use the provided message_details_for_create directly
        const messageDetailsStr = JSON.stringify(campaignData.message_details_for_create);
        formData.append('message_details_for_create', messageDetailsStr);
        
        // Log what we're sending
        console.log('Using provided message_details_for_create:', messageDetailsStr);
        
        // Skip the rest of the message details construction
        return formData;
      }
      
      // Create a properly typed message details object
      const messageDetailsObj: {
        custom_content?: {
          channel_type: string;
          resolved_content: {
            subject: string;
            body_html: string;
            body_text: string;
          };
        };
        source_template_id?: number;
        overrides?: {
          subject?: string;
          body_html?: string;
          body_text?: string;
        };
      } = {
        custom_content: {
          channel_type: campaignData.campaign_channel_type || 'EMAIL',
          resolved_content: {
            subject: subjectContent,
            body_html: htmlContent,
            body_text: textContent
          }
        }
      };
      
      // If using a template, include the source_template_id instead of custom_content
      if (campaignData.source_template_id) {
        console.log('Using template with ID:', campaignData.source_template_id);
        messageDetailsObj.source_template_id = campaignData.source_template_id;
        // If we have overrides, include them
        if (campaignData.overrides) {
          messageDetailsObj.overrides = campaignData.overrides;
        }
        // Remove custom_content if we're using a template
        if (messageDetailsObj.custom_content) {
          delete messageDetailsObj.custom_content;
        }
      }
      
      // Log the final message details object
      console.log('Final message_details_for_create:', messageDetailsObj);
      
      // Convert to JSON string for FormData
      const messageDetailsStr = JSON.stringify(messageDetailsObj);
      formData.append('message_details_for_create', messageDetailsStr);
      
      // For debugging, log what we're sending
      console.log('message_details_for_create object:', messageDetailsObj);
      console.log('message_details_for_create string:', messageDetailsStr);
      
      // Handle scheduled_at if present
      if (campaignData.scheduled_at) {
        const scheduledDate = campaignData.scheduled_at instanceof Date 
          ? campaignData.scheduled_at.toISOString()
          : campaignData.scheduled_at;
        formData.append('scheduled_at', scheduledDate);
      }
      
      // Add any additional fields that might be needed
      if (campaignData.status) {
        formData.append('status', campaignData.status);
      }
      

      // Set up headers with authentication
      const headers = getAuthHeaders();
      // No Content-Type header for FormData - browser sets it automatically with boundary
      
      console.log('Submitting campaign with FormData payload:');
      // Log FormData contents for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      const response = await axios.post<Campaign>(
        `${MARKETING_API}/api/${tenantSlug}/marketing/campaigns/`,
        formData,
        { headers }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate campaigns query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
    },
  });
};

/**
 * Hook to update an existing campaign
 */
export const useUpdateCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<CampaignFormValues> }) => {
      console.log('Starting campaign update with data:', data);
      
      // Create FormData to match backend's expected payload structure
      const formData = new FormData();
      
      // Add required fields if provided
      if (data.name) {
        formData.append('name', data.name);
      }
      if (data.campaign_channel_type) {
        formData.append('campaign_channel_type', data.campaign_channel_type);
      }
      if (data.sender_identifier) {
        formData.append('sender_identifier', data.sender_identifier);
      }
      
      // Handle target list IDs
      if (data.target_list_ids && Array.isArray(data.target_list_ids)) {
        data.target_list_ids.forEach((listId, index) => {
          formData.append(`target_list_ids[${index}]`, String(listId));
        });
      }
      
      // Handle file attachment if present
      if (data.attachment instanceof File) {
        formData.append('attachment', data.attachment);
      }
      
      // Create message_details_for_create using the nested form structure
      console.log('Full update data:', data);
      
      // Determine if we're using custom content or a template with overrides
      let htmlContent = '';
      let subjectContent = '';
      let textContent = '';
      
      // Check if we have custom content in the nested structure
      if (data.custom_content?.resolved_content) {
        console.log('Found custom_content in update data:', data.custom_content);
        htmlContent = data.custom_content.resolved_content.body_html || '';
        subjectContent = data.custom_content.resolved_content.subject || '';
        textContent = data.custom_content.resolved_content.body_text || '';
      } 
      // Check if we have template overrides
      else if (data.overrides) {
        console.log('Found overrides in update data:', data.overrides);
        htmlContent = data.overrides.body_html || '';
        subjectContent = data.overrides.subject || '';
        textContent = data.overrides.body_text || '';
      }
      // Fallback to top-level fields (legacy support)
      else if (data.subject || data.body_html) {
        console.log('Using top-level fields as fallback');
        htmlContent = data.body_html || data.body || '';
        subjectContent = data.subject || '';
        textContent = data.body_text || '';
      }
      
      console.log('Extracted HTML content for update:', htmlContent);
      
      if (htmlContent || subjectContent) {
        // Create a properly typed message details object
        const messageDetailsObj: {
          custom_content?: {
            channel_type: string;
            resolved_content: {
              subject: string;
              body_html: string;
              body_text: string;
            };
          };
          source_template_id?: number;
          overrides?: {
            subject?: string;
            body_html?: string;
            body_text?: string;
          };
        } = {
          custom_content: {
            channel_type: data.campaign_channel_type || 'EMAIL',
            resolved_content: {
              subject: subjectContent,
              body_html: htmlContent,
              body_text: textContent
            }
          }
        };
        
        // If using a template, include the source_template_id instead of custom_content
        if (data.source_template_id) {
          console.log('Using template with ID:', data.source_template_id);
          messageDetailsObj.source_template_id = data.source_template_id;
          // If we have overrides, include them
          if (data.overrides) {
            messageDetailsObj.overrides = data.overrides;
          }
          // Remove custom_content if we're using a template
          if (messageDetailsObj.custom_content) {
            delete messageDetailsObj.custom_content;
          }
        }
        
        // Log the final message details object
        console.log('Final message_details_for_create for update:', messageDetailsObj);
        
        // Convert to JSON string for FormData
        const messageDetailsStr = JSON.stringify(messageDetailsObj);
        formData.append('message_details_for_create', messageDetailsStr);
        
        // For debugging, log what we're sending
        console.log('message_details_for_create string for update:', messageDetailsStr);
      }
      
      // Handle scheduled_at if present
      if (data.scheduled_at) {
        const scheduledDate = data.scheduled_at instanceof Date 
          ? data.scheduled_at.toISOString()
          : data.scheduled_at;
        formData.append('scheduled_at', scheduledDate);
      }
      
      // Add status if provided
      if (data.status) {
        formData.append('status', data.status);
      }
      
      
      // Set up headers with authentication
      const headers = getAuthHeaders();
      
      console.log('Updating campaign with ID:', id, 'and FormData payload:');
      // Log FormData contents for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      // Use PUT instead of PATCH for complete updates
      const response = await axios.put<Campaign>(
        `${MARKETING_API}/api/${tenantSlug}/marketing/campaigns/${id}/`,
        formData,
        { headers }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific campaign query and the campaigns list
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
    },
  });
};

/**
 * Hook to delete a campaign
 */
export const useDeleteCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: number | string) => {
      // Get token from localStorage
      
      
      const headers = {
          ...getAuthHeaders()
      };
      
      try {
        await axios.delete(
          `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/campaigns/campaigns/${campaignId}/`,
          { headers }
        );
        return campaignId;
      } catch (error) {
        console.error('Error deleting campaign:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate campaigns query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
    },
  });
};

/**
 * Hook to update recipients for a campaign
 */
export const useUpdateCampaignRecipients = (tenantSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      addRecipients, 
      removeRecipients 
    }: { 
      campaignId: number | string; 
      addRecipients?: string[]; 
      removeRecipients?: string[]; 
    }) => {
      // Get token from localStorage
      const token = getToken();
      
      // If no token is available, redirect to login
      if (!token && typeof window !== 'undefined') {
        console.warn('No authentication token found. Redirecting to login...');
        window.location.href = '/login';
        throw new Error('Authentication token not found');
      }
      
      const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/campaigns/campaigns/${campaignId}/update_recipients/`,
        {
          add_recipients: addRecipients || [],
          remove_recipients: removeRecipients || []
        },
        { headers }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific campaign query to refetch with updated recipients
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, variables.campaignId] });
    },
  });
};

/**
 * Hook to schedule a campaign
 */
export const useScheduleCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      executedAt 
    }: { 
      campaignId: number | string; 
      executedAt: string; 
    }) => {
      // Get token from localStorage
      const token = getToken();
      
      // If no token is available, redirect to login
      if (!token && typeof window !== 'undefined') {
        console.warn('No authentication token found. Redirecting to login...');
        window.location.href = '/login';
        throw new Error('Authentication token not found');
      }
      
      const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/campaigns/campaigns/${campaignId}/schedule/`,
        { executed_at: executedAt },
        { headers }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific campaign query and the campaigns list
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
    },
  });
};

/**
 * Hook to cancel a scheduled campaign
 */
export const useCancelCampaign = (tenantSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: number | string) => {
      // Get token from localStorage
      const token = getToken();
      
      // If no token is available, redirect to login
      if (!token && typeof window !== 'undefined') {
        console.warn('No authentication token found. Redirecting to login...');
        window.location.href = '/login';
        throw new Error('Authentication token not found');
      }
      
      const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/campaigns/campaigns/${campaignId}/cancel/`,
        {},
        { headers }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific campaign query and the campaigns list
      queryClient.invalidateQueries({ queryKey: ['campaign', tenantSlug, variables] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantSlug] });
    },
  });
};
