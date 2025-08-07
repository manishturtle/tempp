/**
 * Tax Rate Form Component
 * 
 * Form for creating and editing tax rates
 */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  InputAdornment,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { taxRateSchema, TaxRateFormValues } from '../schemas';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface TaxRateFormProps {
  defaultValues?: Partial<TaxRateFormValues>;
  onSubmit: (data: TaxRateFormValues) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  isViewMode?: boolean;
}

// Export the form ref type for use in parent components
export type TaxRateFormRef = {
  submitForm: () => void;
};

const TaxRateForm = forwardRef<TaxRateFormRef, TaxRateFormProps>(({
  defaultValues = {
    rate_name: '',
    tax_type_code: '',
    rate_percentage: 0,
    effective_from: new Date().toISOString(),
    effective_to: '',
    country_code: 'IN', // Hardcoded default value
    is_active: true
  },
  onSubmit,
  isSubmitting = false,
  isEditMode = false,
  isViewMode = false
}, ref) => {
  const { t } = useTranslation();
  
  // Form setup with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting: formIsSubmitting },
    setValue,
    watch,
    reset
  } = useForm<TaxRateFormValues>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      ...defaultValues,
      is_active: true
    }
  });

  // Expose the submitForm method to parent components via ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSubmit(onSubmit)();
    }
  }));

  return (
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
     
          {/* Tax Type (Text field) */}
          <Grid size={{ xs: 12 }} >
            <Controller
              name="rate_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size='small'
                  label={t('pricing.taxRate.rateName')}
                  fullWidth
                  required
                  placeholder={t('pricing.taxRate.rateNamePlaceholder', 'e.g. VAT, GST, Sales Tax')}
                  error={!!errors.rate_name}
                  helperText={errors.rate_name?.message}
                  disabled={isSubmitting || isViewMode}
                />
              )}
            />
          </Grid>
          
          {/* Tax Code */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="tax_type_code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size='small'
                  label={t('pricing.taxRate.code')}
                  fullWidth
                  required
                  error={!!errors.tax_type_code}
                  helperText={errors.tax_type_code?.message}
                  disabled={isSubmitting || isViewMode}
                />
              )}
            />
          </Grid>
          
          {/* Tax Percentage */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="rate_percentage"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <TextField
                  {...field}
                  size='small'
                  type="text"
                  label={t('pricing.taxRate.percentage')}
                  value={value}
                  onChange={(e) => {
                    // Only allow numeric input (digits and decimal point)
                    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const formattedValue = numericValue.replace(/(\..*)\./g, '$1');
                    onChange(formattedValue === '' ? 0 : Number(formattedValue));
                  }}
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    inputProps: { maxLength: 3 }
                  }}
                  error={!!errors.rate_percentage}
                  helperText={errors.rate_percentage?.message}
                  disabled={isSubmitting || isViewMode}
                />
              )}
            />
          </Grid>
          
          {/* Effective From Date */}
          <Grid size={{ xs: 12, md: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Controller
                name="effective_from"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <DatePicker
                    {...field}
                    label={t('effectiveFrom')}
                    value={value ? new Date(value) : null}
                    onChange={(date) => {
                      onChange(date ? date.toISOString() : null);
                    }}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        required: true,
                        error: !!errors.effective_from,
                        helperText: errors.effective_from?.message,
                      }
                    }}
                    disabled={isSubmitting || isViewMode}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Effective To Date (Optional) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Controller
                name="effective_to"
                control={control}
                render={({ field: { value, onChange, ...field } }) => {
                  // Get effective_from date for validation
                  const effectiveFromValue = watch('effective_from');
                  const effectiveFromDate = effectiveFromValue ? new Date(effectiveFromValue) : null;
                  
                  return (
                    <DatePicker
                      {...field}
                      label={t('effectiveTo')}
                      value={value ? new Date(value) : null}
                      onChange={(date) => {
                        onChange(date ? date.toISOString() : null);
                      }}
                      minDate={effectiveFromDate ? new Date(effectiveFromDate.getTime() + 24*60*60*1000) : undefined} // day after effective_from
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true,
                          error: !!errors.effective_to,
                          helperText: errors.effective_to?.message || 'Must be after effective from date',
                          placeholder: 'Select end date (optional)',
                        }
                      }}
                      disabled={isSubmitting || isViewMode || !effectiveFromDate}
                    />
                  );
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          {/* Hidden Country Code Field - Hardcoded as 'IN' */}
          <Controller
            name="country_code"
            control={control}
            defaultValue="IN"
            render={({ field }) => (
              <input type="hidden" {...field} />
            )}
          />

          {/* Is Active */}
          {isEditMode && (
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
              <Controller
                name="is_active"
                control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting || isViewMode}
                      />
                    )}
                  />
                }
                label={t('pricing.taxRate.isActive', 'Active')}
              />
            </Grid>
          )}
        </Grid>
      </Box>
  );
});

export default TaxRateForm;
