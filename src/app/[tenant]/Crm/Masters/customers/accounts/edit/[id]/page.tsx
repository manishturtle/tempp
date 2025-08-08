'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as z from 'zod';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Card,
  CardContent,
  Tabs,
  Tab,
  Tooltip,
  useTheme
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  AddLocationAlt as AddLocationAltIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import EntityAutocomplete from '@/app/components/common/Autocomplete/EntityAutocomplete';
import { entityEndpoints } from '@/app/components/common/Autocomplete/apiEndpoints';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import Notification from '@/app/components/common/Notification';
import AddressForm, { AddressFormData } from '@/app/components/admin/customers/forms/AddressForm';
import ContactForm, { ContactFormData } from '@/app/components/admin/customers/forms/ContactForm';
// Define interface for autocomplete entity options
interface EntityOption {
  id: number | string;
  name?: string;
  full_name?: string;
  username?: string;
  group_name?: string;
  group_type?: string;
  [key: string]: any;
}


// Define the form schema with zod
const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  account_number: z.string().optional().nullable(),
  customer_group: z.any().optional(),
  parent_account: z.any().optional().nullable(),
  status: z.string().min(1, 'Status is required'),
  owner: z.any().optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable().or(z.literal('')),
  primary_phone: z.string().optional().nullable(),
  legal_name: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  company_size: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customer_reference: z.string().optional().nullable(),
  account_type: z.string().optional().nullable(),
  contract_start_date: z.any().optional().nullable(),
  vat_exempt: z.boolean().optional().nullable(),
});

type AccountFormType = z.infer<typeof accountSchema>;

interface Address {
  id?: number;
  address_type: string;
  street_1: string;
  street_2?: string | null;
  street_3?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  city: string;
  state_province?: string | null;
  postal_code: string;
  country: string;
  is_primary_billing: boolean;
  is_primary_shipping: boolean;
}

interface Contact {
  id?: number;
  first_name: string;
  last_name?: string;
  email: string;
  secondary_email?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  job_title?: string | null;
  department?: string | null;
  status: string;
}

/**
 * Maps form data to the format expected by the API for addresses
 */
const mapFormDataToApiAddress = (formData: AddressFormData): any => {
  return {
    id: formData.id,
    address_type: formData.address_type,
    street_1: formData.street_1,
    street_2: formData.street_2 || '',
    street_3: formData.street_3 || '',
    city: formData.city,
    state_province: formData.state || formData.state_province || '',
    postal_code: formData.postal_code,
    country: formData.country,
    is_primary_billing: formData.is_billing || formData.is_primary_billing || false,
    is_primary_shipping: formData.is_shipping || formData.is_primary_shipping || false,
    custom_fields: formData.custom_fields || {}
  };
};

function AccountEditPageContent() {
  // Form refs for the address and contact drawers
  const addressFormRef = useRef<{ submitForm: () => void }>(null);
  const contactFormRef = useRef<{ submitForm: () => void }>(null);
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const drawerContext = useDrawer();
  const accountId = params.id as string;
  const queryClient = useQueryClient();

  // State management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState<any>(null);
  const [groupType, setGroupType] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState<boolean>(false);
  const [contactDrawerOpen, setContactDrawerOpen] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [notification, setNotification] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'}>(
    { open: false, message: '', severity: 'info' }
  );
  
  const { control, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<AccountFormType>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      account_number: '',
      customer_group: null,
      parent_account: null,
      status: '',
      owner: null,
      website: '',
      primary_phone: '',
      legal_name: '',
      industry: '',
      company_size: '',
      tax_id: '',
      description: '',
      customer_reference: '',
      account_type: '',
      contract_start_date: null,
      vat_exempt: false,
    }
  });

  const isIndividualGroup = groupType === 'INDIVIDUAL';
  const isBusinessOrGovernmentGroup = groupType === 'BUSINESS' || groupType === 'GOVERNMENT';

  // Fetch account data when component mounts
  useEffect(() => {
    const fetchAccountData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/accounts/${accountId}/`, {
          headers: getAuthHeaders()
        });
        
        const accountData = response.data;
        
        // Set form values from API response
        reset({
          name: accountData.name || '',
          account_number: accountData.account_number || '',
          customer_group: accountData.customer_group?.id || null,
          parent_account: accountData.parent_account || null,
          status: accountData.status || '',
          owner: accountData.owner || null,
          website: accountData.website || '',
          primary_phone: accountData.primary_phone || '',
          legal_name: accountData.legal_name || '',
          industry: accountData.industry || '',
          company_size: accountData.company_size || '',
          tax_id: accountData.tax_id || '',
          description: accountData.description || '',
          customer_reference: accountData.customer_reference || '',
          account_type: accountData.account_type || '',
          contract_start_date: accountData.contract_start_date || null,
          vat_exempt: accountData.vat_exempt || false,
        });
        
        setSelectedCustomerGroup(accountData.customer_group);
        setGroupType(accountData.customer_group?.group_type || '');
        setAddresses(accountData.addresses || []);
        setContacts(accountData.contacts || []);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching account data:', err);
        setError('Failed to load account data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAccountData();
  }, [accountId, reset]);
  
  // Toggle between view and edit mode
  const handleToggleEditMode = () => {
    setIsEditMode(prev => !prev);
  };
  
  // Handle remove address
  const handleRemoveAddress = (index: number) => {
    if (!isEditMode) return;
    setAddresses(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle remove contact
  const handleRemoveContact = (index: number) => {
    if (!isEditMode) return;
    setContacts(prev => prev.filter((_, i) => i !== index));
  };
   const saveAddressMutation = useMutation({
      mutationFn: (addressData: AddressFormData) => {
        // Map form data to API structure
        const apiData = mapFormDataToApiAddress(addressData);
        
        // Ensure account_id is set and is an integer for API
        apiData.account_id = addressData.id ? parseInt(String(addressData.id), 10) : parseInt(accountId, 10);
        
        // Determine if this is a create or update operation
        if (addressData.id) {
          // Update existing address
          return api.put(`addresses/${addressData.id}/`, apiData, {
            headers: getAuthHeaders()
          });
        } else {
          // Create new address
          return api.post(`addresses/`, apiData, {
            headers: getAuthHeaders()
          });
        }
      },
      onSuccess: () => {
        // Invalidate the account detail query to refresh the data
        queryClient.invalidateQueries({ queryKey: ['accountDetail', accountId] });
        
        // Reset form and close drawer
        setAddressDrawerOpen(false);
        setSelectedAddress(undefined);
        
        // Show success notification
        setNotification({
          open: true,
          message: selectedAddress 
            ? t('Address updated successfully')
            : t('Address created successfully'),
          severity: 'success'
        });
        
      },
      onError: (error: any) => {
        // Show error notification
        setNotification({
          open: true,
          message: `${selectedAddress 
            ? t('Address update failed') 
            : t('Address creation failed')}: ${error.message}`,
          severity: 'error'
        });
      }
    });
    
    // Function to handle saving an address
    const handleSaveAddress = (formData: AddressFormData) => {
      // Ensure account_id is set properly for both new and existing addresses
      const updatedFormData = {
        ...formData,
        // Use the current accountId if not provided
        account_id: formData.id || parseInt(accountId, 10)
      };
      
      saveAddressMutation.mutate(updatedFormData);
    };
    
    // Handle save contact
    const saveContactMutation = useMutation({
      mutationFn: async (formData: ContactFormData) => {
        // Ensure account_id is properly formatted as number for API
        const apiData = {
          ...formData,
          account_id: typeof formData.account_id === 'string' ? parseInt(formData.account_id, 10) : formData.account_id
        };
        
        const url = formData.id 
          ? `/contacts/${formData.id}/` 
          : '/contacts/';
        
        const method = formData.id ? 'put' : 'post';
        
        const response = await api[method](url, apiData, {
          headers: getAuthHeaders()
        });
        return response.data;
      },
      onSuccess: () => {
        // Reset and close drawer
        setContactDrawerOpen(false);
        setSelectedContact(undefined);
        
        // Show success message
        setNotification({
          open: true,
          message: selectedContact?.id
            ? t('Contact updated successfully')
            : t('Contact created successfully'),
          severity: 'success'
        });
        
       
      },
      onError: (error: any) => {
        // Show error notification
        setNotification({
          open: true,
          message: `Error: ${error.message || 'Failed to save contact'}`,
          severity: 'error'
        });
      }
    });
    
    const handleSaveContact = (formData: ContactFormData) => {
      // Ensure account_id is set properly for both new and existing contacts
      const updatedFormData = {
        ...formData,
        account_id: formData.id || accountId.toString() // Ensure account_id is always a string
      };
      saveContactMutation.mutate(updatedFormData);
    };
  
  // Handle form submission
  const onSubmit = async (data: AccountFormType) => {
    setIsSaving(true);
    try {
      // Prepare form data with addresses and contacts
      const formData = {
        ...data,
        addresses: addresses,
        contacts: contacts
      };
      
      // Update account data
      await api.put(`/api/crm/accounts/${accountId}/`, formData, {
        headers: getAuthHeaders()
      });
      
      // Exit edit mode and refresh data
      setIsEditMode(false);
      
      // Show success message
      setNotification({
        open: true,
        severity: 'success',
        message: t('Account updated successfully')
      });
    } catch (err) {
      console.error('Error updating account:', err);
      // Show error message
      setNotification({
        open: true,
        severity: 'error',
        message: t('Failed to update account. Please try again.')
      })
    } finally {
      setIsSaving(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Function to open the address drawer
  const openAddressDrawer = (initialData?: Address) => {
    setSelectedAddress(initialData ? { ...initialData } : undefined);
    setAddressDrawerOpen(true);
  };

  // Function to open the contact drawer
  const openContactDrawer = (initialData?: Contact) => {
    setSelectedContact(initialData ? { ...initialData } : undefined);
    setContactDrawerOpen(true);
  };

 
  return (
    <>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
      {/* Page header with title and edit/save buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {t('View Account')}
        </Typography>
        {!isEditMode ? (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleToggleEditMode}
          >
            {t('Edit')}
          </Button>
        ) : (
          <Box>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleToggleEditMode}
              sx={{ mr: 1 }}
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={24} /> : t('Save')}
            </Button>
          </Box>
        )}
      </Box>
      
      <form>
        <Grid container spacing={3}>
          {/* Left Column - 70% width */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            {/* Account Information Section */}
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ p: 3, mb: 3 }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('Account Information')}
              </Typography>
              
              <Grid container spacing={2}>
                {/* Account Name */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('field.name')}
                          fullWidth
                          required
                          size="small"
                          error={!!errors.name}
                          helperText={errors.name?.message ? String(errors.name.message) : undefined}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('field.name')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('name')}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Parent Account */}
                <Grid size={12}>
                  {isEditMode ? (
                    <EntityAutocomplete
                      name="parent_account"
                      control={control}
                      label={t('Parent Account')}
                      apiEndpoint={entityEndpoints.accounts}
                      disabled={isIndividualGroup}
                      getOptionLabel={(option: EntityOption) => option?.name || ''}
                      error={!!errors.parent_account}
                      helperText={errors.parent_account?.message ? String(errors.parent_account.message) : undefined}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Parent Account')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('parent_account')?.name || t('None')}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Customer Group */}
                <Grid size={12}>
                  {isEditMode ? (
                    <EntityAutocomplete
                      name="customer_group"
                      label={t('Customer Group')}
                      control={control}
                      apiEndpoint={entityEndpoints.customerGroups}
                      required
                      disabled={!!watch('parent_account')}
                      error={!!errors.customer_group}
                      helperText={watch('parent_account') 
                        ? t('accountCreatePage.customerGroupInheritanceMessage') 
                        : errors.customer_group?.message ? String(errors.customer_group.message) : undefined}
                      getOptionLabel={(option: EntityOption) => option?.group_name || ''}
                      onChange={(value: EntityOption | null) => {
                        if (!watch('parent_account')) {
                          setSelectedCustomerGroup(value);
                          if (value?.group_type) {
                            setGroupType(value.group_type);
                          }
                        }
                      }}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Customer Group')}
                      </Typography>
                      <Typography variant="body1">
                        {selectedCustomerGroup?.group_name || ''}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Account Number */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  {isEditMode ? (
                    <Controller
                      name="account_number"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('Account Number')}
                          fullWidth
                          size="small"
                          error={!!errors.account_number}
                          helperText={errors.account_number?.message ? String(errors.account_number.message) : undefined}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Account Number')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('account_number') || '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Status */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  {isEditMode ? (
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.status}>
                          <InputLabel id="status-label">{t('Status')}</InputLabel>
                          <Select
                            {...field}
                            labelId="status-label"
                            label={t('Status')}
                            size="small"
                          >
                            <MenuItem value="Active">{t('accountStatus.Active')}</MenuItem>
                            <MenuItem value="Inactive">{t('accountStatus.Inactive')}</MenuItem>
                            <MenuItem value="Prospect">{t('accountStatus.Prospect')}</MenuItem>
                          </Select>
                          {errors.status && (
                            <FormHelperText>{errors.status.message ? String(errors.status.message) : undefined}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Status')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('status') ? t(`accountStatus.${watch('status')}`) : '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Owner */}
                <Grid size={12}>
                  {isEditMode ? (
                    <EntityAutocomplete
                      name="owner"
                      control={control}
                      label={t('Owner')}
                      apiEndpoint={entityEndpoints.users}
                      getOptionLabel={(option: EntityOption) => option?.full_name || option?.username || ''}
                      error={!!errors.owner}
                      helperText={errors.owner?.message ? String(errors.owner.message) : undefined}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Owner')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('owner')?.full_name || watch('owner')?.username || t('None')}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Website */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="website"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('Website')}
                          fullWidth
                          size="small"
                          type="url"
                          error={!!errors.website}
                          helperText={errors.website?.message ? String(errors.website.message) : undefined}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Website')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('website') || '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Primary Phone */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="primary_phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('Primary Phone')}
                          fullWidth
                          size="small"
                          type="tel"
                          error={!!errors.primary_phone}
                          helperText={errors.primary_phone?.message ? String(errors.primary_phone.message) : undefined}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Primary Phone')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('primary_phone') || '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
           
            {/* Business/Government Details Section - Conditionally rendered */}
            {isBusinessOrGovernmentGroup && (
              <Paper 
                elevation={0} 
                variant="outlined" 
                sx={{ p: 3, mb: 3 }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  {groupType === 'BUSINESS' 
                    ? t('Business Details') 
                    : t('Government Details')}
                </Typography>
                
                <Grid container spacing={2}>
                  {/* Legal Name */}
                  <Grid size={12}>
                    {isEditMode ? (
                      <Controller
                        name="legal_name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label={t('Legal Name')}
                            fullWidth
                            size="small"
                            error={!!errors.legal_name}
                            helperText={errors.legal_name?.message ? String(errors.legal_name.message) : undefined}
                          />
                        )}
                      />
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('Legal Name')}
                        </Typography>
                        <Typography variant="body1">
                          {watch('legal_name') || '-'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  {/* Industry */}
                  <Grid size={12}>
                    {isEditMode ? (
                      <Controller
                        name="industry"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth size="small">
                            <InputLabel id="industry-label">{t('Industry')}</InputLabel>
                            <Select
                              {...field}
                              labelId="industry-label"
                              label={t('Industry')}
                              size="small"
                            >
                              <MenuItem value="Technology">{t('Technology')}</MenuItem>
                              <MenuItem value="Finance">{t('Finance')}</MenuItem>
                              <MenuItem value="Healthcare">{t('Healthcare')}</MenuItem>
                              <MenuItem value="Retail">{t('Retail')}</MenuItem>
                              <MenuItem value="Manufacturing">{t('Manufacturing')}</MenuItem>
                              <MenuItem value="Other">{t('Other')}</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('Industry')}
                        </Typography>
                        <Typography variant="body1">
                          {watch('industry') || '-'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  {/* Company Size */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode ? (
                      <Controller
                        name="company_size"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth size="small">
                            <InputLabel id="company-size-label">{t('Company Size')}</InputLabel>
                            <Select
                              {...field}
                              labelId="company-size-label"
                              label={t('Company Size')}
                              size="small"
                            >
                              <MenuItem value="1-10 employees">{t('1-10 employees')}</MenuItem>
                              <MenuItem value="11-50 employees">{t('11-50 employees')}</MenuItem>
                              <MenuItem value="51-200 employees">{t('51-200 employees')}</MenuItem>
                              <MenuItem value="201-500 employees">{t('201-500 employees')}</MenuItem>
                              <MenuItem value="501+ employees">{t('501+ employees')}</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('Company Size')}
                        </Typography>
                        <Typography variant="body1">
                          {watch('company_size') || '-'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  {/* Tax ID */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode ? (
                      <Controller
                        name="tax_id"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label={t('Tax ID')}
                            fullWidth
                            size="small"
                            error={!!errors.tax_id}
                            helperText={errors.tax_id?.message ? String(errors.tax_id.message) : undefined}
                          />
                        )}
                      />
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('Tax ID')}
                        </Typography>
                        <Typography variant="body1">
                          {watch('tax_id') || '-'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            )}
            
            {/* Description Section */}
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ p: 3, mb: 3 }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('Description')}
              </Typography>
              
              {isEditMode ? (
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('Description')}
                      fullWidth
                      multiline
                      rows={4}
                      size="small"
                      error={!!errors.description}
                      helperText={errors.description?.message ? String(errors.description.message) : undefined}
                    />
                  )}
                />
              ) : (
                <Typography variant="body1">
                  {watch('description') || t('No description provided.')}
                </Typography>
              )}
            </Paper>
            {/* Addresses Section */}
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ p: 3, mb: 3 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('Addresses')}
                </Typography>
                {isEditMode && (
                  <Button 
                    variant="outlined" 
                    color="primary"
                    size="small"
                    startIcon={<AddLocationAltIcon />}
                    sx={{ textTransform: 'none' }}
                    onClick={() => openAddressDrawer()}
                  >
                    {t('Add Address')}
                  </Button>
                )}
              </Box>
              
              {addresses.length > 0 ? (
                <List sx={{ width: '100%' }}>
                  {addresses.map((address, index) => (
                    <Paper 
                      key={index}
                      variant="outlined"
                      sx={{ 
                        mb: 1, 
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: isEditMode ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        '&:hover': isEditMode ? {
                          bgcolor: 'action.hover',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        } : {}
                      }}
                      onClick={() => {
                        if (!isEditMode) return;
                        openAddressDrawer(address);
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {address.address_type}
                          {(address.is_primary_billing || address.is_primary_shipping) && (
                            <Typography 
                              component="span" 
                              variant="caption" 
                              sx={{ 
                                ml: 1, 
                                px: 1, 
                                py: 0.5, 
                                bgcolor: 'primary.light', 
                                color: 'primary.contrastText',
                                borderRadius: 1,
                                fontSize: '0.7rem'
                              }}
                            >
                              {t('Default')}
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {address.street_1}{address.street_2 ? `, ${address.street_2}` : ''}, {address.city}, {address.state_province || ''} {address.postal_code}, {address.country}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {address.is_primary_billing && (
                            <Typography 
                              component="span" 
                              variant="caption" 
                              sx={{ 
                                mr: 1, 
                                px: 1, 
                                py: 0.25, 
                                bgcolor: 'grey.100', 
                                borderRadius: 1,
                                fontSize: '0.7rem'
                              }}
                            >
                              {t('Billing')}
                            </Typography>
                          )}
                          {address.is_primary_shipping && (
                            <Typography 
                              component="span" 
                              variant="caption" 
                              sx={{ 
                                px: 1, 
                                py: 0.25, 
                                bgcolor: 'grey.100', 
                                borderRadius: 1,
                                fontSize: '0.7rem'
                              }}
                            >
                              {t('Shipping')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {isEditMode && (
                        <Box onClick={(e) => e.stopPropagation()}>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRemoveAddress(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </List>
              ) : (
                <Box sx={{ 
                  p: 3, 
                  border: '1px dashed', 
                  borderColor: 'divider',
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('No addresses added yet')}
                  </Typography>
                </Box>
              )}
            </Paper>
            
            {/* Contacts Section */}
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ p: 3, mb: 3 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('Contacts')}
                </Typography>
                {isEditMode && isBusinessOrGovernmentGroup && (
                  <Button 
                    variant="outlined" 
                    color="primary"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    sx={{ textTransform: 'none' }}
                    onClick={() => openContactDrawer()}
                  >
                    {t('Add Contact')}
                  </Button>
                )}
              </Box>
              
              {/* Individual customer group view */}
              {isIndividualGroup && (
                <Box sx={{ 
                  p: 3, 
                  border: '1px dashed', 
                  borderColor: 'divider',
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('For individual accounts, contact information is automatically created from account details.')}
                  </Typography>
                </Box>
              )}
              
              {/* Business/Government customer group view */}
              {isBusinessOrGovernmentGroup && (
                <>
                  {contacts.length > 0 ? (
                    <List sx={{ width: '100%' }}>
                      {contacts.map((contact, index) => (
                        <Paper 
                          key={index}
                          variant="outlined"
                          sx={{ 
                            mb: 1, 
                            p: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {contact.first_name} {contact.last_name || ''}
                              {index === 0 && (
                                <Typography 
                                  component="span" 
                                  variant="caption" 
                                  sx={{ 
                                    ml: 1, 
                                    px: 1, 
                                    py: 0.5, 
                                    bgcolor: 'primary.light', 
                                    color: 'primary.contrastText',
                                    borderRadius: 1,
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  {t('Primary')}
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {contact.email}
                            </Typography>
                            {contact.job_title && (
                              <Typography variant="body2" color="text.secondary">
                                {contact.job_title}{contact.department ? `, ${contact.department}` : ''}
                              </Typography>
                            )}
                          </Box>
                          {isEditMode && (
                            <Box>
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => openContactDrawer(contact)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRemoveContact(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ 
                      p: 3, 
                      border: '1px dashed', 
                      borderColor: 'divider',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('No contacts added yet')}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>
          
          {/* Right Column - 30% width */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            {/* Additional Information Section */}
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ p: 3 }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('Additional Information')}
              </Typography>
              
              <Grid container spacing={2}>
                {/* Customer Reference */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="customer_reference"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('Customer Reference')}
                          fullWidth
                          size="small"
                          error={!!errors.customer_reference}
                          helperText={errors.customer_reference?.message ? String(errors.customer_reference.message) : undefined}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Customer Reference')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('customer_reference') || '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Account Type */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="account_type"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small">
                          <InputLabel id="account-type-label">{t('Account Type')}</InputLabel>
                          <Select
                            {...field}
                            labelId="account-type-label"
                            label={t('Account Type')}
                            size="small"
                          >
                            <MenuItem value="Standard">{t('Standard')}</MenuItem>
                            <MenuItem value="Premium">{t('Premium')}</MenuItem>
                            <MenuItem value="Enterprise">{t('Enterprise')}</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Account Type')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('account_type') || '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* Contract Start Date */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="contract_start_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label={t('Contract Start Date')}
                          value={field.value}
                          onChange={(date: Date | null) => field.onChange(date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              error: !!errors.contract_start_date,
                              helperText: errors.contract_start_date?.message ? String(errors.contract_start_date.message) : undefined
                            }
                          }}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('Contract Start Date')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('contract_start_date') ? new Date(watch('contract_start_date')).toLocaleDateString() : '-'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                {/* VAT Exempt */}
                <Grid size={12}>
                  {isEditMode ? (
                    <Controller
                      name="vat_exempt"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormControlLabel
                          control={
                            <Checkbox 
                              {...field}
                              checked={!!value} 
                              onChange={(e) => onChange(e.target.checked)}
                            />
                          }
                          label={t('VAT Exempt')}
                        />
                      )}
                    />
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('VAT Exempt')}
                      </Typography>
                      <Typography variant="body1">
                        {watch('vat_exempt') ? t('Yes') : t('No')}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </form>
      
     
      </Box>
    </LocalizationProvider>
    
    {/* Address Drawer */}
    <AnimatedDrawer
      open={addressDrawerOpen}
      onClose={() => {
        setAddressDrawerOpen(false);
        setTimeout(() => {
          setSelectedAddress(undefined);
        }, 300); // Small delay to ensure drawer animation completes
      }}
      initialWidth={550}
      expandedWidth={550}
      title={selectedAddress?.id ? t('Edit Address') : t('New Address')}
      footerContent={
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              if (selectedAddress) {
                handleSaveAddress(selectedAddress as AddressFormData);
              } else {
                // Handle the case for a new address
                handleSaveAddress({
                  address_type: 'Business',
                  street_1: '',
                  city: '',
                  postal_code: '',
                  country: '',
                  is_primary_billing: false,
                  is_primary_shipping: false
                } as AddressFormData);
              }
            }}
            size="small"
          >
            {t('Save')}
          </Button>
        </Box>
      }
    >
      <Box>
        <AddressForm
          initialData={selectedAddress as AddressFormData}
          onSubmit={handleSaveAddress}
          isSubmitting={false}
          isViewMode={false}
        />
      </Box>
    </AnimatedDrawer>

    {/* Contact Drawer */}
    <AnimatedDrawer
      open={contactDrawerOpen}
      onClose={() => {
        setContactDrawerOpen(false);
        setTimeout(() => {
          setSelectedContact(undefined);
        }, 300); // Small delay to ensure drawer animation completes
      }}
      initialWidth={550}
      expandedWidth={550}
      title={selectedContact?.id ? t('Edit Contact') : t('New Contact')}
      footerContent={
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              if (selectedContact) {
                handleSaveContact(selectedContact as ContactFormData);
              } else {
                // Handle the case for a new contact
                handleSaveContact({
                  first_name: '',
                  email: '',
                  status: 'Active'
                } as ContactFormData);
              }
            }}
            size="small"
          >
            {t('Save')}
          </Button>
        </Box>
      }
    >
      <Box>
        <ContactForm
          initialData={selectedContact as ContactFormData}
          onSubmit={handleSaveContact}
          isSubmitting={false}
          isViewMode={false}
          showOwnerField={true}
        />
      </Box>
    </AnimatedDrawer>

  {/* Notification component */}
  <Notification
    open={notification.open}
    message={notification.message}
    severity={notification.severity}
    onClose={handleCloseNotification}
  />
  </>
)}
/**
 * Wrapper component that provides the DrawerContext
 */
export default function AccountEditPage() {
  return (
    <DrawerProvider>
      <AccountEditPageContent />
    </DrawerProvider>
  );
}