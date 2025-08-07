/**
 * Product Status Form Component
 * 
 * Form for creating and editing product statuses in the catalogue
 */
import React, { forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Typography
} from '@mui/material';
import { productStatusSchema, ProductStatusFormValues } from '../schemas';
import { ProductStatus } from '@/app/types/catalogue';
import { useTranslation } from 'react-i18next';
interface ProductStatusFormProps {
  defaultValues?: Partial<ProductStatus>;
  onSubmit: (data: ProductStatusFormValues) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const ProductStatusForm = forwardRef<{ submitForm: () => void }, ProductStatusFormProps>(({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  readOnly = false
}, ref) => {
  // Check if we're in edit mode (has an existing id) or create mode
  const isEditMode = !!defaultValues?.id;

  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ProductStatusFormValues>({
    resolver: zodResolver(productStatusSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      is_active: defaultValues?.is_active ?? true,
      is_orderable: defaultValues?.is_orderable ?? true
    }
  });

  // Custom submit handler to remove is_active in create mode
  const handleFormSubmit = (data: ProductStatusFormValues) => {
    if (!isEditMode) {
      // In create mode, remove is_active from the data being sent
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { is_active, ...dataWithoutIsActive } = data;
      onSubmit(dataWithoutIsActive as ProductStatusFormValues);
    } else {
      // In edit mode, send all data including is_active
      onSubmit(data);
    }
  };

  // Expose the submitForm method to parent components via ref
  useImperativeHandle(ref, () => ({
    submitForm: () => handleSubmit(handleFormSubmit)()
  }));

  return (
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>   
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('name', 'Status Name')}
                  fullWidth
                  required
                  size='small'
                  error={!readOnly && !!errors.name}
                  helperText={!readOnly && errors.name?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('description', 'Description')}
                  fullWidth
                  multiline
                  rows={3}
                  error={!readOnly && !!errors.description}
                  helperText={!readOnly && errors.description?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 6 }}>
          <Controller
                  name="is_orderable"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={readOnly}
                        />
                      }
                      label={t('orderable', 'Orderable')}
                      title="Products with this status can be ordered by customers"
                    />
                  )}
                />
          </Grid>
          
          {/* Only show is_active field in edit mode */}
          {isEditMode && (
            <Grid size={{ xs: 6 }}>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={readOnly}
                        />
                      }
                      label={t('active', 'Active')}
                    />
                  )}
                />
              
            </Grid>
          )}
          
          
        </Grid>
      </Box>
  );
});

export default ProductStatusForm;
