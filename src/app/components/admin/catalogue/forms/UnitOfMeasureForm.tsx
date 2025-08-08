/**
 * Unit of Measure Form Component
 * 
 * Form for creating and editing units of measure in the catalogue
 */
import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Divider
} from '@mui/material';
import { unitOfMeasureSchema, UnitOfMeasureFormValues } from '../schemas';
import { UnitOfMeasure } from '@/app/types/catalogue';
import { useTranslation } from 'react-i18next';
interface UnitOfMeasureFormProps {
  defaultValues?: Partial<UnitOfMeasure>;
  onSubmit: (data: UnitOfMeasureFormValues) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const UnitOfMeasureForm = forwardRef<{ submitForm: () => void }, UnitOfMeasureFormProps>((
  props,
  ref
) => {
  const { defaultValues, onSubmit, isSubmitting = false, readOnly = false } = props;
  // Check if we're in edit mode (has an existing id) or create mode
  const isEditMode = !!defaultValues?.id;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<UnitOfMeasureFormValues>({
    resolver: zodResolver(unitOfMeasureSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      symbol: defaultValues?.symbol || '',
      description: defaultValues?.description || '',
      is_active: defaultValues?.is_active ?? true,
      unit_type: defaultValues?.unit_type || 'COUNTABLE',
      associated_value: defaultValues?.associated_value ?? null
    }
  });

  const { t } = useTranslation();

  // Watch the unit type to conditionally show associated value field
  const unitType = watch('unit_type');

  // Expose submitForm method to parent component via ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      console.log('Form submission triggered from drawer');
      // Get the current form values
      const formValues = {
        name: watch('name'),
        symbol: watch('symbol'),
        description: watch('description'),
        is_active: watch('is_active'),
        unit_type: watch('unit_type'),
        associated_value: watch('associated_value')
      };
      
      // Validate the form values
      if (!formValues.name || !formValues.symbol || !formValues.unit_type) {
        console.error('Form validation failed: Missing required fields');
        return;
      }
      
      // Call the custom submit handler directly with the current form values
      customSubmitHandler(formValues);
    }
  }));

  // Custom submit handler to remove is_active in create mode
  const customSubmitHandler = (data: UnitOfMeasureFormValues) => {
    console.log('Custom submit handler called with data:', data);
    if (!isEditMode) {
      // In create mode, remove is_active from the data being sent
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { is_active, ...dataWithoutIsActive } = data;
      onSubmit(dataWithoutIsActive as UnitOfMeasureFormValues);
    } else {
      // In edit mode, send all data including is_active
      onSubmit(data);
    }
  };

  return (
      <Box component="form" onSubmit={(e) => {
        e.preventDefault(); // Prevent default form submission
        handleSubmit(customSubmitHandler)();
      }} noValidate>
        
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('name')}
                  fullWidth
                  size='small'
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={isSubmitting || readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Controller
              name="symbol"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('symbol')}
                  fullWidth
                  size='small'
                  required
                  error={!!errors.symbol}
                  helperText={errors.symbol?.message || "1-10 characters, letters and numbers only"}
                  disabled={isSubmitting || readOnly}
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
                  label={t('description')}
                  fullWidth
                  multiline
                  rows={3}
                  size='small'
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={isSubmitting || readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Controller
              name="unit_type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!errors.unit_type} size='small' disabled={isSubmitting || readOnly}>
                  <InputLabel>{t('type')}</InputLabel>
                  <Select
                    {...field}
                    size='small'
                    label={t('type')}
                    inputProps={{
                      readOnly: readOnly
                    }}
                  >
                    <MenuItem value="COUNTABLE">{t('countable')}</MenuItem>
                    <MenuItem value="MEASURABLE">{t('measurable')}</MenuItem>
                  </Select>
                  {errors.unit_type && (
                    <FormHelperText>{errors.unit_type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" gutterBottom>Note:</Typography>
              <Typography variant="body2">
                <strong>{t('countable')}:</strong> {t('countableNote')}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>{t('measurable')}:</strong> {t('measurableNote')}
              </Typography>
            </Box>
          </Grid>
          
          {unitType && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="associated_value"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('associatedValue')}
                    fullWidth
                    size='small'
                    type="number"
                    error={!!errors.associated_value}
                    helperText={
                      errors.associated_value?.message || 
                      (unitType === 'COUNTABLE' 
                        ? t('associatedValueNote1') 
                        : t('associatedValueNote2'))
                    }
                    disabled={isSubmitting || readOnly}
                    InputProps={{
                      readOnly: readOnly,
                      inputProps: {
                        step: unitType === 'COUNTABLE' ? '1' : '0.0001',
                        min: '0'
                      }
                    }}
                    value={field.value === null ? '' : field.value}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : Number(e.target.value);
                      field.onChange(value);
                    }}
                  />
                )}
              />
            </Grid>
          )}
  
          
          {/* Only show is_active field in edit mode */}
          {isEditMode && (
            <Grid size={{ xs: 12 }}>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isSubmitting || readOnly}
                      />
                    }
                    label={t('active')}
                  />
                )}
              />
            </Grid>
          )}
          
          {/* Save button removed as AnimatedDrawer already has a save button in footer */}
        </Grid>
      </Box>
  );
});

export default UnitOfMeasureForm;
