"use client";

/**
 * New Account Page
 * 
 * Page component for creating a new customer account using react-hook-form and zod validation
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl, 
  FormControlLabel,
  Checkbox,
  Button,
  Stack,
  Divider,
  IconButton,
  List,
  FormGroup,
  FormHelperText,
  Snackbar,
  Alert,
  CircularProgress,
  Skeleton
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EntityAutocomplete, { Entity } from '@/app/components/common/Autocomplete/EntityAutocomplete';
import { entityEndpoints } from '@/app/components/common/Autocomplete/apiEndpoints';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import toast from 'react-hot-toast';
import {
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Add imports at the top of the file
import { useFetchAccount, useCreateAccount, useUpdateAccount } from '@/app/hooks/api/customers';

// Define custom field types and interfaces
export type CustomFieldType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'NUMBER' 
  | 'CURRENCY' 
  | 'DATE' 
  | 'DATETIME' 
  | 'CHECKBOX' 
  | 'PICKLIST';

// Define User interface
interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  is_active?: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  field_name: string;
  label: string;
  field_type: CustomFieldType;
  is_required: boolean;
  object_type: string;
  is_active: boolean;
  picklist_values?: string[];
  default_value?: string | number | boolean | null;
  help_text?: string;
  placeholder?: string;
  max_length?: number;
  min_value?: number;
  max_value?: number;
}

export interface CustomFieldsData {
  [key: string]: string | number | boolean | null | undefined;
}

// Define the Zod schema for form validation
const accountCreateSchema = z.object({
  name: z.string().min(1, { message: 'Account name is required' }),
  // Allow both string and number for customer_group to handle both ID values and string representations
  customer_group: z.union([
    z.string().min(1, { message: 'Customer group is required' }),
    z.number().int().positive()
  ]),
  // Allow both string and number for parent_account to handle both ID values and string representations
  parent_account: z.union([
    z.string().optional(),
    z.number().int().positive().optional()
  ]).optional(),
  account_number: z.string().optional(),
  status: z.string().min(1, { message: 'Status is required' }),
  owner: z.string().optional().nullable(),
  website: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  primary_phone: z.string().optional(),
  customer_reference: z.string().optional(),
  account_type: z.string().optional(),
  contract_start_date: z.any().optional().nullable(), // Using any to accommodate both Date and Dayjs
  vat_exempt: z.boolean().optional(),
  legal_name: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  tax_id: z.string().optional(),
  description: z.string().optional(),
  custom_fields: z.record(z.string(), z.any()).optional() // Custom fields will be validated dynamically
});

// Define interfaces for API responses
interface CustomerGroup {
  id: string;
  group_name: string;
  group_type: string;
  is_active: boolean;
}

// Address form data type
interface AddressFormData {
  id?: string;
  address_type: string;
  street_1: string;
  street_2?: string;
  street_3?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  is_billing: boolean;
  is_shipping: boolean;
}

// Zod schema for address validation
const addressSchema = z.object({
  id: z.string().optional(),
  address_type: z.string().min(1, { message: 'field.required' }),
  street_1: z.string().min(1, { message: 'field.required' }),
  street_2: z.string().optional(),
  street_3: z.string().optional(),
  city: z.string().min(1, { message: 'field.required' }),
  state: z.string().optional(),
  postal_code: z.string().min(1, { message: 'field.required' }),
  country: z.string().min(1, { message: 'field.required' }),
  is_default: z.boolean().default(false),
  is_billing: z.boolean().default(false),
  is_shipping: z.boolean().default(false)
});

// Contact form data type
interface ContactFormData {
  id?: string;
  first_name: string;
  last_name?: string;
  email: string;
  secondary_email?: string;
  mobile_phone?: string;
  work_phone?: string;
  job_title?: string;
  department?: string;
  status: string;
  owner?: string | null;
  description?: string;
  is_primary?: boolean;
  email_opt_out?: boolean;
  do_not_call?: boolean;
  sms_opt_out?: boolean;
  account_id?: string;
}

// Zod schema for contact validation
const contactSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email format'),
  secondary_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  mobile_phone: z.string().optional().or(z.literal('')),
  work_phone: z.string().optional().or(z.literal('')),
  job_title: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  status: z.string().min(1, 'Status is required'),
  owner: z.string().optional().nullable(),
  description: z.string().optional().or(z.literal('')),
  is_primary: z.boolean().optional(),
  email_opt_out: z.boolean().optional(),
  do_not_call: z.boolean().optional(),
  sms_opt_out: z.boolean().optional(),
  account_id: z.string().optional().or(z.literal(''))
});

// Type for the form data
import type { AccountData, AccountFormData } from './types';

// Wrapper component that provides the DrawerContext
// Address Create Drawer Component
interface AddressCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddressFormData) => void;
  initialData?: AddressFormData;
}

// Contact Create Drawer Component
interface ContactCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  initialData?: ContactFormData;
  onSaveSuccess?: () => void;
}

function AddressCreateDrawer({ open, onClose, onSave, initialData }: AddressCreateDrawerProps) {
  const { t } = useTranslation();
  
  // View/Edit mode state
  const [isViewMode, setIsViewMode] = useState(initialData ? true : false);
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>(initialData ? 'view' : 'edit');
  
  // Default values for the form
  const defaultValues: AddressFormData = {
    address_type: 'Billing',
    street_1: '',
    street_2: '',
    street_3: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US', // ISO 2 code for United States
    is_default: false,
    is_billing: true,
    is_shipping: false
  };
  
  // Initialize form with react-hook-form and zod validation
  const { 
    control, 
    handleSubmit, 
    formState: { errors, isValid, isDirty }, 
    reset,
    setValue,
    watch
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData || defaultValues,
    mode: 'onChange'
  });
  
  // Reset form when initialData changes (for editing) or when drawer opens/closes
  useEffect(() => {
    reset(initialData || defaultValues);
    // Set view mode if initialData exists, otherwise set to edit mode
    setIsViewMode(initialData ? true : false);
    setActiveSidebarItem(initialData ? 'view' : 'edit');
  }, [initialData, open, reset]);
  
  // Watch checkbox values to handle conditional logic
  const isDefault = watch('is_default');
  const isBilling = watch('is_billing');
  const isShipping = watch('is_shipping');
  
  // Handle checkbox changes with conditional logic
  const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewMode) return; // Prevent changes in view mode
    
    const { checked } = e.target;
    setValue('is_default', checked, { shouldValidate: true });
    
    // If setting as default, ensure at least one of billing or shipping is checked
    if (checked && !isBilling && !isShipping) {
      setValue('is_billing', true, { shouldValidate: true });
    }
  };
  
  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewMode) return; // Prevent changes in view mode
    
    const { checked } = e.target;
    setValue('is_billing', checked, { shouldValidate: true });
    
    // If this is the default address and unchecking billing, ensure shipping is checked
    if (isDefault && !checked && !isShipping) {
      setValue('is_shipping', true, { shouldValidate: true });
    }
  };
  
  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewMode) return; // Prevent changes in view mode
    
    const { checked } = e.target;
    setValue('is_shipping', checked, { shouldValidate: true });
    
    // If this is the default address and unchecking shipping, ensure billing is checked
    if (isDefault && !checked && !isBilling) {
      setValue('is_billing', true, { shouldValidate: true });
    }
  };
  
  // Sidebar icons for the drawer
  const drawerSidebarIcons = initialData ? [
    { 
      id: 'view', 
      icon: <VisibilityIcon fontSize="small" />, 
      tooltip: t('View'), 
      onClick: () => {
        setIsViewMode(true);
        setActiveSidebarItem('view');
      }
    },
    { 
      id: 'edit', 
      icon: <EditIcon fontSize="small" />, 
      tooltip: t('Edit'), 
      onClick: () => {
        setIsViewMode(false);
        setActiveSidebarItem('edit');
      }
    }
  ] : [];
  
  // Form submission handler
  const onSubmit = (data: AddressFormData) => {
    onSave(data);
  };
  
  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={initialData ? (isViewMode ? t('View Address') : t('Edit Address')) : t('Add Address')}
      onSave={isViewMode ? undefined : handleSubmit(onSubmit)}
      saveDisabled={isViewMode || !isValid || !isDirty}
      initialWidth={550}
      expandedWidth={550}
      sidebarIcons={drawerSidebarIcons}
      defaultSidebarItem={activeSidebarItem}
    >
      <Box component="form" noValidate>
        <Grid container spacing={2}>
          {/* Address Type */}
          <Grid item xs={12}>
            <Controller
              name="address_type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.address_type} disabled={isViewMode}>
                  <InputLabel id="address-type-label">{t('Address Type')} *</InputLabel>
                  <Select
                    {...field}
                    labelId="address-type-label"
                    label={t('Address Type') + ' *'}
                    size="small"
                    disabled={isViewMode}
                  >
                    <MenuItem value="BILLING">{t('Billing')}</MenuItem>
                    <MenuItem value="SHIPPING">{t('Shipping')}</MenuItem>
                    <MenuItem value="HOME">{t('Home')}</MenuItem>
                    <MenuItem value="BUSINESS">{t('Business')}</MenuItem>
                    <MenuItem value="OTHER">{t('Other')}</MenuItem>
                  </Select>
                  {errors.address_type && (
                    <FormHelperText>{t(errors.address_type.message || 'field.required')}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
          
          {/* Street 1 */}
          <Grid item xs={12}>
            <Controller
              name="street_1"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Street 1') + ' *'}
                  fullWidth
                  size="small"
                  required
                  disabled={isViewMode}
                  error={!!errors.street_1}
                  helperText={errors.street_1 ? t(errors.street_1.message || 'field.required') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Street 2 */}
          <Grid item xs={12}>
            <Controller
              name="street_2"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Street 2')}
                  size="small"
                  fullWidth
                  disabled={isViewMode}
                  error={!!errors.street_2}
                  helperText={errors.street_2 ? t(errors.street_2.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Street 3 */}
          <Grid item xs={12}>
            <Controller
              name="street_3"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Street 3')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.street_3}
                  helperText={errors.street_3 ? t(errors.street_3.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* City */}
          <Grid item xs={12}>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('City') + ' *'}
                  fullWidth
                  required
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.city}
                  helperText={errors.city ? t(errors.city.message || 'field.required') : ''}
                />
              )}
            />
          </Grid>
          
          {/* State/Province */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('State/Province')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.state}
                  helperText={errors.state ? t(errors.state.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Postal Code */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="postal_code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Postal Code') + ' *'}
                  fullWidth
                  size="small"
                  required
                  disabled={isViewMode}
                  error={!!errors.postal_code}
                  helperText={errors.postal_code ? t(errors.postal_code.message || 'field.required') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Country */}
          <Grid item xs={12}>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.country} disabled={isViewMode}>
                  <InputLabel id="country-label">{t('Country')} *</InputLabel>
                  <Select
                    {...field}
                    labelId="country-label"
                    label={t('Country') + ' *'}
                    size="small"
                    disabled={isViewMode}
                  >
                    <MenuItem value="US">{t('United States (US)')}</MenuItem>
                    <MenuItem value="CA">{t('Canada')}</MenuItem>
                    <MenuItem value="GB">{t('United Kingdom (UK)')}</MenuItem>
                    <MenuItem value="AU">{t('Australia')}</MenuItem>
                    <MenuItem value="IN">{t('India')}</MenuItem>
                    <MenuItem value="DE">{t('Germany')}</MenuItem>
                    <MenuItem value="FR">{t('France')}</MenuItem>
                  </Select>
                  {errors.country && (
                    <FormHelperText>{t(errors.country.message || 'field.required')}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
          
          {/* Checkboxes */}
          <Grid item xs={12}>
            <Stack spacing={1}>
              <Controller
                name="is_default"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value}
                        onChange={handleDefaultChange}
                        disabled={isViewMode}
                      />
                    }
                    label={t('Set as Default Address')}
                  />
                )}
              />
              <Controller
                name="is_billing"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value}
                        onChange={handleBillingChange}
                        disabled={isViewMode}
                      />
                    }
                    label={t('Set as Primary Billing Address')}
                  />
                )}
              />
              <Controller
                name="is_shipping"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value}
                        onChange={handleShippingChange}
                        disabled={isViewMode}
                      />
                    }
                    label={t('Set as Primary Shipping Address')}
                  />
                )}
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AnimatedDrawer>
  );
}

function ContactCreateDrawer({ open, onClose, onSave, initialData, onSaveSuccess }: ContactCreateDrawerProps) {
  const { t } = useTranslation();
  
  // View/Edit mode state
  const [isViewMode, setIsViewMode] = useState(initialData ? true : false);
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>(initialData ? 'view' : 'edit');
  
  // Fetch users for owner dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/api/v1/users/', {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: open
  });
  
  // Default values for the form
  const defaultValues: ContactFormData = {
    first_name: '',
    last_name: '',
    email: '',
    secondary_email: '',
    mobile_phone: '',
    work_phone: '',
    job_title: '',
    department: '',
    status: 'Active',
    owner: '',
    description: '',
    is_primary: false,
    email_opt_out: false,
    do_not_call: false,
    sms_opt_out: false,
    account_id: ''
  };
  
  // Initialize form with react-hook-form and zod validation
  const { 
    control, 
    handleSubmit, 
    formState: { errors, isValid, isDirty }, 
    reset,
    setValue,
    watch
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: initialData || defaultValues,
    mode: 'onChange'
  });
  
  // Reset form when initialData changes (for editing) or when drawer opens/closes
  useEffect(() => {
    reset(initialData || defaultValues);
    // Set view mode if initialData exists, otherwise set to edit mode
    setIsViewMode(initialData ? true : false);
    setActiveSidebarItem(initialData ? 'view' : 'edit');
  }, [initialData, open, reset]);
  
  // Mutations for creating and updating contacts
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await api.post('/api/v1/contacts/', data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(t('Contact created successfully'));
      onSave(data);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creating contact:', error);
      toast.error(error.response?.data?.detail || t('Error creating contact'));
      
      // Set field-specific errors if available
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        Object.keys(apiErrors).forEach((field) => {
          if (field in contactSchema.shape) {
            // Use type-safe way to set field values
            setValue(field as any, watch(field as any), {
              shouldValidate: true
            });
          }
        });
      }
    }
  });

  const updateContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await api.put(`/api/v1/contacts/${initialData?.id}/`, data, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(t('Contact updated successfully'));
      onSave(data);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating contact:', error);
      toast.error(error.response?.data?.detail || t('Error updating contact'));
      
      // Set field-specific errors if available
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        Object.keys(apiErrors).forEach((field) => {
          if (field in contactSchema.shape) {
            // Use type-safe way to set field values
            setValue(field as any, watch(field as any), {
              shouldValidate: true
            });
          }
        });
      }
    }
  });
  
  // Sidebar icons for the drawer
  const drawerSidebarIcons = initialData ? [
    { 
      id: 'view', 
      icon: <VisibilityIcon fontSize="small" />, 
      tooltip: t('View'), 
      onClick: () => {
        setIsViewMode(true);
        setActiveSidebarItem('view');
      }
    },
    { 
      id: 'edit', 
      icon: <EditIcon fontSize="small" />, 
      tooltip: t('Edit'), 
      onClick: () => {
        setIsViewMode(false);
        setActiveSidebarItem('edit');
      }
    }
  ] : [];
  
  // Form submission handler
  const onSubmit = (data: ContactFormData) => {
    // Check if the drawer was opened in the context of an EXISTING account
    if (initialData?.id) {
      // Editing an existing Contact related to the existing Account
      updateContactMutation.mutate(
        { id: initialData.id, ...data },
        {
          onSuccess: () => {
            // Use onSaveSuccess if it exists, otherwise use onSave
            if (onSaveSuccess) {
              onSaveSuccess(); // Callback to trigger refresh in parent
            } else {
              onSave(data); // Fallback to onSave for backward compatibility
            }
            onClose();
          },
          onError: (error: any) => {
            // Show error notification (already handled in mutation definition)
            console.error("Failed to update contact:", error);
          },
        }
      );
    } else {
      // Creating a new Contact related to the existing Account
      createContactMutation.mutate(data, {
        onSuccess: () => {
          // Use onSaveSuccess if it exists, otherwise use onSave
          if (onSaveSuccess) {
            onSaveSuccess(); // Callback to trigger refresh
          } else {
            onSave(data); // Fallback to onSave for backward compatibility
          }
          onClose();
        },
        onError: (error: any) => {
          // Show error notification (already handled in mutation definition)
          console.error("Failed to create contact:", error);
        },
      });
    }
  };
  
  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={initialData ? (isViewMode ? t('View Contact') : t('Edit Contact')) : t('Add Contact')}
      onSave={isViewMode ? undefined : handleSubmit(onSubmit)}
      saveDisabled={isViewMode || !isValid || !isDirty || (createContactMutation.isPending || updateContactMutation.isPending)}
      initialWidth={550}
      expandedWidth={550}
      sidebarIcons={drawerSidebarIcons}
      defaultSidebarItem={activeSidebarItem}
    >
      <Box component="form" noValidate>
        <Grid container spacing={2}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('Basic Information')}
            </Typography>
          </Grid>
          {/* First Name */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('First Name') + ' *'}
                  fullWidth
                  size="small"
                  required
                  disabled={isViewMode}
                  error={!!errors.first_name}
                  helperText={errors.first_name ? t(errors.first_name.message || 'field.required') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Last Name */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Last Name')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.last_name}
                  helperText={errors.last_name ? t(errors.last_name.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Email */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Email')}
                  fullWidth
                  size="small"
                  type="email"
                  disabled={isViewMode}
                  error={!!errors.email}
                  helperText={errors.email ? t(errors.email.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Secondary Email */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="secondary_email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Secondary Email')}
                  fullWidth
                  size="small"
                  type="email"
                  disabled={isViewMode}
                  error={!!errors.secondary_email}
                  helperText={errors.secondary_email ? t(errors.secondary_email.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Contact Information */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('Contact Information')}
            </Typography>
          </Grid>
          
          {/* Mobile Phone */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="mobile_phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Mobile Phone')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.mobile_phone}
                  helperText={errors.mobile_phone ? t(errors.mobile_phone.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Work Phone */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="work_phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Work Phone')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.work_phone}
                  helperText={errors.work_phone ? t(errors.work_phone.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Job Title */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="job_title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Job Title')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.job_title}
                  helperText={errors.job_title ? t(errors.job_title.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Department */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Department')}
                  fullWidth
                  size="small"
                  disabled={isViewMode}
                  error={!!errors.department}
                  helperText={errors.department ? t(errors.department.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Status */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.status} disabled={isViewMode}>
                  <InputLabel id="contact-status-label">{t('Status')} *</InputLabel>
                  <Select
                    {...field}
                    labelId="contact-status-label"
                    label={t('Status') + ' *'}
                    size="small"
                    disabled={isViewMode}
                  >
                    <MenuItem value="Active">{t('Active')}</MenuItem>
                    <MenuItem value="Inactive">{t('Inactive')}</MenuItem>
                  </Select>
                  {errors.status && (
                    <FormHelperText>{t(errors.status.message || 'field.required')}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
          
          {/* Owner */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="owner"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.owner} disabled={isViewMode}>
                  <InputLabel id="contact-owner-label">{t('Owner')}</InputLabel>
                  <Select
                    {...field}
                    labelId="contact-owner-label"
                    label={t('Owner')}
                    size="small"
                    disabled={isViewMode}
                  >
                    {users?.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.full_name || user.username}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.owner && (
                    <FormHelperText>{t(errors.owner.message || 'field.required')}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
          
          {/* Description */}
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Description')}
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  disabled={isViewMode}
                  error={!!errors.description}
                  helperText={errors.description ? t(errors.description.message || '') : ''}
                />
              )}
            />
          </Grid>
          
          {/* Communication Preferences */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('Communication Preferences')}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Stack spacing={1}>
              <Controller
                name="is_primary"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value || false}
                        disabled={isViewMode}
                      />
                    }
                    label={t('Set as Primary Contact')}
                  />
                )}
              />
              
              <Controller
                name="email_opt_out"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value || false}
                        disabled={isViewMode}
                      />
                    }
                    label={t('Email Opt Out')}
                  />
                )}
              />
              
              <Controller
                name="do_not_call"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value || false}
                        disabled={isViewMode}
                      />
                    }
                    label={t('Do Not Call')}
                  />
                )}
              />
              
              <Controller
                name="sms_opt_out"
                control={control}
                render={({ field: { value, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={value || false}
                        disabled={isViewMode}
                      />
                    }
                    label={t('SMS Opt Out')}
                  />
                )}
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AnimatedDrawer>
  );
}

// Main component that uses the DrawerContext
interface AccountFormProps {
  initialData?: Partial<AccountFormData>;
  accountId?: string | null;
  formSubmit: (data: Partial<AccountFormData>) => void;
  isSaving: boolean;
}

export function AccountForm({ 
  initialData, 
  accountId, 
  formSubmit, 
  isSaving 
}: AccountFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState<Entity | null>(null);
  
  // Address management state
  const [addresses, setAddresses] = useState<AddressFormData[]>([]);
  const [isAddressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  
  // Contact management state
  const [contacts, setContacts] = useState<ContactFormData[]>([]);
  const [isContactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  // Fetch custom field definitions for Account object
  const { data: customFieldDefinitions, isLoading: isLoadingCustomFields, error: customFieldsError } = useQuery({
    queryKey: ['customFieldDefinitions', 'Account'],
    queryFn: async () => {
      const response = await api.get(`${entityEndpoints.customFieldDefinitions}?object_type=Account&is_active=true`, {
        headers: getAuthHeaders()
      });
      return response.data.results as CustomFieldDefinition[];
    }
  });
  
  // Fetch account data including related addresses and contacts
  const { isLoading: accountLoading, error: accountError } = useFetchAccount(accountId);

  // Fetch addresses
  const { data: addressesData, isLoading: addressesLoading, error: addressesError } = useQuery<AddressData[]>({
    queryKey: ['addresses', accountId],
    queryFn: async () => {
      const response = await api.get(`accounts/${accountId}/addresses/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!accountId
  });

  // Fetch contacts
  const { data: contactsData, isLoading: contactsLoading, error: contactsError } = useQuery<ContactData[]>({
    queryKey: ['contacts', accountId],
    queryFn: async () => {
      const response = await api.get(`accounts/${accountId}/contacts/`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!accountId
  });

  // Combine loading states
  const isLoading = accountLoading || addressesLoading || contactsLoading;
  const error = accountError || addressesError || contactsError;

  // Initialize form with react-hook-form and zod validation
  const defaultValues = useMemo(() => ({
    id: initialData?.id || '',
    name: initialData?.name || '',
    status: initialData?.status || 'Active',
    customer_group: initialData?.customer_group || '',
    parent_account: initialData?.parent_account || '',
    account_number: initialData?.account_number || '',
    owner: initialData?.owner || '',
    website: initialData?.website || '',
    primary_phone: initialData?.primary_phone || '',
    customer_reference: initialData?.customer_reference || '',
    account_type: initialData?.account_type || '',
    contract_start_date: initialData?.contract_start_date ? dayjs(initialData.contract_start_date) : undefined,
    vat_exempt: initialData?.vat_exempt || false,
    legal_name: initialData?.legal_name || '',
    industry: initialData?.industry || '',
    company_size: initialData?.company_size || '',
    tax_id: initialData?.tax_id || '',
    description: initialData?.description || '',
    custom_fields: initialData?.custom_fields || {},
    addresses: addressesData || [],
    contacts: contactsData || []
  }), [initialData, addressesData, contactsData]);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues,
    mode: 'onChange'
  });
  
  // Watch customer_group to conditionally render parent_account field
  const customerGroupId = form.watch('customer_group');
  
  // Check customer group types for conditional rendering (handle both uppercase and title case)
  const groupType = selectedCustomerGroup?.['group_type']?.toUpperCase();
  const isIndividualGroup = groupType === 'INDIVIDUAL';
  const isBusinessOrGovernmentGroup = 
    groupType === 'BUSINESS' || 
    groupType === 'GOVERNMENT';

  // Address management functions
  const handleAddressDrawerSave = (addressData: AddressFormData) => {
    if (editingAddressIndex !== null) {
      // Update existing address
      setAddresses(current => {
        const updated = [...current];
        updated[editingAddressIndex] = addressData;
        return updated;
      });
    } else {
      // Add new address
      setAddresses(current => [...current, addressData]);
    }
    
    // Reset editing state and close drawer
    setEditingAddressIndex(null);
    setAddressDrawerOpen(false);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(current => current.filter((_, i) => i !== index));
  };

  // Contact management functions
  const handleContactDrawerSave = (contactData: ContactFormData) => {
    if (editingContactIndex !== null) {
      // Update existing contact
      setContacts(current => {
        const updated = [...current];
        updated[editingContactIndex] = contactData;
        return updated;
      });
    } else {
      // Add new contact
      setContacts(current => [...current, contactData]);
    }
    
    // Reset editing state and close drawer
    setEditingContactIndex(null);
    setContactDrawerOpen(false);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(current => current.filter((_, i) => i !== index));
  };

  // Account creation mutation
  const accountCreateMutation = useCreateAccount();

  // Account update mutation
  const accountUpdateMutation = useUpdateAccount();

  // Validate custom fields based on definitions
  const validateCustomFields = (data: AccountFormData): boolean => {
    if (!customFieldDefinitions) return true;
    
    let isValid = true;
    const customFields = data.custom_fields || {};
    
    // Check required fields
    customFieldDefinitions.forEach(field => {
      if (field.is_required && !customFields[field.field_name]) {
        // Use type-safe way to set field values
        form.setValue(`custom_fields.${field.field_name}` as any, customFields[field.field_name], {
          shouldValidate: true
        });
        // Use type-safe way to set field errors
        form.setError(`custom_fields.${field.field_name}` as any, {
          type: 'required',
          message: t('accountCreatePage.customFields.requiredField')
        });
        isValid = false;
      }
    });
    
    return isValid;
  };

  // Form submission handler
  const onSubmit = (data: AccountFormData) => {
    // Validate custom fields
    if (!validateCustomFields(data)) {
      // Show validation error
      setSnackbar({
        open: true,
        message: t('accountCreatePage.customFields.validationError'),
        severity: 'error'
      });
      return;
    }

    // Format dates properly for API
    if (data.contract_start_date && typeof data.contract_start_date !== 'string') {
      // Handle both Dayjs and Date objects
      if (typeof (data.contract_start_date as any).toISOString === 'function') {
        data.contract_start_date = (data.contract_start_date as any).toISOString();
      } else if (typeof (data.contract_start_date as any).$d === 'object') {
        // Handle Dayjs object
        data.contract_start_date = (data.contract_start_date as any).$d.toISOString();
      }
    }

    // Format custom field dates
    if (data.custom_fields) {
      Object.keys(data.custom_fields).forEach(key => {
        const fieldDef = customFieldDefinitions?.find(f => f.field_name === key);
        const value = data.custom_fields?.[key];
        
        if (fieldDef && (fieldDef.field_type === 'DATE' || fieldDef.field_type === 'DATETIME') && value && typeof value !== 'string') {
          // Handle both Dayjs and Date objects
          if (typeof (value as any).toISOString === 'function') {
            data.custom_fields[key] = (value as any).toISOString();
          } else if (typeof (value as any).$d === 'object') {
            // Handle Dayjs object
            data.custom_fields[key] = (value as any).$d.toISOString();
          }
        }
      });
    }

    // Submit the data
    if (accountId) {
      accountUpdateMutation.mutate({ id: Number(accountId), data });
    } else {
      accountCreateMutation.mutate(data);
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      
      {/* Account Form */}
      <form id="account-create-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Left Column - 70% width */}
          <Grid item xs={12} md={8} lg={9}>
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
                <Grid item xs={12}>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('field.name')}
                        fullWidth
                        required
                        size="small"
                        error={!!form.formState.errors.name}
                        helperText={form.formState.errors.name?.message ? String(form.formState.errors.name.message) : undefined}
                      />
                    )}
                  />
                </Grid>
                
                {/* Parent Account - Hidden for Individual customer groups */}
                <Grid item xs={12}>
                  <EntityAutocomplete
                    name="parent_account"
                    control={form.control}
                    label={t('Parent Account')}
                    apiEndpoint={entityEndpoints.accounts}
                    disabled={isIndividualGroup}
                    getOptionLabel={(option) => option?.name || ''}
                    error={!!form.formState.errors.parent_account}
                    helperText={form.formState.errors.parent_account?.message ? String(form.formState.errors.parent_account.message) : undefined}
                    onChange={async (value) => {
                      if (value) {
                        try {
                          // Fetch the parent account details to get its customer group
                          // Ensure there's no double slash in the URL
                          const endpoint = entityEndpoints.accounts.endsWith('/') 
                            ? `${entityEndpoints.accounts}${value.id}` 
                            : `${entityEndpoints.accounts}/${value.id}`;
                          const response = await api.get(endpoint, {
                            headers: getAuthHeaders()
                          });
                          
                          if (response.data && response.data.customer_group) {
                            // Set the customer group from the parent account
                            // We need to reset the field first to ensure the UI updates
                            form.setValue('customer_group', ''); // Use empty string instead of null
                            // Store the full object in selectedCustomerGroup for display purposes
                            setSelectedCustomerGroup(response.data.customer_group);
                            // Then set the actual value with just the ID for form submission
                            setTimeout(() => {
                              form.setValue('customer_group', response.data.customer_group.id);
                            }, 0);
                          }
                        } catch (error) {
                          console.error('Error fetching parent account details:', error);
                        }
                      } else {
                        // Clear customer group if parent account is removed
                        form.setValue('customer_group', ''); // Use empty string instead of null
                        setSelectedCustomerGroup(null);
                      }
                    }}
                  />
                </Grid>
                
                {/* Customer Group */}
                <Grid item xs={12} >
                  <EntityAutocomplete
                    name="customer_group"
                    label={t('Customer Group')}
                    control={form.control}
                    apiEndpoint={entityEndpoints.customerGroups}
                    required
                    disabled={!!form.watch('parent_account')} // Disable if parent account is selected
                    error={!!form.formState.errors.customer_group}
                    helperText={form.watch('parent_account') 
                      ? t('accountCreatePage.customerGroupInheritanceMessage') 
                      : form.formState.errors.customer_group?.message ? String(form.formState.errors.customer_group.message) : undefined}
                    getOptionLabel={(option) => option?.group_name || ''}
                    onChange={(value) => {
                      if (!form.watch('parent_account')) { // Only allow changing if no parent account
                        setSelectedCustomerGroup(value);
                      }
                    }}
                  />
                </Grid>
                
                {/* Account Number */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="account_number"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('Account Number')}
                        fullWidth
                        size="small"
                        error={!!form.formState.errors.account_number}
                        helperText={form.formState.errors.account_number?.message ? String(form.formState.errors.account_number.message) : undefined}
                      />
                    )}
                  />
                </Grid>
                
                {/* Status */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <FormControl fullWidth required error={!!form.formState.errors.status}>
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
                        {form.formState.errors.status && (
                          <FormHelperText>{form.formState.errors.status.message ? String(form.formState.errors.status.message) : undefined}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                
                {/* Owner */}
                <Grid item xs={12}>
                  <EntityAutocomplete
                    name="owner"
                    control={form.control}
                    label={t('Owner')}
                    apiEndpoint={entityEndpoints.users}
                    getOptionLabel={(option) => option?.full_name || option?.username || ''}
                    error={!!form.formState.errors.owner}
                    helperText={form.formState.errors.owner?.message ? String(form.formState.errors.owner.message) : undefined}
                  />
                </Grid>
                
                {/* Website */}
                <Grid item xs={12}>
                  <Controller
                    name="website"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('Website')}
                        fullWidth
                        size="small"
                        type="url"
                        error={!!form.formState.errors.website}
                        helperText={form.formState.errors.website?.message ? String(form.formState.errors.website.message) : undefined}
                      />
                    )}
                  />
                </Grid>
                
                {/* Primary Phone */}
                <Grid item xs={12}>
                  <Controller
                    name="primary_phone"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('Primary Phone')}
                        fullWidth
                        size="small"
                        type="tel"
                        error={!!form.formState.errors.primary_phone}
                        helperText={form.formState.errors.primary_phone?.message ? String(form.formState.errors.primary_phone.message) : undefined}
                      />
                    )}
                  />
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
                  <Grid item xs={12}>
                    <Controller
                      name="legal_name"
                      control={form.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('Legal Name')}
                          fullWidth
                          size="small"
                          error={!!form.formState.errors.legal_name}
                          helperText={form.formState.errors.legal_name?.message ? String(form.formState.errors.legal_name.message) : undefined}
                        />
                      )}
                    />
                  </Grid>
                  
                  {/* Industry */}
                  <Grid item xs={12}>
                    <Controller
                      name="industry"
                      control={form.control}
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
                  </Grid>
                  
                  {/* Company Size */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="company_size"
                      control={form.control}
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
                  </Grid>
                  
                  {/* Tax ID */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="tax_id"
                      control={form.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={t('Tax ID')}
                          fullWidth
                          size="small"
                          error={!!form.formState.errors.tax_id}
                          helperText={form.formState.errors.tax_id?.message ? String(form.formState.errors.tax_id.message) : undefined}
                        />
                      )}
                    />
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
              
              <Controller
                name="description"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('Description')}
                    fullWidth
                    multiline
                    rows={4}
                    size="small"
                    error={!!form.formState.errors.description}
                    helperText={form.formState.errors.description?.message ? String(form.formState.errors.description.message) : undefined}
                  />
                )}
              />
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
                <Button 
                  variant="outlined" 
                  color="primary"
                  size="small"
                  startIcon={<AddLocationAltIcon />}
                  onClick={() => {
                    setEditingAddressIndex(null);
                    setAddressDrawerOpen(true);
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  {t('Add Address')}
                </Button>
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
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }
                      }}
                      onClick={() => {
                        setEditingAddressIndex(index);
                        setAddressDrawerOpen(true);
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {address.address_type}
                          {address.is_default && (
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
                          {address.street_1}{address.street_2 ? `, ${address.street_2}` : ''}, {address.city}, {address.state || ''} {address.postal_code}, {address.country}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {address.is_billing && (
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
                          {address.is_shipping && (
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
                      <Box onClick={(e) => e.stopPropagation()}>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleRemoveAddress(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
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
                {isBusinessOrGovernmentGroup && (
                  <Button 
                    variant="outlined" 
                    color="primary"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setEditingContactIndex(null);
                      setContactDrawerOpen(true);
                    }}
                    sx={{ textTransform: 'none' }}
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
                              {contact.is_primary && (
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
                          <Box>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => {
                                setEditingContactIndex(index);
                                setContactDrawerOpen(true);
                              }}
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
            
            {/* Custom Fields Section */}
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ p: 3, mb: 3 }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('accountCreatePage.sections.customFields')}
              </Typography>
              
              {isLoadingCustomFields ? (
                // Loading state
                <Box sx={{ py: 2 }}>
                  <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" width="100%" height={56} />
                </Box>
              ) : customFieldsError ? (
                // Error state
                <Alert severity="error" sx={{ mb: 2 }}>
                  {t('accountCreatePage.customFields.errorLoading')}
                </Alert>
              ) : !customFieldDefinitions || customFieldDefinitions.length === 0 ? (
                // No custom fields
                <Typography variant="body2" color="text.secondary">
                  {t('accountCreatePage.customFields.noFieldsDefined')}
                </Typography>
              ) : (
                // Render custom fields
                <Grid container spacing={2}>
                  {customFieldDefinitions.map((field) => (
                    <Grid item xs={12} sm={field.field_type === 'TEXTAREA' ? 12 : 6} key={field.id}>
                      <Controller
                        name={`custom_fields.${field.field_name}`}
                        control={form.control}
                        defaultValue={field.default_value || ''}
                        render={({ field: { onChange, value, name } }) => {
                          // Render different components based on field type
                          switch (field.field_type) {
                            case 'TEXT':
                              return (
                                <TextField
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || ''}
                                  onChange={onChange}
                                  fullWidth
                                  size="small"
                                  required={field.is_required}
                                  placeholder={field.placeholder}
                                  helperText={field.help_text}
                                  inputProps={{
                                    maxLength: field.max_length
                                  }}
                                  error={!!form.formState.errors.custom_fields?.[field.field_name]}
                                />
                              );
                              
                            case 'TEXTAREA':
                              return (
                                <TextField
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || ''}
                                  onChange={onChange}
                                  fullWidth
                                  multiline
                                  rows={3}
                                  size="small"
                                  required={field.is_required}
                                  placeholder={field.placeholder}
                                  helperText={field.help_text}
                                  inputProps={{
                                    maxLength: field.max_length
                                  }}
                                  error={!!form.formState.errors.custom_fields?.[field.field_name]}
                                />
                              );
                              
                            case 'NUMBER':
                              return (
                                <TextField
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*$/.test(val)) {
                                      onChange(val === '' ? '' : Number(val));
                                    }
                                  }}
                                  fullWidth
                                  type="number"
                                  size="small"
                                  required={field.is_required}
                                  placeholder={field.placeholder}
                                  helperText={field.help_text}
                                  inputProps={{
                                    min: field.min_value,
                                    max: field.max_value
                                  }}
                                  error={!!form.formState.errors.custom_fields?.[field.field_name]}
                                />
                              );
                              
                            case 'CURRENCY':
                              return (
                                <TextField
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                                      onChange(val === '' ? '' : Number(val));
                                    }
                                  }}
                                  fullWidth
                                  type="number"
                                  size="small"
                                  required={field.is_required}
                                  placeholder={field.placeholder}
                                  helperText={field.help_text}
                                  InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                                  }}
                                  inputProps={{
                                    min: field.min_value,
                                    max: field.max_value,
                                    step: 0.01
                                  }}
                                  error={!!form.formState.errors.custom_fields?.[field.field_name]}
                                />
                              );
                              
                            case 'DATE':
                              return (
                                <DatePicker
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || null}
                                  onChange={onChange}
                                  slotProps={{
                                    textField: {
                                      fullWidth: true,
                                      size: "small",
                                      required: field.is_required,
                                      helperText: field.help_text,
                                      error: !!form.formState.errors.custom_fields?.[field.field_name]
                                    }
                                  }}
                                />
                              );
                              
                            case 'DATETIME':
                              return (
                                <DateTimePicker
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || null}
                                  onChange={onChange}
                                  slotProps={{
                                    textField: {
                                      fullWidth: true,
                                      size: "small",
                                      required: field.is_required,
                                      helperText: field.help_text,
                                      error: !!form.formState.errors.custom_fields?.[field.field_name]
                                    }
                                  }}
                                />
                              );
                              
                            case 'CHECKBOX':
                              return (
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      size="small"
                                    />
                                  }
                                  label={
                                    <>
                                      {field.label}
                                      {field.is_required && (
                                        <Typography component="span" color="error.main">*</Typography>
                                      )}
                                    </>
                                  }
                                />
                              );
                              
                            case 'PICKLIST':
                              return (
                                <FormControl 
                                  fullWidth 
                                  size="small"
                                  required={field.is_required}
                                  error={!!form.formState.errors.custom_fields?.[field.field_name]}
                                >
                                  <InputLabel id={`custom-field-${field.field_name}-label`}>
                                    {field.label + (field.is_required ? ' *' : '')}
                                  </InputLabel>
                                  <Select
                                    labelId={`custom-field-${field.field_name}-label`}
                                    value={value || ''}
                                    onChange={onChange}
                                    label={field.label + (field.is_required ? ' *' : '')}
                                  >
                                    {field.picklist_values?.map((option) => (
                                      <MenuItem key={option} value={option}>
                                        {option}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                  {field.help_text && (
                                    <FormHelperText>{field.help_text}</FormHelperText>
                                  )}
                                </FormControl>
                              );
                              
                            default:
                              return (
                                <TextField
                                  label={field.label + (field.is_required ? ' *' : '')}
                                  value={value || ''}
                                  onChange={onChange}
                                  fullWidth
                                  size="small"
                                  required={field.is_required}
                                  error={!!form.formState.errors.custom_fields?.[field.field_name]}
                                />
                              );
                          }
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
            
            {/* Address Create Drawer */}
            <AddressCreateDrawer 
                open={isAddressDrawerOpen}
                onClose={() => setAddressDrawerOpen(false)}
                onSave={handleAddressDrawerSave}
                initialData={editingAddressIndex !== null ? addresses[editingAddressIndex] : undefined}
              />
            
            {/* Contact Create Drawer */}
            <ContactCreateDrawer 
                open={isContactDrawerOpen}
                onClose={() => setContactDrawerOpen(false)}
                onSave={handleContactDrawerSave}
                initialData={editingContactIndex !== null ? contacts[editingContactIndex] : undefined}
                onSaveSuccess={() => {
                  if (accountId) {
                    queryClient.invalidateQueries({
                      queryKey: ['accountDetail', accountId] as const
                    });
                  }
                }}
              />
          </Grid>
          
          {/* Right Column - 30% width */}
          <Grid item xs={12} md={4} lg={3}>
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
                <Grid item xs={12}>
                  <Controller
                    name="customer_reference"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('Customer Reference')}
                        fullWidth
                        size="small"
                        error={!!form.formState.errors.customer_reference}
                        helperText={form.formState.errors.customer_reference?.message ? String(form.formState.errors.customer_reference.message) : undefined}
                      />
                    )}
                  />
                </Grid>
                
                {/* Account Type */}
                <Grid item xs={12}>
                  <Controller
                    name="account_type"
                    control={form.control}
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
                </Grid>
                
                {/* Contract Start Date */}
                <Grid item xs={12}>
                  <Controller
                    name="contract_start_date"
                    control={form.control}
                    render={({ field }) => (
                      <DatePicker
                        label={t('Contract Start Date')}
                        value={field.value}
                        onChange={(date: any) => field.onChange(date)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            error: !!form.formState.errors.contract_start_date,
                            helperText: form.formState.errors.contract_start_date?.message ? String(form.formState.errors.contract_start_date.message) : undefined
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
                
                {/* VAT Exempt */}
                <Grid item xs={12}>
                  <Controller
                    name="vat_exempt"
                    control={form.control}
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
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

// Default export for backward compatibility
export default function AccountFormWrapper() {
  const [isSaving, setIsSaving] = useState(false);
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DrawerProvider>
        <AccountForm 
          formSubmit={() => {}} 
          isSaving={isSaving}
        />
      </DrawerProvider>
    </LocalizationProvider>
  );
}
