'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Button, 
  Chip,
  Breadcrumbs,
  Stack,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// import { useGetContactById } from '@/hooks/api/marketing/useContacts';
import { useGetContactById } from '../../../../../hooks/engagement/marketing/useContacts';
import { DrawerProvider } from '../../../../../contexts/DrawerContext';

function ViewContactPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = params?.tenant as string;
  const contactId = params.contactId ? parseInt(params.contactId as string, 10) : undefined;

  const { data: contact, isLoading, isError, error } = useGetContactById(
    tenant,
    contactId
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !contact) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load contact details. {(error as Error)?.message || 'Unknown error'}
        </Alert>
        <Button 
          onClick={() => router.push(`/${tenant}/Crm/engagement/contacts`)} 
          sx={{ mt: 2 }}
          startIcon={<ArrowBackIcon />}
        >
          Back to Contacts
        </Button>
      </Box>
    );
  }

  const pageTitle = "Contact Details";
  const contactsListPath = `/${tenant}/Crm/engagement/contacts`;
  const contactsListLabel = 'Contacts List';

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href={`/${tenant}/Crm/engagement`} passHref legacyBehavior>
          <Typography color="text.primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }}>
            Dashboard
          </Typography>
        </Link>
        <Link href={contactsListPath} passHref legacyBehavior>
          <Typography color="text.primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }}>
            {contactsListLabel}
          </Typography>
        </Link>
        <Typography color="text.primary">
          {contact.email_address || contact.phone_number || `ID: ${contact.id}`}
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            {pageTitle}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          {/* Basic Information */}
          <Typography variant="h6" sx={{ mb: 2, color: '#f5821f', fontWeight: 'bold' }}>
            Basic Information
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
            <Box sx={{ minWidth: '200px', flex: '1 1 45%', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>ID:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{contact.id}</Typography>
            </Box>
            
            <Box sx={{ minWidth: '200px', flex: '1 1 45%', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Type:</Typography>
              <Chip 
                label={contact.source || 'Contact'} 
                color="primary"
                size="small"
              />
            </Box>
            
            <Box sx={{ minWidth: '200px', flex: '1 1 45%', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Email:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{contact.email_address || 'N/A'}</Typography>
            </Box>
            
            <Box sx={{ minWidth: '200px', flex: '1 1 45%', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Phone:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{contact.phone_number || 'N/A'}</Typography>
            </Box>
            
            <Box sx={{ minWidth: '200px', flex: '1 1 45%', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Source:</Typography>
              <Chip 
                label={contact.source || 'N/A'} 
                color="primary"
                size="small"
              />
            </Box>
          </Stack>
          
          {/* Communication Preferences */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2, color: '#f5821f', fontWeight: 'bold' }}>
            Communication Preferences
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ flex: '1 1 50%', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Email Communication:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {contact.is_email_subscribed ? 'Opted In' : 'Opted Out'}
              </Typography>
            </Box>
            
            <Box sx={{ flex: '1 1 50%', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>SMS Communication:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {contact.is_sms_opt_in ? 'Opted In' : 'Opted Out'}
              </Typography>
            </Box>
          </Stack>
          
          {/* Validation Information */}
          {(contact.email_validation_status || contact.phone_validation_status) && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#f5821f', fontWeight: 'bold' }}>
                Validation Information
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                {contact.email_validation_status && (
                  <Box sx={{ flex: '1 1 50%', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Email Validation:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {contact.email_validation_status || 'N/A'}
                    </Typography>
                    {contact.email_last_validated_at && (
                      <Typography variant="caption" color="text.secondary">
                        Last validated: {new Date(contact.email_last_validated_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {contact.phone_validation_status && (
                  <Box sx={{ flex: '1 1 50%', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Phone Validation:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {contact.phone_validation_status || 'N/A'}
                    </Typography>
                    {contact.phone_last_validated_at && (
                      <Typography variant="caption" color="text.secondary">
                        Last validated: {new Date(contact.phone_last_validated_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                )}
              </Stack>
            </Box>
          )}
          
          {/* Metadata Section */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2, color: '#f5821f', fontWeight: 'bold' }}>
            Metadata
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ flex: '1 1 50%', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Created Information</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                {new Date(contact.created_at).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                By: {contact.created_by || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ flex: '1 1 50%', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Updated Information</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                {new Date(contact.updated_at).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                By: {contact.updated_by || 'N/A'}
              </Typography>
            </Box>
          </Stack>
          
          {/* Back to contacts button */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push(`/${tenant}/Crm/engagement/contacts`)}
              sx={{ 
                borderColor: '#f5821f', 
                color: '#f5821f',
                '&:hover': { borderColor: '#e67812', backgroundColor: 'rgba(245, 130, 31, 0.04)' },
                borderRadius: '4px',
                textTransform: 'none',
                px: 3
              }}
            >
              Back to Contacts List
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

// Wrap with DrawerProvider to ensure compatibility with the project structure
export default function Page() {
  return (
    <DrawerProvider>
      <ViewContactPage />
    </DrawerProvider>
  );
}
