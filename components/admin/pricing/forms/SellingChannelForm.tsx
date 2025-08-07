/**
 * Selling Channel Form Component
 * 
 * Form for creating and editing selling channels
 */
import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Paper,
  FormHelperText
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { sellingChannelSchema, SellingChannelFormValues } from '../schemas';
import { useDrawer } from '@/app/contexts/DrawerContext';

// Add a ref type for exposing form methods
export interface SellingChannelFormRef {
  submitForm: () => void;
  getValues: () => SellingChannelFormValues;
  reset: () => void;
}

interface SellingChannelFormProps {
  onSubmit: (data: SellingChannelFormValues) => void;
  defaultValues?: Partial<SellingChannelFormValues>;
  isEditMode?: boolean;
  isLoading?: boolean;
  isViewMode?: boolean;
}

const SellingChannelForm = forwardRef<SellingChannelFormRef, SellingChannelFormProps>(({ 
  onSubmit, 
  defaultValues = {}, 
  isEditMode = false,
  isLoading = false,
  isViewMode = false
}, ref) => {
  const { t } = useTranslation();
  const drawerContext = useDrawer();
  
  // Form setup with default values
  const form = useForm<SellingChannelFormValues>({
    resolver: zodResolver(sellingChannelSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      code: defaultValues?.code || '',
      description: defaultValues?.description || '',
      is_active: defaultValues?.is_active ?? true,
    },
  });

  // Update form values when defaultValues change
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      // Only reset if we have actual data and if the values are different
      const currentValues = form.getValues();
      const hasChanged = 
        defaultValues.name !== currentValues.name || 
        defaultValues.code !== currentValues.code || 
        defaultValues.description !== currentValues.description || 
        defaultValues.is_active !== currentValues.is_active;
      
      if (hasChanged) {
        form.reset({
          name: defaultValues.name || '',
          code: defaultValues.code || '',
          description: defaultValues.description || '',
          is_active: defaultValues.is_active ?? true,
        });
      }
    }
  }, [defaultValues]);

  // Update form with data from context when switching modes
  useEffect(() => {
    const contextData = drawerContext.formData;
    if (Object.keys(contextData).length > 0 && contextData.name) {
      // Only update if we have meaningful data in context and if it's different
      const currentValues = form.getValues();
      const hasChanged = 
        contextData.name !== currentValues.name || 
        contextData.code !== currentValues.code || 
        contextData.description !== currentValues.description || 
        contextData.is_active !== currentValues.is_active;
      
      if (hasChanged) {
        form.reset({
          name: contextData.name || currentValues.name || '',
          code: contextData.code || currentValues.code || '',
          description: contextData.description || currentValues.description || '',
          is_active: contextData.is_active ?? currentValues.is_active ?? true,
        });
      }
    }
  }, [drawerContext.activeSidebarItem]);

  // Expose form methods to parent via ref
  useImperativeHandle(ref, () => ({
    submitForm: () => form.handleSubmit(onSubmit)(),
    getValues: () => form.getValues(),
    reset: () => form.reset(),
  }));

  // Determine if fields should be disabled
  const isFieldDisabled = isLoading || isViewMode;
  
  // Debug logs
  console.log('SellingChannelForm Props:', { isViewMode, isLoading, isEditMode });
  console.log('Fields disabled:', isFieldDisabled);

  return (
      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }} >
            <Controller
              name="name"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('pricing.sellingChannel.name', 'Name')}
                  fullWidth
                  size='small'
                  required
                  error={!!form.formState.errors.name}
                  helperText={form.formState.errors.name?.message}
                  disabled={isFieldDisabled}
                  InputProps={{
                    readOnly: isFieldDisabled
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }} >
            <Controller
              name="code"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('pricing.sellingChannel.code', 'Code')}
                  fullWidth
                  size='small'
                  required
                  error={!!form.formState.errors.code}
                  helperText={form.formState.errors.code?.message}
                  disabled={isFieldDisabled}
                  InputProps={{
                    readOnly: isFieldDisabled
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('pricing.sellingChannel.description', 'Description')}
                  fullWidth
                  multiline
                  size='small'
                  rows={3}
                  error={!!form.formState.errors.description}
                  helperText={form.formState.errors.description?.message}
                  disabled={isFieldDisabled}
                  InputProps={{
                    readOnly: isFieldDisabled
                  }}
                />
              )}
            />
          </Grid>
          
          {isEditMode && (
            <Grid size={{ xs: 12 }}>
              <Controller
                name="is_active"
                control={form.control}
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        disabled={isFieldDisabled}
                        {...field}
                      />
                    }
                    label={t('pricing.sellingChannel.isActive', 'Active')}
                  />
                )}
              />
              {form.formState.errors.is_active && (
                <FormHelperText error>{form.formState.errors.is_active.message}</FormHelperText>
              )}
            </Grid>
          )}
        </Grid>
      </Box>
  );
});

export default SellingChannelForm;
