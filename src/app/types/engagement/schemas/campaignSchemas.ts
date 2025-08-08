/**
 * Zod schemas for campaign creation and validation
 */
import { z } from 'zod';

/**
 * Schema for email resolved content (subject, body_html, body_text)
 */
export const emailResolvedContentSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body_html: z.string().min(1, "HTML body is required."),
  body_text: z.string().optional().or(z.literal('')).nullable(),
});

/**
 * Schema for the first step of campaign creation - basic details
 */
export const campaignStepDefineSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters."),
  campaign_channel_type: z.literal('EMAIL', {
    errorMap: () => ({ message: "Channel must be EMAIL for this version." }),
  }),
  sender_identifier: z.string().email("Invalid sender email address (e.g., from_email@example.com)."),
  scheduled_at: z.string().datetime().nullable().optional()
    .refine(
      (val) => !val || new Date(val) > new Date(),
      { message: "Scheduled time must be in the future." }
    ),
});
export type CampaignStepDefineData = z.infer<typeof campaignStepDefineSchema>;

/**
 * Schema for the second step of campaign creation - content details
 */
export const campaignStepContentSchema = z.object({
  contentType: z.enum(['use_template', 'custom_message'], { 
    required_error: "Content type selection is required." 
  }),
  source_template_id: z.number().positive().optional().nullable(),
  // For custom_content or overrides, structure matches backend `message_details_for_create`
  custom_content: z.object({ // Only used if contentType is 'custom_message'
    channel_type: z.literal('EMAIL'), // Fixed for now
    resolved_content: emailResolvedContentSchema,
  }).optional().nullable(),
  overrides: z.object({ // Only used if contentType is 'use_template' and there are overrides
    subject: z.string().optional(),
    body_html: z.string().optional(),
    body_text: z.string().optional().nullable(),
  }).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.contentType === 'use_template' && !data.source_template_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A template must be selected when 'Use Template' is chosen.",
      path: ["source_template_id"],
    });
  }
  if (data.contentType === 'custom_message') {
    if (!data.custom_content || !data.custom_content.resolved_content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom content (subject and body) must be provided.",
        path: ["custom_content", "resolved_content"],
      });
    }
    // Further validation for custom_content.resolved_content can be done by parsing it with emailResolvedContentSchema
    if (data.custom_content?.resolved_content) {
      const parseResult = emailResolvedContentSchema.safeParse(data.custom_content.resolved_content);
      if (!parseResult.success) {
        parseResult.error.issues.forEach(issue => {
          ctx.addIssue({
            ...issue,
            path: ['custom_content', 'resolved_content', ...issue.path],
          });
        });
      }
    }
  }
});
export type CampaignStepContentData = z.infer<typeof campaignStepContentSchema>;

/**
 * Schema for the third step of campaign creation - audience selection
 */
export const campaignStepAudienceSchema = z.object({
  target_list_ids: z.array(z.number().positive()).min(1, "At least one target list or segment must be selected."),
});
export type CampaignStepAudienceData = z.infer<typeof campaignStepAudienceSchema>;

/**
 * Type for the final payload to the backend createCampaign API
 */
export type CampaignCreationPayload = CampaignStepDefineData & {
  message_details_for_create: {
    source_template_id?: number | null;
    overrides?: {
      subject?: string;
      body_html?: string;
      body_text?: string | null;
    } | null;
    custom_content?: {
      channel_type: 'EMAIL';
      resolved_content: z.infer<typeof emailResolvedContentSchema>;
    } | null;
  };
  target_list_ids: number[];
  // Additional fields for direct content specification
  subject?: string;
  body_html?: string;
  body_text?: string | null;
  scheduled_at?: Date | string | null;
  status?: string;
  attachments?: File[]; // For multiple file uploads
  attachment?: File | null;
};
