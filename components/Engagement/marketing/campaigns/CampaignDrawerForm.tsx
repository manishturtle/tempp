'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { ENGAGEMENT_API_BASE_URL} from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  Grid as MuiGrid,
  IconButton,
  InputAdornment,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Email as EmailIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import TipTapEditor from '../../../../components/common/TipTapEditor';
import { Campaign, ChannelType } from '../../../../types/engagement/marketing';
import { useCreateCampaign, useUpdateCampaign } from '../../../../hooks/engagement/campaigns/useCampaignMutations';
import { useGetLists } from '../../../../hooks/engagement/marketing/useLists';
import { CampaignCreationPayload } from '../../../../types/engagement/schemas/campaignSchemas';


// Extend the CampaignCreationPayload type to include scheduled_at and attachments
interface ExtendedCampaignPayload extends CampaignCreationPayload {
  scheduled_at?: string | null;
  attachments?: File[];
  action?: 'draft' | 'publish';
}

// Fix for the Grid component TypeScript errors
const Grid = (props: any) => <MuiGrid {...props} />;

// Define the allowed campaign statuses for the form
type FormCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE';

// Form validation schema
const campaignFormSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters.'),
  campaign_channel_type: z.literal('EMAIL', {
    errorMap: () => ({ message: "Channel must be EMAIL for this version." }),
  }),
  // Sender identifier is required in the backend but we set a default
  sender_identifier: z.string().email("Invalid sender email address").default('system@example.com'),
  subject: z.string().min(1, 'Subject is required'),
  body_html: z.string().min(1, 'Email content is required'),
  body_text: z.string().nullable().default(''),
  target_list_ids: z.array(z.number()).min(1, 'At least one target list must be selected'),
  scheduled_at: z.date().nullable().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE']).default('DRAFT'),
  attachments: z.array(z.instanceof(File)).optional().default([]),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignDrawerFormProps {
  tenant: string;
  campaign?: Campaign | null;
  onClose: () => void;
  onSuccess: (formData?: any) => void;
  onSaveDraft?: (formData?: any) => void;
}

export default function CampaignDrawerForm({ tenant, campaign, onClose, onSuccess, onSaveDraft }: CampaignDrawerFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<'draft' | 'publish'>('publish');
  const isEditMode = !!campaign;
  
  // Initialize the query client for cache invalidation
  const queryClient = useQueryClient();
  
  // State for list pagination and search
  const [listPage, setListPage] = useState(1);
  const [listSearch, setListSearch] = useState('');
  
  // Additional state for frontend filtering
  const [frontendSearchTerm, setFrontendSearchTerm] = useState('');
  
  // Fetch available lists with server-side pagination
  const { data: listsData, isLoading: isLoadingLists, isFetching: isFetchingLists } =
    useGetLists(tenant, listPage, listSearch, true);
  
  // Current page lists from API response
  const currentPageLists = listsData?.results || [];
  console.log('Lists data from API:', currentPageLists);
  
  // Total pages from API response count
  const totalItems = listsData?.count || 0;
  const itemsPerPage = 10; // API returns 10 items per page
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Keep track of all lists we've seen to display selected items properly
  const [allKnownLists, setAllKnownLists] = useState<any[]>([]);
  
  // Update allKnownLists whenever we get new data from the API
  useEffect(() => {
    if (listsData?.results) {
      setAllKnownLists(prev => {
        const newLists = [...prev];
        
        // Add any new lists we haven't seen before
        listsData.results.forEach(list => {
          if (!newLists.some(l => l.id === list.id)) {
            newLists.push(list);
          }
        });
        
        return newLists;
      });
    }
  }, [listsData?.results]);
  
  // Mutations for creating/updating campaigns
  const createCampaignMutation = useCreateCampaign(tenant);
  const updateCampaignMutation = useUpdateCampaign(tenant);

  // State to track file attachments separately from form state
  const [fileAttachments, setFileAttachments] = useState<File[]>([]);
  
  // Debug state changes
  useEffect(() => {
    console.log('fileAttachments state updated:', fileAttachments);
  }, [fileAttachments]);

  // Add a simpler debug logging effect
  useEffect(() => {
    console.log('Component mounted with campaign:', campaign);
    console.log('Edit mode:', isEditMode);
    
    if (campaign) {
      console.log('Campaign ID:', campaign.id);
      console.log('Campaign name:', campaign.name);
      console.log('Target lists:', campaign.target_lists_details);
    }
    
    // Log when mutations change state
    console.log('Create mutation state:', {
      isPending: createCampaignMutation.isPending,
      isError: createCampaignMutation.isError,
      isSuccess: createCampaignMutation.isSuccess
    });
    
    console.log('Update mutation state:', {
      isPending: updateCampaignMutation.isPending,
      isError: updateCampaignMutation.isError,
      isSuccess: updateCampaignMutation.isSuccess
    });
    
  }, [campaign, isEditMode, createCampaignMutation.isPending, createCampaignMutation.isError,
      createCampaignMutation.isSuccess, updateCampaignMutation.isPending,
      updateCampaignMutation.isError, updateCampaignMutation.isSuccess]);

  // Initialize form with campaign data or defaults
  const { control, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema) as any, // Type assertion to fix resolver type mismatch
    defaultValues: campaign ? {
      name: campaign.name,
      campaign_channel_type: 'EMAIL',
      sender_identifier: campaign.sender_identifier || 'system@example.com',
      subject: campaign.campaign_message_instance_details?.resolved_content?.subject || '',
      body_html: campaign.campaign_message_instance_details?.resolved_content?.body_html || '',
      body_text: campaign.campaign_message_instance_details?.resolved_content?.body_text || '',
      target_list_ids: campaign.target_lists_details?.map(list => list.list_id) || [],
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at) : null,
      attachments: [],
      // Map any backend status to one of our allowed form statuses
      status: (campaign.status === 'DRAFT' ? 'DRAFT' :
              campaign.status === 'SCHEDULED' ? 'SCHEDULED' : 'ACTIVE') as FormCampaignStatus,
    } : {
      name: '',
      campaign_channel_type: 'EMAIL',
      sender_identifier: 'system@example.com',
      subject: '',
      body_html: '',
      body_text: '',
      target_list_ids: [],
      scheduled_at: null,
      attachments: [],
      status: 'DRAFT' as const,
    },
  });

  // Form submission handler
  const onSubmit: SubmitHandler<CampaignFormValues> = async (data, actionOverride?: 'draft' | 'publish') => {
    setError(null);
    console.log('Form submission started - isEditMode:', isEditMode);
    console.log('Campaign data:', campaign);
    console.log('Action override:', actionOverride);
    console.log('Current action state:', currentAction);
    console.log('Final action to use:', actionOverride || currentAction);
    
    // Add a direct check to ensure we're handling edit mode correctly
    if (isEditMode && campaign) {
      console.log('EDIT MODE DETECTED - Should update campaign ID:', campaign.id);
    }
    
    try {
      // Log the form data to verify attachments are included
      console.log('Form data submitted:', data);
      console.log('Attachments from form:', data.attachments);
      console.log('Attachments from state:', fileAttachments);
      
      // Prepare payload for API - use our separate state for attachments
      // Create a fresh copy of the attachments array to avoid any reference issues
      const attachments = [...fileAttachments];
      
      console.log('Attachments count to be sent:', attachments.length);
      console.log('Attachments to be sent:', attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      })));
      
      
      if (isEditMode && campaign) {
        console.log('Submitting campaign update with data:', {
          name: data.name,
          sender_identifier: data.sender_identifier,
          target_list_ids: data.target_list_ids,
          subject: data.subject,
          body_html: data.body_html,
          body_text: data.body_text,
          scheduled_at: data.scheduled_at,
          action: currentAction
        });
        
        // Prepare the update payload including the action parameter
        const updateData = {
          name: data.name,
          sender_identifier: data.sender_identifier,
          target_list_ids: data.target_list_ids,
          action: actionOverride || currentAction // Use actionOverride if provided, otherwise currentAction
        };
        
        console.log('Passing update data to parent component:', updateData);
        
        // Pass the form data back to the parent component to handle the API call
        onSuccess(updateData);
        onClose();
      } else {
        // Format the payload according to what the API expects for creation
        const payload: ExtendedCampaignPayload = {
          name: data.name,
          campaign_channel_type: data.campaign_channel_type,
          sender_identifier: data.sender_identifier,
          subject: data.subject,
          target_list_ids: data.target_list_ids,
          scheduled_at: data.scheduled_at ? data.scheduled_at.toISOString() : null,
          attachments: fileAttachments,
          action: actionOverride || currentAction, // Use actionOverride if provided, otherwise currentAction
          // Add the message_details_for_create field with custom content
          message_details_for_create: {
            custom_content: {
              channel_type: data.campaign_channel_type,
              resolved_content: {
                subject: data.subject,
                body_html: data.body_html,
                body_text: data.body_text || ''
              }
            }
          }
        };

        console.log('Payload being sent to API for creation:', payload);
        
        // Create new campaign
        const result = await createCampaignMutation.mutateAsync(payload);
        console.log('Campaign created successfully:', result);
        
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'An error occurred while saving the campaign');
    }
  };

  // Add a direct form submission handler to debug
  const debugSubmit = () => {
    console.log('Manual form submission triggered');
    if (isEditMode && campaign) {
      console.log('This is an edit operation for campaign ID:', campaign.id);
      // Manually trigger the update
      const currentFormValues = watch();
      console.log('Current form values:', currentFormValues);
      
      // Construct the payload for the update mutation - simplified to match backend expectations
      const updateData = {
        name: currentFormValues.name,
        sender_identifier: currentFormValues.sender_identifier,
        target_list_ids: currentFormValues.target_list_ids
      };
      
      console.log('Debug update payload:', updateData);
      
      // Pass the form data back to the parent component through onSuccess
      onSuccess(updateData);
      onClose();
    }
  };
  
  // Add a hardcoded API call function to test the endpoint directly
  const testDirectApiCall = () => {
    console.log('Making hardcoded API call to test endpoint...');
    
    // Hardcoded values for testing
    const hardcodedPayload = {
      name: 'Updated Campaign Name Test',
      sender_identifier: 'test@example.com',
      target_list_ids: [8]
    };
    

    
    // Set up headers with authentication
    const headers = getAuthHeaders();
    
    // Make direct API call with hardcoded values
    axios.put(
      `${ENGAGEMENT_API_BASE_URL}/man/marketing/campaigns/18/`,
      hardcodedPayload,
      { headers }
    )
    .then(response => {
      console.log('Campaign updated successfully with hardcoded values:', response.data);
      alert('Campaign updated successfully with hardcoded values!');
    })
    .catch(error => {
      console.error('Error updating campaign with hardcoded values:', error);
      alert('Error updating campaign: ' + (error.response?.data?.detail || error.message));
      setError('Failed to update campaign with hardcoded values. Please check console.');
    });
  };
  
  // Add a direct submit handler to force the form submission
  const forceSubmit = () => {
    console.log('Force submitting form...');
    if (isEditMode && campaign) {
      const currentFormValues = watch();
      console.log('Current form values for force submit:', currentFormValues);
      
      // Create a simplified payload that matches exactly what the backend expects
      const simplePayload = {
        name: currentFormValues.name,
        sender_identifier: currentFormValues.sender_identifier,
        target_list_ids: currentFormValues.target_list_ids,
        action: currentAction // Include action parameter for direct API calls
      };
      
      console.log('Making direct API call with simplified payload:', simplePayload);
      console.log('API URL:', `${ENGAGEMENT_API_BASE_URL}/api/man/marketing/campaigns/${campaign.id}/`);
      
      
      // Set up headers with authentication
      const headers = getAuthHeaders();
      
      // Make direct API call
      axios.put(
        `${ENGAGEMENT_API_BASE_URL}/api/man/marketing/campaigns/${campaign.id}/`,
        simplePayload,
        { headers }
      )
      .then(response => {
        console.log('Campaign updated successfully with direct call:', response.data);
        onSuccess();
        onClose();
      })
      .catch(error => {
        console.error('Error updating campaign with direct call:', error);
        setError('Failed to update campaign. Please try again.');
      });
    }
  };

  // Handle Save as Draft
  const handleSaveDraft = () => {
    console.log('Save as Draft clicked - setting action to draft');
    setCurrentAction('draft');
    // Trigger form submission with explicit action
    const submitHandler = handleSubmit((data) => onSubmit(data, 'draft') as any);
    submitHandler();
  };

  // Handle Save and Publish
  const handleSaveAndPublish = () => {
    console.log('Save and Publish clicked - setting action to publish');
    setCurrentAction('publish');
    // Trigger form submission with explicit action
    const submitHandler = handleSubmit((data) => onSubmit(data, 'publish') as any);
    submitHandler();
  };

  // Expose these functions to parent component
  React.useEffect(() => {
    if (onSaveDraft) {
      // Store the draft handler in a way the parent can access it
      (window as any).campaignDraftHandler = handleSaveDraft;
    }
    (window as any).campaignPublishHandler = handleSaveAndPublish;
  }, [onSaveDraft]);
  
  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit as any)} sx={{ p: 0, m: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1, p: 0.5 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" sx={{ mb: 0.5, fontSize: '1rem' }}>
        Campaign Info
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mb: 1 }}>
        {/* Campaign Name (Left Half) */}
        <Box sx={{ flex: 1 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Campaign Name"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                margin="dense"
                size="small"
                FormHelperTextProps={{ sx: { mt: 0.25, mb: 0, fontSize: '0.7rem' } }}
              />
            )}
          />
        </Box>
        
        {/* Channel Type (Right Half) */}
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth error={!!errors.campaign_channel_type} disabled size="small" margin="dense">
            <InputLabel id="channel-type-label">Channel Type</InputLabel>
            <Controller
              name="campaign_channel_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="channel-type-label"
                  label="Channel Type"
                  size="small"
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      pl: 2
                    }
                  }}
                >
                  <MenuItem value="EMAIL">Email</MenuItem>
                </Select>
              )}
            />
            {errors.campaign_channel_type && (
              <FormHelperText sx={{ mt: 0.5, mb: 0 }}>{errors.campaign_channel_type.message}</FormHelperText>
            )}
            <FormHelperText sx={{ mt: 0.5, mb: 0 }}>Only Email campaigns are supported in this version.</FormHelperText>
          </FormControl>
        </Box>
      </Box>
      
      <Grid container spacing={1}>
        {/* Target Lists (Full Width) */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.target_list_ids} size="small" margin="dense">
            <Controller
              name="target_list_ids"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  multiple
                  displayEmpty
                  size="small"
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return <Typography variant="body2" color="text.secondary">Select Target Lists</Typography>;
                    }
                    
                    // Use allKnownLists to display selected items properly
                    return (
                      <Stack direction="row" spacing={0.25} flexWrap="wrap" sx={{ pt: 0, pb: 0 }}>
                        {selected.map((listId: number) => {
                          const list = allKnownLists.find(l => l.id === listId);
                          return (
                            <Chip
                              key={listId}
                              label={list ? list.name : `List #${listId}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                height: '20px',
                                margin: '1px',
                                '& .MuiChip-label': {
                                  px: 0.5,
                                  py: 0.125,
                                  fontSize: '0.75rem'
                                }
                              }}
                            />
                          );
                        })}
                      </Stack>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.25,
                      minHeight: '32px',
                      maxHeight: '42px',
                      overflow: 'auto',
                      alignItems: 'center',
                      paddingTop: '6px',
                      paddingBottom: '6px'
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: '300px',
                        width: '350px',
                        overflow: 'auto'
                      }
                    }
                  }}
                >
                  {/* Search field */}
                  <Box component="li" sx={{ p: 1, bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Search lists..."
                      fullWidth
                      value={frontendSearchTerm}
                      onChange={(e) => {
                        setFrontendSearchTerm(e.target.value);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                        endAdornment: frontendSearchTerm ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              aria-label="clear search"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrontendSearchTerm('');
                              }}
                              edge="end"
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </Box>
                  
                  {/* Loading state */}
                  {isLoadingLists || isFetchingLists ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
                    </MenuItem>
                  ) : currentPageLists.length === 0 ? (
                    <MenuItem disabled>No lists found</MenuItem>
                  ) : frontendSearchTerm && allKnownLists.filter(list => {
                      const searchLower = frontendSearchTerm.toLowerCase();
                      const nameMatch = list.name.toLowerCase().includes(searchLower);
                      const descMatch = list.description ? list.description.toLowerCase().includes(searchLower) : false;
                      return nameMatch || descMatch;
                    }).length === 0 ? (
                    <MenuItem disabled>No matching lists found</MenuItem>
                  ) : (
                    // Render list items directly without fragments
                    [
                      // If there's a search term, search through all known lists rather than just current page
                      ...(frontendSearchTerm ? allKnownLists : currentPageLists)
                        .filter(list => {
                          // If no search term, show current page lists (handled in the ternary above)
                          if (!frontendSearchTerm) return true;
                          
                          // Case-insensitive search in name and description
                          const searchLower = frontendSearchTerm.toLowerCase();
                          const nameMatch = list.name.toLowerCase().includes(searchLower);
                          const descMatch = list.description ? 
                            list.description.toLowerCase().includes(searchLower) : false;
                            
                          return nameMatch || descMatch;
                        })
                        // For search results, ensure we don't have duplicates
                        .filter((list, index, self) => 
                          index === self.findIndex((l) => l.id === list.id)
                        )
                        .map((list) => (
                        <MenuItem
                          key={list.id}
                          value={list.id}
                          sx={{ py: 1.5 }}
                        >
                          {list.name} {list.description ? `- ${list.description}` : ''}
                        </MenuItem>
                      )),
                      
                      // Pagination controls (only if needed and not searching)
                      !frontendSearchTerm && totalPages > 1 ? (
                        <MenuItem
                          key="pagination"
                          dense
                          disableRipple
                          sx={{
                            p: 1,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            '&:hover': {
                              backgroundColor: 'transparent'
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="small"
                            disabled={listPage <= 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setListPage(prev => Math.max(1, prev - 1));
                            }}
                          >
                            Prev
                          </Button>
                          <Typography variant="caption">
                            {listPage}/{totalPages}
                          </Typography>
                          <Button
                            size="small"
                            disabled={listPage >= totalPages}
                            onClick={(e) => {
                              e.stopPropagation();
                              setListPage(prev => Math.min(totalPages, prev + 1));
                            }}
                          >
                            Next
                          </Button>
                        </MenuItem>
                      ) : null
                    ]
                  )}
                </Select>
              )}
            />
            {errors.target_list_ids && (
              <FormHelperText sx={{ mt: 0.5, mb: 0 }}>{errors.target_list_ids.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>
        
        {/* Schedule Date (Full Width) */}
        <Grid item xs={12}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Controller
              name="scheduled_at"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Schedule Date"
                  value={field.value}
                  onChange={field.onChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                     
                      margin: 'dense',
                      size: 'small',
                      FormHelperTextProps: { sx: { mt: 0.5, mb: 0 } }
                    }
                  }}
                  disablePast
                />
              )}
            />
          </LocalizationProvider>
        </Grid>
        
        {/* ROW 3: Campaign Status (Right Half) */}
        {/* <Grid item xs={6}>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel id="campaign-status-label">Status</InputLabel>
            <Controller
              name="status"
              control={control}
              defaultValue="DRAFT"
              render={({ field }) => (
                <Select
                  {...field}
                  labelId="campaign-status-label"
                  label="Campaign Status"
                  size="small"
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                </Select>
              )}
            />
          </FormControl>
        </Grid> */}
      </Grid>

      <Divider sx={{ my: 0.5 }} />

      <Typography variant="h6" sx={{ mb: 0.5, fontSize: '1rem' }}>
        {/* Campaign Content */}
      </Typography>
      
      {/* Email Subject (Full Width) */}
      <Box sx={{ mb: 1 }}>
        <Controller
          name="subject"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email Subject"
              fullWidth
              error={!!errors.subject}
              helperText={errors.subject?.message}
              margin="dense"
              size="small"
              sx={{ width: '100%' }}
              FormHelperTextProps={{ sx: { mt: 0.25, mb: 0, fontSize: '0.7rem' } }}
            />
          )}
        />
      </Box>
      
      <Grid container spacing={1}>
        
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.body_html}>
            <InputLabel shrink htmlFor="body-html-label" sx={{ position: 'relative', transform: 'none', mb: 0.25, fontSize: '0.875rem' }}>
              Email Content
            </InputLabel>
            <Controller
              name="body_html"
              control={control}
              render={({ field }) => (
                <Box
                  sx={{
                    border: errors.body_html ? '1px solid red' : '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <TipTapEditor
                    initialContent={field.value}
                    onChange={field.onChange}
                    editable={true}
                    onAttachmentClick={() => {
                      document.getElementById('attachment-file-input')?.click();
                    }}
                    attachmentCount={fileAttachments.length}
                    compact={true}
                  />
                  
                  {/* Attachment status display below editor */}
                  <Box sx={{ mt: 0.25, p: 0.75, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: fileAttachments.length > 0 ? 'rgba(0, 200, 83, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.25, fontSize: '0.875rem' }} color={fileAttachments.length > 0 ? 'success.main' : 'text.secondary'}>
                      Selected Files: {fileAttachments.length}
                    </Typography>
                    
                    {fileAttachments.length > 0 ? (
                      <Stack spacing={0.5}>
                        {fileAttachments.map((file: File, index: number) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 0.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              fontSize: '0.75rem'
                            }}
                          >
                            <AttachFileIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2" sx={{ flexGrow: 1, fontSize: '0.75rem' }}>
                              {file.name} ({(file.size / 1024).toFixed(2)} KB)
                            </Typography>
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              sx={{ minWidth: 'auto', p: 0.25 }}
                              onClick={() => {
                                const newFiles = fileAttachments.filter((_, i) => i !== index);
                                setFileAttachments(newFiles);
                                setValue('attachments', newFiles);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        No files attached. Click the attachment icon in the toolbar to select files.
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            />
            {errors.body_html && (
              <FormHelperText sx={{ mt: 0.25, mb: 0, fontSize: '0.7rem' }}>{errors.body_html.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>
      </Grid>

      {/* Hidden file input for attachment functionality */}
      <input
        accept="*/*"
        style={{ display: 'none' }}
        id="attachment-file-input"
        multiple
        type="file"
        onChange={(e) => {
          if (!e.target.files || e.target.files.length === 0) {
            console.log('No files selected');
            return;
          }
          
          try {
            // Convert FileList to Array
            const files = Array.from(e.target.files);
            console.log('Files selected:', files);
            
            // Create a completely new array for state update
            const newAttachments = [...fileAttachments];
            
            // Add each file individually to ensure they're properly added
            files.forEach(file => {
              newAttachments.push(file);
            });
            
            console.log('New attachments array:', newAttachments);
            
            // Update our state with the new array
            setFileAttachments(newAttachments);
            
            // Force update the form state
            setValue('attachments', newAttachments);
            
            // Reset the input to allow selecting the same file again
            e.target.value = '';
          } catch (error) {
            console.error('Error handling file selection:', error);
          }
        }}
      />
      
      {/* Hidden submit button that will be triggered by the AnimatedDrawer's save button */}
      <Button
        type="submit"
        sx={{ display: 'none' }}
        disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
      >
        {isEditMode ? 'Update' : 'Create'} Campaign
      </Button>
      
      {/* Loading indicator */}
      {(createCampaignMutation.isPending || updateCampaignMutation.isPending) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
}