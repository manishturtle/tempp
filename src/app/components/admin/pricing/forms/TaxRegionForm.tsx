/**
 * Tax Region Form Component
 * 
 * Form for creating and editing tax regions with country selection
 */
import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, 
  TextField, 
  FormControlLabel, 
  Switch,
  Button,
  Grid,
  Paper,
  FormHelperText,
  Autocomplete,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { taxRegionSchema, TaxRegionFormValues } from '../schemas';
import { useFetchCountries } from '@/app/hooks/api/shared';

interface TaxRegionFormProps {
  defaultValues?: Partial<TaxRegionFormValues>;
  onSubmit: (data: TaxRegionFormValues) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  isViewMode?: boolean;
}

// Export the type for the ref to be used in parent components
export interface TaxRegionFormRef {
  submitForm: () => void;
}

const TaxRegionForm = forwardRef<TaxRegionFormRef, TaxRegionFormProps>(({
  defaultValues = {
    name: '',
    code: '',
    description: '',
    is_active: true,
    countries: []
  },
  onSubmit,
  isSubmitting = false,
  isEditMode = false,
  isViewMode = false
}, ref) => {
  const { t } = useTranslation();
  
  // Fetch countries for the dropdown - using the shared API hook with pagination disabled
  // We need all countries without pagination for this form
  const { data: countriesData, isLoading: isLoadingCountries } = useFetchCountries({ is_active: true }, true);
  
  // Create a map of country IDs to country objects for easier lookup
  const countriesMap = useMemo(() => {
    const map = new Map<number, any>();
    if (countriesData) {
      // Handle paginated response structure
      const countries = Array.isArray(countriesData) 
        ? countriesData 
        : countriesData.results || [];
      
      // Filter to only include active countries
      const activeCountries = countries.filter((country: { is_active: boolean }) => country.is_active);
      
      activeCountries.forEach((country: { id: number }) => {
        map.set(country.id, country);
      });
    }
    return map;
  }, [countriesData]);

  // Transform countries data for initial form values
  // If defaultValues.countries contains country objects, extract just the IDs
  const initialCountries = useMemo(() => {
    if (!defaultValues.countries || !Array.isArray(defaultValues.countries)) {
      return [];
    }
    
    // If countries are already IDs, use them directly
    if (defaultValues.countries.length > 0 && typeof defaultValues.countries[0] === 'number') {
      return defaultValues.countries;
    }
    
    // If countries are objects, extract the IDs
    return (defaultValues.countries as any[]).map(country => 
      typeof country === 'object' && country !== null ? country.id : country
    );
  }, [defaultValues.countries]);

  // Setup form with validation
  const { 
    control, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    resolver: zodResolver(taxRegionSchema),
    defaultValues: {
      ...defaultValues,
      countries: initialCountries
    } as TaxRegionFormValues
  });

  // Custom submit handler to handle is_active field
  const handleFormSubmit = (data: TaxRegionFormValues) => {
    // Always include the is_active field in both create and edit modes
    onSubmit(data);
  };

  // Expose the submitForm method to the parent component through the ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSubmit(handleFormSubmit)();
    }
  }));

  return (
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }} >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Name')}
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={isViewMode}
                  size='small'
                />
              )}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }} >
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Code')}
                  fullWidth
                  required
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  disabled={isViewMode}
                  size='small'
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="countries"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  size='small'
                  id="countries"
                  options={countriesData 
                    ? (Array.isArray(countriesData) 
                        ? countriesData 
                        : countriesData.results || []).filter((country: { is_active: boolean }) => country.is_active)
                    : []}
                  getOptionLabel={(option) => {
                    // Handle both Country objects and country IDs
                    if (typeof option === 'number') {
                      const country = countriesMap.get(option);
                      return country ? `${country.name} (${country.iso_code})` : String(option);
                    }
                    return `${option.name} (${option.iso_code})`;
                  }}
                  isOptionEqualToValue={(option, value) => {
                    // Compare by ID for both objects and primitive values
                    const optionId = typeof option === 'number' ? option : option.id;
                    const valueId = typeof value === 'number' ? value : value.id;
                    return optionId === valueId;
                  }}
                  loading={isLoadingCountries}
                  value={field.value.map(id => {
                    // Convert IDs to country objects for display
                    const country = countriesMap.get(id);
                    return country || { id, name: `ID: ${id}`, code: '' };
                  })}
                  onChange={(_, newValue) => {
                    // Extract IDs from country objects for form value
                    field.onChange(newValue.map(item => 
                      typeof item === 'number' ? item : item.id
                    ));
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={`${option.name}${option.code ? ` (${option.code})` : ''}`}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('Countries')}
                      error={!!errors.countries}
                      placeholder={t('Select Countries')}
                      size='small'
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {isLoadingCountries ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                  disabled={isViewMode}
                />
              )}
            />
            {errors.countries && (
              <FormHelperText error>{errors.countries.message}</FormHelperText>
            )}
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Description')}
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  disabled={isViewMode}
                  size='small'
                />
              )}
            />
          </Grid>
          
          {/* Active Status Switch - available in both create and edit modes */}
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
                      disabled={isViewMode}
                    />
                  }
                  label={t('Status')}
                />
              )}
            />
          </Grid>
          
       
        </Grid>
      </Box>
  );
});

// Add display name for better debugging
TaxRegionForm.displayName = 'TaxRegionForm';

export default TaxRegionForm;
