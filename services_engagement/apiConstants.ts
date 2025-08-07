/**
 * API Constants
 * This file contains all API related constants used throughout the application
 */


import { ENGAGEMENT_API_BASE_URL } from "../../utils/constants";


export const handleMissingToken = (): void => {
  if (typeof window !== "undefined") {
    console.warn("No authentication token found. Redirecting to login...");
    window.location.href = "/login";
  }
};

export const STORAGE_KEYS = {
  TOKEN: "token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
  TENANT_SLUG: "tenantSlug",
};

// Marketing API endpoints
export const MARKETING_API = {
  CAMPAIGNS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/campaigns/`,
  CAMPAIGN_BY_ID: (tenantSlug: string, campaignId: number | string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/campaigns/${campaignId}/`,
  EMAIL_LISTS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/emails/lists/`,
  EMAIL_LIST_DETAILS: (tenantSlug: string, listId: number) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/emails/lists/${listId}/`,
  MESSAGE_TEMPLATES: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/message-templates/`,
  MESSAGE_TEMPLATE_BY_ID: (tenantSlug: string, templateId: number) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/message-templates/${templateId}/`,
  CONTACTS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/contacts/`,
  CONTACT_BY_ID: (tenantSlug: string, contactId: number) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/contacts/${contactId}/`,
  LISTS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/lists/`,
  LIST_BY_ID: (tenantSlug: string, listId: number) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/lists/${listId}/`,
  SEGMENT_CRITERIA: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/segment-criteria/`,
  SEGMENT_CRITERION_BY_ID: (tenantSlug: string, criterionId: number) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/marketing/segment-criteria/${criterionId}/`,
};

// Email Verification API endpoints
export const EVS_API = {
  VERIFY_BULK: (tenantSlug: string, jobId: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/evs-api/verify/bulk/${jobId}`,
  FILTERED_RESULTS: (tenantSlug: string, jobId: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/evs-api/verify/bulk/${jobId}/filtered_results`,
  ACCOUNT_CREDITS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/evs-api/account/credits/`,
  API_KEYS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/email-verification/api-keys/`,
};

// Notifications API endpoints
export const NOTIFICATIONS_API = {
  PROVIDER_CONFIGS: (tenantSlug: string) => `${ENGAGEMENT_API_BASE_URL}/api/${tenantSlug}/admin/tenant-provider-configs/`,
};
