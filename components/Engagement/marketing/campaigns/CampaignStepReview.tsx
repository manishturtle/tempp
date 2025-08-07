'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { CampaignWizardFormData } from './NewCampaignFormWizard'; // Adjust path
import { useGetMessageTemplateById } from '../../../../hooks/engagement/marketing/useMessageTemplates'; // Adjust path
import { useGetLists } from '../../../../hooks/engagement/marketing/useLists'; // Adjust path
import { MarketingList, MessageTemplate } from '../../../../types/engagement/marketing'; // Adjust path

interface CampaignStepReviewProps {
  formData: CampaignWizardFormData;
}


const CampaignStepReview: React.FC<CampaignStepReviewProps> = ({ formData }) => {
  // const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [targetListObjects, setTargetListObjects] = useState<MarketingList[]>([]);
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const { data: templateData } = useGetMessageTemplateById(
    tenantSlug,
    formData.contentType === 'use_template' && formData.source_template_id ? 
    Number(formData.source_template_id) : undefined
  );

  // This is a simplified way to get list names for review.
  // A more robust way would be a dedicated hook or service call if many lists.
  // Or ensure CampaignStepAudience stores selected objects, not just IDs.
  const { data: allListsData } = useGetLists(
    tenantSlug,
    1, // page
    '', // search
    false // includeInternal
  );

  useEffect(() => {
    if (templateData) {
      setSelectedTemplate(templateData);
    }
  }, [templateData]);

  useEffect(() => {
    if (allListsData?.results && formData.target_list_ids) {
      const selected = allListsData.results.filter(list => formData.target_list_ids.includes(list.id));
      setTargetListObjects(selected);
    }
  }, [allListsData, formData.target_list_ids]);

  // Helper function to truncate long text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        {/* t('campaigns.wizard.review.title', 'Review Campaign Details') */}
        Review Campaign Details
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Campaign Definition</Typography>
        <Stack spacing={1}>
          <Box display="flex">
            <Box width="33%"><Typography variant="subtitle2">Name:</Typography></Box>
            <Box width="67%"><Typography>{formData.name}</Typography></Box>
          </Box>
          <Box display="flex">
            <Box width="33%"><Typography variant="subtitle2">Channel:</Typography></Box>
            <Box width="67%"><Chip label={formData.campaign_channel_type} size="small" /></Box>
          </Box>
          <Box display="flex">
            <Box width="33%"><Typography variant="subtitle2">Sender:</Typography></Box>
            <Box width="67%"><Typography>{formData.sender_identifier}</Typography></Box>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Content</Typography>
        <Stack spacing={1}>
          <Box display="flex">
            <Box width="33%"><Typography variant="subtitle2">Type:</Typography></Box>
            <Box width="67%"><Typography>{formData.contentType === 'use_template' ? 'Using Template' : 'Custom Message'}</Typography></Box>
          </Box>
          
          {formData.contentType === 'use_template' && (
            <>
              <Box display="flex">
                <Box width="33%"><Typography variant="subtitle2">Template:</Typography></Box>
                <Box width="67%">
                  <Typography>
                    {selectedTemplate ? selectedTemplate.template_name : `Template ID: ${formData.source_template_id}`}
                  </Typography>
                </Box>
              </Box>
              
              {formData.overrides?.subject && (
                <Box display="flex">
                  <Box width="33%"><Typography variant="subtitle2">Subject Override:</Typography></Box>
                  <Box width="67%"><Typography>{formData.overrides.subject}</Typography></Box>
                </Box>
              )}
              
              {formData.overrides?.body_html && (
                <Box display="flex">
                  <Box width="33%"><Typography variant="subtitle2">HTML Body Override:</Typography></Box>
                  <Box width="67%"><Typography variant="body2">{truncateText(formData.overrides.body_html)}</Typography></Box>
                </Box>
              )}
            </>
          )}
          
          {formData.contentType === 'custom_message' && (
            <>
              <Box display="flex">
                <Box width="33%"><Typography variant="subtitle2">Subject:</Typography></Box>
                <Box width="67%"><Typography>{formData.custom_content?.resolved_content?.subject}</Typography></Box>
              </Box>
              
              {formData.custom_content?.resolved_content?.body_html && (
                <Box display="flex">
                  <Box width="33%"><Typography variant="subtitle2">HTML Body:</Typography></Box>
                  <Box width="67%"><Typography variant="body2">{truncateText(formData.custom_content.resolved_content.body_html)}</Typography></Box>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Audience</Typography>
        {targetListObjects.length > 0 ? (
          <List dense>
            {targetListObjects.map(list => (
              <ListItem key={list.id} disableGutters>
                <ListItemText 
                  primary={list.name} 
                  secondary={list.list_type === 'STATIC' ? 'Static List' : 'Dynamic Segment'} 
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <>
            <Typography>
              {formData.target_list_ids.length > 0 
                ? 'Loading list details...' 
                : 'No target lists selected.'}
            </Typography>
            {formData.target_list_ids.length > 0 && (
              <List dense>
                {formData.target_list_ids.map(id => (
                  <ListItem key={id} disableGutters>
                    <ListItemText primary={`List ID: ${id}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </Paper>
      <Typography variant="caption" sx={{display: 'block', mt: 2}}>
        Click "Create Campaign" to save this campaign as a DRAFT. You can schedule or send it later.
      </Typography>
    </Box>
  );
};

export default CampaignStepReview;
