'use client';

import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useParams } from 'next/navigation';
import { useCreateCampaign } from '../../../../hooks/engagement/marketing/useCampaigns';

export default function TestFormSubmission() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const createCampaign = useCreateCampaign(tenantSlug as string);
  
  const [htmlContent, setHtmlContent] = useState('<p>Test HTML content</p>');
  const [subject, setSubject] = useState('Test Email Subject');
  const [result, setResult] = useState<any>(null);
  
  const handleSubmit = async () => {
    try {
      // Create a payload with the correct structure
      const payload = {
        name: 'Test Campaign ' + new Date().toISOString(),
        campaign_channel_type: 'EMAIL',
        sender_identifier: 'system@example.com',
        target_list_ids: [1],
        message_details_for_create: {
          custom_content: {
            channel_type: 'EMAIL',
            resolved_content: {
              subject: subject,
              body_html: htmlContent,
              body_text: 'Plain text version'
            }
          }
        }
      };
      
      console.log('Submitting test payload:', payload);
      
      // Create a properly typed payload that includes all required fields
      const typedPayload = {
        name: 'Test Campaign ' + new Date().toISOString(),
        campaign_channel_type: 'EMAIL',
        sender_identifier: 'system@example.com',
        target_list_ids: [1],
        // These are required by the CampaignFormValues type
        subject: subject,
        body_html: htmlContent,
        body_text: 'Plain text version',
        // Add the properly structured message_details_for_create
        message_details_for_create: {
          custom_content: {
            channel_type: 'EMAIL',
            resolved_content: {
              subject: subject,
              body_html: htmlContent,
              body_text: 'Plain text version'
            }
          }
        },
        // Add the nested structure for form data compatibility
        custom_content: {
          channel_type: 'EMAIL',
          resolved_content: {
            subject: subject,
            body_html: htmlContent,
            body_text: 'Plain text version'
          }
        }
      };
      
      const response = await createCampaign.mutateAsync(typedPayload);
      
      setResult({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Test submission failed:', error);
      setResult({
        success: false,
        error: error
      });
    }
  };
  
  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>Test Campaign Submission</Typography>
      
      <TextField
        label="Subject"
        fullWidth
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        margin="normal"
      />
      
      <TextField
        label="HTML Content"
        fullWidth
        multiline
        rows={6}
        value={htmlContent}
        onChange={(e) => setHtmlContent(e.target.value)}
        margin="normal"
        helperText="Enter HTML content here (e.g., <p>Hello world</p>)"
      />
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleSubmit}
        sx={{ mt: 2 }}
      >
        Submit Test Campaign
      </Button>
      
      {result && (
        <Box sx={{ mt: 3, p: 2, bgcolor: result.success ? '#e8f5e9' : '#ffebee', borderRadius: 1 }}>
          <Typography variant="h6">{result.success ? 'Success!' : 'Error!'}</Typography>
          <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Box>
      )}
    </Paper>
  );
}
