/**
 * Campaign management related types
 */

// Campaign data structure from API
// Recipient interface for campaign recipients
export interface CampaignRecipient {
  id: number;
  email: string;
}

export interface Campaign {
  id: number;
  campaign_name: string;
  subject: string;
  body: string;
  attachment?: string | null;
  type?: string | null;
  app_id?: number | null;
  app_name?: string | null;
  executed_at?: string | null;
  total_recipients: number;
  recipients?: CampaignRecipient[];
  created_at: string;
  updated_at: string;
  status: 'Draft' | 'Scheduled' | 'Executed';
}

// Form values for creating/editing a campaign
export interface CampaignFormValues {
  name: string;
  campaign_channel_type: string;
  sender_identifier: string;
  subject: string;
  body_html: string;
  body_text?: string;
  target_list_ids: number[];
  scheduled_at?: Date | string | null;
  attachment?: File | string | null;
  recipients?: string[];
  status?: string;
  // Fields for template-based campaigns
  source_template_id?: number;
  contentType?: 'custom_message' | 'use_template';
  // Nested content structure from form
  custom_content?: {
    channel_type?: string;
    resolved_content: {
      subject: string;
      body_html: string;
      body_text?: string;
    };
  };
  // Template overrides
  overrides?: {
    subject?: string;
    body_html?: string;
    body_text?: string;
  };
  // Message details for create - the structured object expected by the backend
  message_details_for_create?: {
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
  };
  // Legacy fields for backward compatibility
  campaign_name?: string;
  body?: string;
  type?: string | null;
  app_id?: number | null;
  app_name?: string | null;
  executed_at?: string | null;
}

// Campaign recipient update payload
export interface CampaignRecipientsUpdate {
  add_recipients?: string[];
  remove_recipients?: string[];
}
