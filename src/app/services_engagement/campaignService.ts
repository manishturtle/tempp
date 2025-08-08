/**
 * Campaign Service
 * Handles all API calls for the campaign management section
 */

import apiClient from '../utils/engagement/apiClient';
import { Campaign, PaginatedResponse, ChannelType, CampaignStatus } from '../types/engagement/marketing';
import { CampaignCreationPayload } from '../types/engagement/schemas/campaignSchemas';

/**
 * Get campaigns with optional pagination, search, and filters
 * @param tenantSlug The tenant's unique slug
 * @param page Page number for pagination
 * @param search Search term
 * @param channelType Filter by channel type
 * @param status Filter by campaign status
 * @returns Promise with paginated campaigns data
 */
export const getCampaigns = async (
  tenantSlug: string,
  page: number = 1,
  search: string = '',
  channelType?: ChannelType,
  status?: CampaignStatus
): Promise<PaginatedResponse<Campaign>> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    if (search) {
      params.append('search', search);
    }
    
    if (channelType) {
      params.append('campaign_channel_type', channelType);
    }
    
    if (status) {
      params.append('status', status);
    }
    
    const response = await apiClient.get<PaginatedResponse<Campaign>>(
      `/api/${tenantSlug}/marketing/campaigns/?${params.toString()}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
};

/**
 * Get a single campaign by ID
 * @param tenantSlug The tenant's unique slug
 * @param campaignId Campaign ID
 * @returns Promise with campaign data
 */
export const getCampaignById = async (
  tenantSlug: string,
  campaignId: number
): Promise<Campaign> => {
  try {
    const response = await apiClient.get<Campaign>(
      `/api/${tenantSlug}/marketing/campaigns/${campaignId}/`
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching campaign ${campaignId}:`, error);
    throw error;
  }
};

/**
 * Create a new campaign
 * @param tenantSlug The tenant's unique slug
 * @param payload Campaign creation data
 * @returns Promise with created campaign data
 */
export const createCampaign = async (
  tenantSlug: string,
  payload: CampaignCreationPayload
): Promise<Campaign> => {
  try {
    // Since we're having issues with FormData and JSON objects, let's try a different approach
    // We'll send the data directly as JSON instead of FormData
    
    // Debug the incoming payload to see what HTML content we're receiving
    console.log('CREATE CAMPAIGN - FULL PAYLOAD:', payload);
    
    // Create the request payload
    const requestData: Record<string, any> = {
      name: payload.name,
      campaign_channel_type: payload.campaign_channel_type || 'EMAIL',
      sender_identifier: payload.sender_identifier || '',
      // Ensure target_list_ids is an array of numbers
      target_list_ids: Array.isArray(payload.target_list_ids) 
        ? payload.target_list_ids.map(id => Number(id))
        : []
    };
    
    // Check if message_details_for_create is already present in the payload
    if (payload.message_details_for_create) {
      console.log('Using message_details_for_create from payload:', payload.message_details_for_create);
      // Use the message_details_for_create directly from the payload
      requestData.message_details_for_create = payload.message_details_for_create;
    } else {
      // Fallback to legacy approach (for backward compatibility)
      console.log('Using legacy fields for message_details_for_create');
      requestData.message_details_for_create = {
        custom_content: {
          channel_type: payload.campaign_channel_type || 'EMAIL',
          resolved_content: {
            subject: payload.subject || '',
            body_html: payload.body_html || '',
            body_text: payload.body_text || ''
          }
        }
      };
    }
    
    // Debug the message_details_for_create object to verify HTML content
    console.log('CREATE CAMPAIGN - MESSAGE DETAILS OBJECT:', requestData.message_details_for_create);
    
    // Check if we have custom_content and resolved_content to avoid errors
    if (requestData.message_details_for_create?.custom_content?.resolved_content) {
      console.log('CREATE CAMPAIGN - RESOLVED HTML:', 
        requestData.message_details_for_create.custom_content.resolved_content.body_html);
    }
    
    // Add scheduled_at if present - ensure it's in the correct format
    if (payload.scheduled_at) {
      try {
        // If it's already in the correct format (YYYY-MM-DDTHH:mm:ss+HH:mm), use it as is
        if (typeof payload.scheduled_at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(payload.scheduled_at)) {
          requestData.scheduled_at = payload.scheduled_at;
        } 
        // If it's a Date object or ISO string, convert to the required format
        else {
          const date = new Date(payload.scheduled_at);
          if (!isNaN(date.getTime())) {
            const pad = (num: number) => num.toString().padStart(2, '0');
            const tzOffset = -date.getTimezoneOffset();
            const tzSign = tzOffset >= 0 ? '+' : '-';
            const tzHours = Math.floor(Math.abs(tzOffset) / 60);
            const tzMinutes = Math.abs(tzOffset) % 60;
            
            requestData.scheduled_at = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
              `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
              `${tzSign}${pad(tzHours)}:${pad(tzMinutes)}`;
          } else {
            console.warn('Invalid date format for scheduled_at:', payload.scheduled_at);
          }
        }
      } catch (error) {
        console.error('Error formatting scheduled_at:', error);
      }
    }
    
    // Add status if present
    if (payload.status) {
      requestData.status = payload.status;
    }
    
    // Log what we're sending for debugging
    console.log('Request payload:', requestData);

    // Handle file attachments if present
    if (payload.attachments && Array.isArray(payload.attachments) && payload.attachments.length > 0) {
      // If we have attachments, we'll need to use FormData
      const formData = new FormData();
      
      // Add simple fields directly to form data
      formData.append('name', requestData.name);
      formData.append('campaign_channel_type', requestData.campaign_channel_type);
      formData.append('sender_identifier', requestData.sender_identifier);
      
      // Add target_list_ids as indexed fields (target_list_ids[0], target_list_ids[1], etc.)
      if (Array.isArray(requestData.target_list_ids)) {
        requestData.target_list_ids.forEach((id, index) => {
          formData.append(`target_list_ids[${index}]`, id.toString());
        });
      }
      
      // Add message_details_for_create as a JSON string
      if (requestData.message_details_for_create) {
        formData.append('message_details_for_create', JSON.stringify(requestData.message_details_for_create));
      }
      
      // Add scheduled_at if present
      if (requestData.scheduled_at) {
        formData.append('scheduled_at', requestData.scheduled_at);
      }
      
      // Add status if present
      if (requestData.status) {
        formData.append('status', requestData.status);
      }
      
      // Add the first attachment as 'attachment' (singular) as expected by the backend
      const firstAttachment = payload.attachments[0];
      if (firstAttachment) {
        formData.append('attachment', firstAttachment);
      }
      
      // Log the form data for debugging
      console.log('Sending form data with attachments:', {
        formData: Array.from(formData.entries()),
        attachments: payload.attachments.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      });
      
      // Send the request with FormData
      const response = await apiClient.post<Campaign>(
        `/api/${tenantSlug}/marketing/campaigns/`,
        formData,
        {
          headers: {
            // Let the browser set the content type with boundary
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } else {
      // If no file attachment, send as regular JSON
      const response = await apiClient.post<Campaign>(
        `/api/${tenantSlug}/marketing/campaigns/`,
        requestData
      );
      return response.data;
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

/**
 * Interface for campaign update data
 * Updated to include all fields needed for campaign updates
 */
export interface CampaignUpdateData {
  name?: string;
  campaign_channel_type?: string;
  sender_identifier?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  scheduled_at?: Date | string | null; // Date object, ISO string or null
  target_list_ids?: number[];
  // Status changes are typically done via separate actions like 'schedule', 'archive' etc.
}

/**
 * Update an existing campaign
 * @param tenantSlug The tenant's unique slug
 * @param campaignId Campaign ID
 * @param data Updated campaign data
 * @returns Promise with updated campaign data
 */
export const updateCampaign = async (
  tenantSlug: string,
  campaignId: number,
  data: CampaignUpdateData & { attachment?: File }
): Promise<Campaign> => {
  try {
    // Debug the incoming update payload to see what HTML content we're receiving
    console.log('UPDATE CAMPAIGN - FULL PAYLOAD:', data);
    console.log('UPDATE CAMPAIGN - HTML CONTENT:', data.body_html);

    // Always use FormData to match backend's expected structure
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
    if (data.attachment && typeof data.attachment === 'object' && 'name' in data.attachment) {
      formData.append('attachment', data.attachment as File);
    }
    
    // Create message_details_for_create if message content is provided
    if (data.subject || data.body_html) {
      // Create message_details_for_create object with the structure expected by the backend
    // Log raw HTML content from payload for debugging
    console.log('Service - Raw body_html from payload:', data.body_html);
    
    const messageDetailsForCreate = {
      custom_content: {
        channel_type: data.campaign_channel_type || 'EMAIL',
        resolved_content: {
          subject: data.subject || '',
          // Ensure we're using the actual HTML content and not an empty string
          body_html: data.body_html || '',
          body_text: data.body_text || ''
        }
      }
    };
    
    // Log the resolved content to verify HTML is included
    console.log('Service - Resolved body_html content:', messageDetailsForCreate.custom_content.resolved_content.body_html);  
      
      // Convert to JSON string for FormData
      const messageDetailsStr = JSON.stringify(messageDetailsForCreate);
      formData.append('message_details_for_create', messageDetailsStr);
      
      // For debugging, log what we're sending
      console.log('message_details_for_create object:', messageDetailsForCreate);
      console.log('message_details_for_create string:', messageDetailsStr);
    }
    
    // Handle scheduled_at if present
    if (data.scheduled_at !== undefined) {
      if (data.scheduled_at) {
        const scheduledDate = data.scheduled_at instanceof Date 
          ? data.scheduled_at.toISOString()
          : String(data.scheduled_at);
        formData.append('scheduled_at', scheduledDate);
      } else {
        formData.append('scheduled_at', '');
      }
    }
    
    console.log('Updating campaign with FormData payload:');
    // Log FormData contents for debugging
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const response = await apiClient.put<Campaign>(
      `/api/${tenantSlug}/marketing/campaigns/${campaignId}/`,
      formData,
      {
        headers: {
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating campaign ${campaignId}:`, error);
    throw error;
  }
};

/**
 * Delete a campaign
 * @param tenantSlug The tenant's unique slug
 * @param campaignId Campaign ID
 * @returns Promise<void>
 */
export const deleteCampaign = async (
  tenantSlug: string,
  campaignId: number
): Promise<void> => {
  try {
    // Typically, only DRAFT campaigns can be deleted. Backend should enforce this.
    await apiClient.delete(`/api/${tenantSlug}/marketing/campaigns/${campaignId}/`);
  } catch (error) {
    console.error(`Error deleting campaign ${campaignId}:`, error);
    throw error;
  }
};

// Placeholder for future actions
/**
 * Schedule a campaign for future sending
 * @param tenantSlug The tenant's unique slug
 * @param campaignId Campaign ID
 * @param scheduleAt ISO date string for when to send the campaign
 * @returns Promise with updated campaign data
 */
/*
export const scheduleCampaign = async (
  tenantSlug: string,
  campaignId: number,
  scheduleAt: string
): Promise<Campaign> => {
  try {
    const response = await apiClient.post<Campaign>(
      `/api/${tenantSlug}/marketing/campaigns/${campaignId}/schedule/`,
      { scheduled_at: scheduleAt }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error scheduling campaign ${campaignId}:`, error);
    throw error;
  }
};
*/

/**
 * Send a campaign immediately
 * @param tenantSlug The tenant's unique slug
 * @param campaignId Campaign ID
 * @returns Promise with updated campaign data
 */
/*
export const sendCampaignNow = async (
  tenantSlug: string,
  campaignId: number
): Promise<Campaign> => {
  try {
    const response = await apiClient.post<Campaign>(
      `/api/${tenantSlug}/marketing/campaigns/${campaignId}/send-now/`
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error sending campaign ${campaignId}:`, error);
    throw error;
  }
};
*/
