'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box } from '@mui/material';

// Import the new FormWizard component
import FormWizard from '../../../../components/common/FormWizard';

// Import Zod schemas and TS types for each step and the final payload
import {
  campaignStepDefineSchema, CampaignStepDefineData,
  campaignStepContentSchema, CampaignStepContentData,
  campaignStepAudienceSchema, CampaignStepAudienceData,
  CampaignCreationPayload,
  emailResolvedContentSchema
} from '../../../../types/engagement/schemas/campaignSchemas';

// Import Step Components
import CampaignStepDefine from './CampaignStepDefine';
import CampaignStepContent from './CampaignStepContent';
import CampaignStepAudience from './CampaignStepAudience';
import CampaignStepReview from './CampaignStepReview';

import { useCreateCampaign } from '../../../../hooks/engagement/marketing/useCampaigns';

// Define a composite type for the entire wizard's form data
export type CampaignWizardFormData = CampaignStepDefineData & CampaignStepContentData & CampaignStepAudienceData;

// Define the step items for the wizard
const wizardSteps = [
  {
    label: 'Define Campaign',
    description: 'Set the basic campaign details like name and sender',
    title: 'Define Your Campaign',
    subtitle: 'Start by providing basic information about your campaign'
  },
  {
    label: 'Setup Content',
    description: 'Create or select your email content',
    title: 'Create Your Content',
    subtitle: 'Design the message that will be sent to your audience'
  },
  {
    label: 'Select Audience',
    description: 'Choose which lists to target',
    title: 'Select Your Audience',
    subtitle: 'Choose which contact lists will receive this campaign'
  },
  {
    label: 'Review & Launch',
    description: 'Verify all details before creating',
    title: 'Review Your Campaign',
    subtitle: 'Verify all details before creating your campaign'
  }
];

interface NewCampaignFormWizardProps {
  tenant: string;
}

export default function NewCampaignFormWizard({ tenant }: NewCampaignFormWizardProps) {
  // For backward compatibility with API hooks that expect tenantSlug
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const createCampaignMutation = useCreateCampaign(tenant);

  const methods = useForm<CampaignWizardFormData>({
    shouldUnregister: false, // Keep data from unmounted steps
    defaultValues: {
      name: '',
      campaign_channel_type: 'EMAIL',
      sender_identifier: '',
      contentType: 'custom_message',
      source_template_id: undefined,
      custom_content: {
        channel_type: 'EMAIL',
        resolved_content: { subject: '', body_html: '', body_text: '' },
      },
      overrides: { subject: '', body_html: '', body_text: '' },
      target_list_ids: [],
    },
  });

  const { handleSubmit, trigger, getValues } = methods;

  // Handle moving to the next step
  const handleNext = async () => {
    setIsSavingStep(true);
    let isValid = false;
    
    try {
      if (activeStep === 0) {
        isValid = await trigger(['name', 'campaign_channel_type', 'sender_identifier']);
      } else if (activeStep === 1) {
        isValid = await trigger(['contentType', 'source_template_id', 'custom_content', 'overrides']);
      } else if (activeStep === 2) {
        isValid = await trigger(['target_list_ids']);
      } else {
        isValid = true; // Review step, no new validation
      }

      if (isValid) {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsSavingStep(false);
    }
    
    return Promise.resolve();
  };

  // Handle moving to the previous step
  const handleBack = () => {
    if (activeStep === 0) {
      router.back(); // Go back to campaigns list
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  // Handle final submission
  const handleFinish = async () => {
    setIsSavingStep(true);
    
    try {
      const data = getValues();
      console.log('Form data before submission:', data);
      
      // Transform wizard data to match backend's expected payload structure
      const payload: any = {
        name: data.name,
        campaign_channel_type: data.campaign_channel_type,
        sender_identifier: data.sender_identifier,
        target_list_ids: data.target_list_ids,
        // Include scheduled_at if provided, otherwise set to null
        scheduled_at: data.scheduled_at || null,
      };
      
      console.log('Scheduled at:', data.scheduled_at);

      // Create the message_details_for_create object with the correct structure
      let messageDetails: any = {};
      
      // Add message details based on content type
      if (data.contentType === 'use_template') {
        // For template-based content
        messageDetails.source_template_id = data.source_template_id;
        
        // Add overrides if they exist
        if (data.overrides && (data.overrides.subject || data.overrides.body_html || data.overrides.body_text)) {
          messageDetails.overrides = {
            subject: data.overrides.subject || '',
            body_html: data.overrides.body_html || '',
            body_text: data.overrides.body_text || ''
          };
        }
      } else { // custom_message
        // For custom content
        if (data.custom_content?.resolved_content) {
          console.log('Custom content found:', data.custom_content);
          messageDetails.custom_content = {
            channel_type: data.campaign_channel_type,
            resolved_content: {
              subject: data.custom_content.resolved_content.subject || '',
              body_html: data.custom_content.resolved_content.body_html || '',
              body_text: data.custom_content.resolved_content.body_text || ''
            }
          };
          
          // Log the HTML content to verify it's not empty
          console.log('HTML content being sent:', data.custom_content.resolved_content.body_html);
        }
      }
      
      // Add the message_details_for_create to the payload
      if (Object.keys(messageDetails).length > 0) {
        // Log the message details object before stringifying
        console.log('Message details object:', messageDetails);
        
        // Add message_details_for_create to the payload
        payload.message_details_for_create = messageDetails;
        
        // IMPORTANT: Also add the HTML content directly to custom_content for the form structure
        // This ensures both the form structure and the payload structure are correct
        if (data.contentType === 'custom_message' && messageDetails.custom_content) {
          payload.custom_content = {
            channel_type: data.campaign_channel_type,
            resolved_content: {
              subject: messageDetails.custom_content.resolved_content.subject,
              body_html: messageDetails.custom_content.resolved_content.body_html,
              body_text: messageDetails.custom_content.resolved_content.body_text
            }
          };
        }
      }
      
      // Log the final payload
      console.log('Final payload being sent:', payload);
      
      await createCampaignMutation.mutateAsync(payload);
      router.push(`/${tenant}/Crm/engagement/campaigns`); // Navigate to campaigns list on success
    } catch (err) {
      console.error("Campaign creation failed in wizard:", err);
    } finally {
      setIsSavingStep(false);
    }
    
    return Promise.resolve();
  };

  // Render the content for each step
  const renderStepContent = (step: number) => {
    return (
      <FormProvider {...methods}>
        {step === 0 && <CampaignStepDefine />}
        {step === 1 && <CampaignStepContent />}
        {step === 2 && <CampaignStepAudience />}
        {step === 3 && <CampaignStepReview formData={getValues()} />}
        
        {createCampaignMutation.isError && (
          <Alert severity="error" sx={{mt: 2}}>
            Error creating campaign: {(createCampaignMutation.error as any)?.message || "An unknown error occurred."}
          </Alert>
        )}
      </FormProvider>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FormWizard
        steps={wizardSteps}
        activeStep={activeStep}
        onNext={handleNext}
        onBack={handleBack}
        onFinish={handleFinish}
        renderStepContent={renderStepContent}
        isLoading={false}
        isSavingStep={isSavingStep || createCampaignMutation.isPending}
        finishButtonLabel="Create Campaign"
        nextButtonLabel="Next"
      />
    </Box>
  );
}
