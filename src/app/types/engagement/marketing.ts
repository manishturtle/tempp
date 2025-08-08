/**
 * Marketing automation related types
 */

/**
 * Channel type enum for messaging channels
 */
export type ChannelType = 'EMAIL' | 'SMS' | 'WHATSAPP';

/**
 * Contact interface matching the ContactSerializer from the backend
 */
export interface Contact {
  id: number;
  email_address?: string | null;
  phone_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  source?: string | null;
  is_email_subscribed: boolean;
  email_subscribed_at?: string | null; // ISO date string
  email_unsubscribed_at?: string | null; // ISO date string
  is_sms_opt_in: boolean;
  sms_opt_in_at?: string | null; // ISO date string
  sms_opt_out_at?: string | null; // ISO date string
  is_whatsapp_opt_in: boolean;
  whatsapp_opt_in_at?: string | null; // ISO date string
  whatsapp_opt_out_at?: string | null; // ISO date string
  email_validation_status?: string | null;
  email_last_validated_at?: string | null; // ISO date string
  phone_validation_status?: string | null;
  phone_last_validated_at?: string | null; // ISO date string
  custom_attributes?: Record<string, any> | null;
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: number | null;
  updated_at: string; // ISO date string
  updated_by?: number | null;
}

/**
 * List interface for marketing lists
 */
export interface List {
  id: number;
  name: string;
  description?: string | null;
  list_type: 'STATIC' | 'DYNAMIC_SEGMENT';
  is_internal_generated: boolean;
  contact_count?: number; // Number of contacts in the list
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: number | null;
  updated_at: string; // ISO date string
  updated_by?: number | null;
}

/**
 * List type enum
 */
export type ListType = 'STATIC' | 'DYNAMIC_SEGMENT';

/**
 * MarketingList interface to avoid conflict with native List type
 * Matches the fields returned by the ListSerializer from the backend
 */
export interface MarketingList {
  id: number;
  name: string;
  description?: string | null;
  list_type: ListType;
  is_internal_generated: boolean;
  contact_count?: number; // Number of contacts in the list
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: string | null;
  updated_at: string; // ISO date string
  updated_by?: string | null;
}

/**
 * ListMember interface based on the ContactListMembershipSerializer
 */
export interface ListMember {
  id: number; // Membership ID
  contact_id: number;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  subscribed_at: string; // ISO date string
  company_id?: number;
  client_id?: number;
  created_at?: string; // ISO date string
  created_by?: string | null;
  updated_at?: string; // ISO date string
  updated_by?: string | null;
}

/**
 * Segment criteria interface
 */
export interface SegmentCriteria {
  id: number;
  list_id: number;
  field_name: string;
  operator: string;
  value: string;
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: number | null;
  updated_at: string; // ISO date string
  updated_by?: number | null;
}

/**
 * Contact list membership interface
 */
export interface ContactListMembership {
  id: number;
  contact_id: number;
  list_id: number;
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: number | null;
  updated_at: string; // ISO date string
  updated_by?: number | null;
}

/**
 * Paginated response type (generic, can be reused)
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Campaign status enum
 */
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

/**
 * Simplified details from CampaignMessageInstance for Campaign type
 */
export interface CampaignMessageInstanceSummary {
  id: number;
  channel_type: ChannelType;
  resolved_content: { // Assuming EMAIL for now
    subject?: string;
    body_html?: string;
    body_text?: string | null;
    // Add other channel structures later
  } | Record<string, any>;
  source_message_template_id?: number | null;
  is_modified_from_template: boolean;
}

/**
 * Simplified details from CampaignTargetList for Campaign type
 */
export interface CampaignTargetListDetail {
  id: number;
  list_id: number;
  list_details?: {
    id: number;
    name: string;
    list_type: ListType;
  };
  company_id?: number;
  client_id?: number;
  created_at?: string;
  created_by?: number | null;
  updated_at?: string;
  updated_by?: number | null;
}

/**
 * Campaign interface matching the CampaignSerializer from the backend
 */
export interface Campaign {
  id: number;
  name: string;
  campaign_message_instance: number; // FK ID
  campaign_message_instance_details?: CampaignMessageInstanceSummary; // Nested object for GET
  campaign_channel_type: ChannelType;
  campaign_channel_type_display?: string;
  status: CampaignStatus;
  status_display?: string;
  scheduled_at?: string | null; // ISO date string
  sent_at?: string | null; // ISO date string
  sender_identifier?: string | null; // e.g. from_email@example.com for EMAIL
  verification_job_id?: string | null;
  target_lists_details?: CampaignTargetListDetail[]; // Read-only for GET
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: string | null;
  updated_at: string; // ISO date string
  updated_by?: string | null;
}

/**
 * Email content definition interface for message templates
 */
export interface EmailContentDefinition {
  subject_template: string;
  body_html_template: string;
  body_text_template?: string | null;
  // Additional fields like preheader, etc. can be added here
}

/**
 * Message template interface matching the MessageTemplateSerializer from the backend
 */
export interface MessageTemplate {
  id: number;
  template_name: string;
  description?: string | null;
  channel_type: ChannelType;
  content_definition: EmailContentDefinition | Record<string, any>; // Type depends on channel_type
  is_active: boolean;
  company_id: number;
  client_id: number;
  created_at: string; // ISO date string
  created_by?: string | null;
  updated_at: string; // ISO date string
  updated_by?: string | null;
}
