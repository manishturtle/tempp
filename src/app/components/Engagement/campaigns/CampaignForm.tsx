'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Stack,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  InputAdornment,
  FormHelperText,
  Paper,
  MenuItem,
  Select,
  Tabs,
  Tab
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, UploadFile as UploadFileIcon, Email as EmailIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Campaign, CampaignFormValues } from '../../../types/engagement/campaign';
import { useCreateCampaign, useUpdateCampaign, useUpdateCampaignRecipients } from '../../../hooks/engagement/campaigns/useCampaignMutations';
import { useAvailableEmailLists, useEmailListDetails } from '../../../hooks/engagement/campaigns/useEmailList';

// Form validation schema
const campaignFormSchema = z.object({
  campaign_name: z.string().min(1, 'Campaign name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  attachment: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  app_id: z.number().nullable().optional(),
  app_name: z.string().nullable().optional(),
  executed_at: z.string().nullable().optional(),
  recipients: z.array(z.string().email('Invalid email address')).optional(),
});

type CampaignFormProps = {
  tenantSlug: string;
  campaign: Campaign | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function CampaignForm({ tenantSlug, campaign, onClose, onSuccess }: CampaignFormProps) {
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [recipientSource, setRecipientSource] = useState<'manual' | 'list' | 'file'>('manual');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  
  // Fetch available email lists
  const { data: availableEmailLists = [], isLoading: isLoadingLists } = useAvailableEmailLists(tenantSlug);
  
  // Fetch details of the selected email list
  const { data: selectedListDetails, isLoading: isLoadingListDetails } = useEmailListDetails(
    tenantSlug, 
    recipientSource === 'list' ? selectedListId : null
  );

  const isEditMode = !!campaign;
  const formTitle = isEditMode ? 'Edit Campaign' : 'Create Campaign';

  // Initialize form with campaign data or defaults
  const initialValues = campaign ? {
    campaign_name: campaign.campaign_name,
    subject: campaign.subject,
    body: campaign.body,
    attachment: campaign.attachment,
    type: campaign.type,
    app_id: campaign.app_id,
    app_name: campaign.app_name,
    executed_at: campaign.executed_at,
    // Extract just the email addresses from the recipients array
    recipients: campaign.recipients?.map(recipient => recipient.email) || [],
  } : null;

  // Use React's useEffect to set the recipients when emailList is loaded
  const [formInitialized, setFormInitialized] = useState(false);
  
  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema) as any,
    defaultValues: initialValues || {
      campaign_name: '',
      subject: '',
      body: '',
      attachment: null,
      type: null,
      app_id: null,
      app_name: null,
      executed_at: null,
      recipients: [],
    },
  });
  
  // Handle file upload for recipients
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileUploadError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type (only accept CSV or TXT)
    if (file.type !== 'text/csv' && file.type !== 'text/plain') {
      setFileUploadError('Please upload a CSV or TXT file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileUploadError('File size exceeds 5MB limit');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let emails: string[] = [];
        
        // Parse the file content based on file type
        if (file.type === 'text/csv') {
          // Simple CSV parsing (assuming one email per line or comma-separated)
          emails = content
            .split(/[\r\n,]+/) // Split by newline or comma
            .map(email => email.trim())
            .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        } else {
          // TXT file (assuming one email per line)
          emails = content
            .split(/[\r\n]+/)
            .map(email => email.trim())
            .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        }
        
        if (emails.length === 0) {
          setFileUploadError('No valid email addresses found in the file');
          return;
        }
        
        console.log(`Extracted ${emails.length} emails from uploaded file`);
        setValue('recipients', emails);
        setRecipientSource('file');
      } catch (error) {
        console.error('Error parsing file:', error);
        setFileUploadError('Error parsing file. Please check the format.');
      }
    };
    
    reader.onerror = () => {
      setFileUploadError('Error reading file');
    };
    
    reader.readAsText(file);
  };
  
  // Set the recipients based on the selected source
  useEffect(() => {
    if (recipientSource === 'list' && selectedListDetails?.emails && selectedListDetails.emails.length > 0) {
      console.log('Setting recipients from selected email list:', selectedListDetails.emails);
      setValue('recipients', selectedListDetails.emails);
    }
  }, [recipientSource, selectedListDetails, setValue]);

  // Watch recipients for UI updates
  const recipients = watch('recipients') || [];

  // API mutations
  const createMutation = useCreateCampaign(tenantSlug);
  const updateMutation = useUpdateCampaign(tenantSlug);
  const recipientMutation = useUpdateCampaignRecipients(tenantSlug);

  // Handle form submission
  const onSubmit: SubmitHandler<CampaignFormValues> = async (data) => {
    try {
      if (isEditMode && campaign) {
        // Get the existing recipients from the campaign
        const existingEmails = campaign.recipients?.map(r => r.email) || [];
        
        // Find new recipients to add
        const newRecipients = data.recipients?.filter(email => !existingEmails.includes(email)) || [];
        
        // Find recipients to remove
        const removedRecipients = existingEmails.filter(email => !data.recipients?.includes(email)) || [];
        
        // Update the campaign first
        await updateMutation.mutateAsync({ id: campaign.id, data });
        
        // If there are recipients to add or remove, update them separately
        if (newRecipients.length > 0 || removedRecipients.length > 0) {
          await recipientMutation.mutateAsync({
            campaignId: campaign.id,
            addRecipients: newRecipients,
            removeRecipients: removedRecipients
          });
        }
        
        onSuccess('Campaign updated successfully');
      } else {
        await createMutation.mutateAsync(data);
        onSuccess('Campaign created successfully');
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle adding a new recipient
  const handleAddRecipient = () => {
    if (!newEmail) {
      setEmailError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Invalid email format');
      return;
    }

    // Check for duplicates
    if (recipients.includes(newEmail)) {
      setEmailError('Email already added');
      return;
    }

    // Add the email to the recipients list
    console.log('Adding recipient:', newEmail);
    console.log('Current recipients:', recipients);
    
    const updatedRecipients = [...recipients, newEmail];
    setValue('recipients', updatedRecipients);
    console.log('Updated recipients:', updatedRecipients);
    
    setNewEmail('');
    setEmailError('');
  };

  // Handle removing a recipient
  const handleRemoveRecipient = (email: string) => {
    setValue('recipients', recipients.filter(r => r !== email));
  };

  // Handle scheduled date change
  const handleDateChange = (date: Date | null) => {
    setValue('executed_at', date ? date.toISOString() : null);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">{formTitle}</Typography>
        <IconButton onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Form */}
      <Box 
        component="form" 
        onSubmit={handleSubmit(onSubmit)} 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflowY: 'auto',
          px: 1
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Campaign Name */}
          <Box>
            <Controller
              name="campaign_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Campaign Name"
                  fullWidth
                  error={!!errors.campaign_name}
                  helperText={errors.campaign_name?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>

          {/* Subject */}
          <Box>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Subject"
                  fullWidth
                  error={!!errors.subject}
                  helperText={errors.subject?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>

          {/* Body */}
          <Box>
            <Controller
              name="body"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Body"
                  multiline
                  rows={8}
                  fullWidth
                  error={!!errors.body}
                  helperText={errors.body?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>

          {/* Type & App Name */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Type (Optional)"
                    fullWidth
                    value={field.value || ''}
                    error={!!errors.type}
                    helperText={errors.type?.message}
                    disabled={isPending}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Controller
                name="app_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="App Name (Optional)"
                    fullWidth
                    value={field.value || ''}
                    error={!!errors.app_name}
                    helperText={errors.app_name?.message}
                    disabled={isPending}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Attachment */}
          <Box>
            <Controller
              name="attachment"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <Box>
                  <input
                    type="file"
                    id="attachment-file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onChange(file);
                      }
                    }}
                    disabled={isPending}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      htmlFor="attachment-file"
                      startIcon={<UploadFileIcon />}
                      disabled={isPending}
                    >
                      {value ? 'Change Attachment' : 'Upload Attachment'}
                    </Button>
                    {value && (
                      <Typography variant="body2">
                        {value instanceof File ? value.name : value}
                      </Typography>
                    )}
                  </Box>
                  {errors.attachment && (
                    <FormHelperText error>{errors.attachment.message}</FormHelperText>
                  )}
                </Box>
              )}
            />
          </Box>

          {/* Scheduled Date */}
          <Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Controller
                name="executed_at"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Schedule Date (Optional)"
                    value={field.value ? new Date(field.value) : null}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.executed_at,
                        helperText: errors.executed_at?.message,
                      },
                    }}
                    disabled={isPending}
                  />
                )}
              />
            </LocalizationProvider>
          </Box>

          {/* Recipients */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Recipients
            </Typography>
            
            {/* Recipient Input Method Tabs */}
            {!isEditMode && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs 
                    value={recipientSource} 
                    onChange={(_, newValue) => setRecipientSource(newValue)}
                    aria-label="recipient input method"
                  >
                    <Tab value="manual" label="Manual Entry" icon={<AddIcon />} iconPosition="start" />
                    <Tab value="file" label="Upload File" icon={<UploadFileIcon />} iconPosition="start" />
                    <Tab value="list" label="Select List" icon={<EmailIcon />} iconPosition="start" />
                  </Tabs>
                </Box>
                
                {/* Manual Entry Tab */}
                {recipientSource === 'manual' && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      label="Add Recipient Email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRecipient();
                        }
                      }}
                      fullWidth
                      error={!!emailError}
                      helperText={emailError}
                      disabled={isPending}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton 
                              onClick={handleAddRecipient}
                              edge="end"
                              disabled={isPending}
                            >
                              <AddIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <FormHelperText>
                      Enter email addresses one by one and press Enter or click the + button
                    </FormHelperText>
                  </Box>
                )}
                
                {/* File Upload Tab */}
                {recipientSource === 'file' && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                      sx={{ mb: 1 }}
                      disabled={isPending}
                    >
                      Upload Email List
                      <input
                        type="file"
                        accept=".csv,.txt"
                        hidden
                        onChange={handleFileUpload}
                        onClick={(e) => (e.target as HTMLInputElement).value = ''} // Reset file input
                      />
                    </Button>
                    
                    {fileUploadError && (
                      <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                        {fileUploadError}
                      </Alert>
                    )}
                    
                    <FormHelperText>
                      Upload a CSV or TXT file with one email per line or comma-separated
                    </FormHelperText>
                  </Box>
                )}
                
                {/* Email List Selector Tab */}
                {recipientSource === 'list' && (
                  <Box sx={{ mt: 2 }}>
                    {isLoadingLists ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          Loading available email lists...
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <Select
                          value={selectedListId || ''}
                          onChange={(e) => setSelectedListId(e.target.value ? Number(e.target.value) : null)}
                          fullWidth
                          displayEmpty
                          disabled={isPending}
                        >
                          <MenuItem value="">
                            <em>Select an email list</em>
                          </MenuItem>
                          {availableEmailLists.map((list) => (
                            <MenuItem key={list.id} value={list.id}>
                              {list.name} ({list.count} emails) - {list.source}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Select an email list to automatically add recipients
                        </FormHelperText>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            )}
            
            {/* Show loading indicator when fetching list details */}
            {isLoadingListDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading recipients from selected list...
                </Typography>
              </Box>
            ) : recipients.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {recipientSource === 'list' && selectedListDetails?.name ? 
                      `Recipients loaded from "${selectedListDetails.name}"` : 
                      recipientSource === 'file' ?
                        'Recipients loaded from uploaded file' :
                        isEditMode ? 
                          'Campaign recipients' : 
                          'Recipients added manually'}
                  </Typography>
                  <Typography variant="body2" color="primary">
                    {recipients.length} emails
                  </Typography>
                </Box>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: '200px', overflowY: 'auto' }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {recipients.map((email) => (
                      <Chip
                        key={email}
                        label={email}
                        onDelete={() => handleRemoveRecipient(email)}
                        disabled={isPending}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Paper>
              </>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                No recipients added yet. Add at least one recipient.
              </Alert>
            )}
            
            <FormHelperText>
              Total Recipients: {recipients.length}
            </FormHelperText>
          </Box>
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {(error as Error)?.message || 'An error occurred'}
          </Alert>
        )}

        {/* Submit button */}
        <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ mr: 2 }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            sx={{ 
              bgcolor: '#f5821f', 
              '&:hover': { bgcolor: '#e67812' },
              borderRadius: '4px',
              textTransform: 'none',
            }}
          >
            {isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Campaign' : 'Create Campaign'
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
