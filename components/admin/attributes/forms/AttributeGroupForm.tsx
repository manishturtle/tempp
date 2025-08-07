/**
 * Attribute Group Form Component
 * 
 * Form for creating and editing attribute groups
 */
import React, { forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  TextField,
  Button,
  Grid,
  Paper,
  FormHelperText,
  FormControlLabel,
  Switch
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { attributeGroupSchema, AttributeGroupFormValues } from '../schemas';
import { AttributeGroup } from '@/app/types/attributes';

interface AttributeGroupFormProps {
  initialValues?: AttributeGroup | null;
  defaultValues?: Partial<AttributeGroupFormValues>;
  onSubmit: (data: AttributeGroupFormValues) => void;
  isSubmitting?: boolean;
  isViewMode?: boolean;
}

export interface AttributeGroupFormRef {
  submitForm: () => void;
}

const AttributeGroupForm = forwardRef<AttributeGroupFormRef, AttributeGroupFormProps>(({
  initialValues,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  isViewMode = false
}, ref) => {
  const { t } = useTranslation();
  
  // Prepare form default values, prioritizing initialValues if provided
  const formDefaultValues = initialValues ? {
    name: initialValues.name,
    display_order: initialValues.display_order || 0,
    is_active: initialValues.is_active !== undefined ? initialValues.is_active : true,
  } : defaultValues || {
    name: '',
    display_order: 0,
    is_active: true,
  };
  
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<AttributeGroupFormValues>({
    resolver: zodResolver(attributeGroupSchema),
    defaultValues: formDefaultValues as AttributeGroupFormValues
  });

  // Expose submitForm method to parent component
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSubmit(onSubmit)();
    }
  }));

  return (
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('groupName')}
                  fullWidth
                  size='small'
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="display_order"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <TextField
                  {...field}
                  type="number"
                  size='small'
                  label={t('displayOrder')}
                  value={value === undefined ? '' : value}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    onChange(val);
                  }}
                  fullWidth
                  InputProps={{
                    inputProps: { min: 0, step: 1 }
                  }}
                  error={!!errors.display_order}
                  helperText={errors.display_order?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="is_active"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      {...field}
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      disabled={isViewMode}
                    />
                  }
                  label={t('field.status')}
                />
              )}
            />
          </Grid>
        </Grid>
      </Box>
  );
});

AttributeGroupForm.displayName = 'AttributeGroupForm';

export default AttributeGroupForm;
