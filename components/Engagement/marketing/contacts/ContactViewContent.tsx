import React from 'react';
import { 
  Box, 
  Typography, 
  Divider, 
  Chip,
  Stack
} from '@mui/material';
import { Contact } from '../../../../types/engagement/marketing';

interface ContactViewContentProps {
  contact: Contact;
}

export default function ContactViewContent({ contact }: ContactViewContentProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Contact Details</Typography>
      
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography variant="body1">{contact.email_address || 'Not provided'}</Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
            <Typography variant="body1">{contact.phone_number || 'Not provided'}</Typography>
          </Box>
        </Stack>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">First Name</Typography>
            <Typography variant="body1">{contact.first_name || 'Not provided'}</Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Last Name</Typography>
            <Typography variant="body1">{contact.last_name || 'Not provided'}</Typography>
          </Box>
        </Stack>
        
        <Divider />
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Source</Typography>
            <Typography variant="body1">{contact.source || 'Unknown'}</Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Email Subscription</Typography>
            <Chip 
              label={contact.is_email_subscribed ? 'Subscribed' : 'Unsubscribed'} 
              color={contact.is_email_subscribed ? 'success' : 'default'}
              size="small"
            />
          </Box>
        </Stack>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">SMS Opt-in</Typography>
            <Chip 
              label={contact.is_sms_opt_in ? 'Opted In' : 'Not Opted In'} 
              color={contact.is_sms_opt_in ? 'success' : 'default'}
              size="small"
            />
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
            <Typography variant="body1">
              {contact.created_at ? new Date(contact.created_at).toLocaleString() : 'Unknown'}
            </Typography>
          </Box>
        </Stack>
        
        {contact.updated_at && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
            <Typography variant="body1">
              {new Date(contact.updated_at).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
