'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Box,
  TextField,
  Button,
  Stack,
  Grid,
  CircularProgress,
  FormHelperText,
  useTheme,
  Autocomplete,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material'; 

import { ADDRESS_TYPES } from './addressValidations';
import { addressFormSchema, AddressFormData } from './addressValidations';
import { useLocation, Country, State, City } from '@/app/hooks/api/tenant-admin/useLocation';

/**
 * Props for the AddressForm component
 */
interface AddressFormProps {
  /** Callback function for form submission */
  onSubmit: (data: AddressFormData) => Promise<void>;
  /** Initial data for editing an existing address */
  initialData?: Partial<AddressFormData>;
  /** Loading state for the submit button */
  isLoading?: boolean;
  /** Text to display on the submit button */
  submitButtonText?: string;
}

/**
 * AddressForm component
 * A reusable form for adding and editing addresses
 */
export function AddressForm({
  onSubmit,
  initialData,
  isLoading = false,
  submitButtonText
}: AddressFormProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // State to track selected location IDs
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  
  // Initialize location hooks
  const locationHooks = useLocation();
  const { data: countries = [], isLoading: isLoadingCountries } = locationHooks.useCountries();
  const { data: states = [], isLoading: isLoadingStates } = locationHooks.useStates(selectedCountryId || 0);
  const { data: cities = [], isLoading: isLoadingCities } = locationHooks.useCities(selectedStateId || 0);
  
  // Initialize form with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      fullName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
      addressType: ADDRESS_TYPES.SHIPPING, // Default to SHIPPING
      ...initialData
    }
  });
  
  // Watch for country and state changes
  const selectedCountry = watch('country');
  const selectedState = watch('state');
  
  // Handle initial data setup
  useEffect(() => {
    if (initialData && countries.length > 0) {
      // Find and set the country ID if we have a country code
      if (initialData.country) {
        const country = countries.find(c => c.code === initialData.country);
        if (country) {
          setSelectedCountryId(country.id);
          // If we have a state in initial data, we'll handle it in the states effect
          if (initialData.state) {
            // State will be set after states are loaded
          }
        }
      }
    }
  }, [initialData, countries]);

  // Update selected IDs when form values change
  useEffect(() => {
    // Find country ID from selected country code
    if (selectedCountry) {
      const country = countries.find(c => c.code === selectedCountry);
      if (country) {
        if (country.id !== selectedCountryId) {
          setSelectedCountryId(country.id);
        }
        // Only reset state and city if this is a new selection
        if (!initialData?.state) {
          setValue('state', '');
          setValue('city', '');
          setSelectedStateId(null);
        }
      }
    }
  }, [selectedCountry, countries, setValue, selectedCountryId, initialData]);

  // Handle states loading and initial state selection
  useEffect(() => {
    if (states.length > 0 && initialData?.state) {
      const state = states.find(s => s.name === initialData.state);
      if (state) {
        setSelectedStateId(state.id);
        // If we're setting the state from initial data, ensure the city is set too
        if (initialData.city) {
          // City will be set after cities are loaded
        }
      }
    }
  }, [states, initialData]);

  // Handle cities loading and initial city selection
  useEffect(() => {
    if (cities.length > 0 && initialData?.city) {
      const city = cities.find(c => c.name === initialData.city);
      if (city) {
        setValue('city', city.name);
      }
    }
  }, [cities, initialData, setValue]);

  // Handle state selection changes
  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.name === selectedState);
      if (state) {
        if (state.id !== selectedStateId) {
          setSelectedStateId(state.id);
        }
        // Only reset city if this is a new selection
        if (!initialData?.city) {
          setValue('city', '');
        }
      }
    }
  }, [selectedState, states, setValue, selectedStateId, initialData]);

  useEffect(() => {
    if (countries.length > 0 && !watch('country')) {
      const defaultCountry = countries.find(c => c.code === 'IN') || countries[0];
      if (defaultCountry) {
        setValue('country', defaultCountry.code);
      }
    }
  }, [countries, setValue, watch]);
  
  // Show loading indicator while countries are loading
  if (isLoadingCountries) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  /**
   * Handle form submission
   */
  const handleFormSubmit = async (data: AddressFormData): Promise<void> => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting address form:', error);
    }
  };
  
  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      sx={{ 
        width: '100%',
        '& .MuiTextField-root': {
          transition: 'all 0.2s'
        },
        '& .MuiOutlinedInput-root': {
          '&:hover:not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.light
          }
        }
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 1 }} >
         {/* Address Type */}
         <Grid item xs={12}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              {t('addressBook.form.addressType', 'Address Type')}
            </FormLabel>
            <Controller
              name="addressType"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  row
                  {...field}
                  value={field.value || ADDRESS_TYPES.SHIPPING}
                  onChange={(e) => field.onChange(e.target.value as keyof typeof ADDRESS_TYPES)}
                >
                  <FormControlLabel
                    value={ADDRESS_TYPES.SHIPPING}
                    control={<Radio />}
                    label={t('addressBook.form.shipping', 'Shipping')}
                  />
                  <FormControlLabel
                    value={ADDRESS_TYPES.BILLING}
                    control={<Radio />}
                    label={t('addressBook.form.billing', 'Billing')}
                  />
                </RadioGroup>
              )}
            />
            {errors.addressType && (
              <FormHelperText error>{errors.addressType.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>
        {/* Full Name */}
        <Grid item xs={12} sx={{mt:2}} >
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('addressBook.form.fullName', 'Full Name')}
                variant="outlined"
                fullWidth
                required
                size="small"
                error={!!errors.fullName}
                helperText={errors.fullName?.message}
                disabled={isLoading}
              />
            )}
          />
        </Grid>
        
       

        {/* Address Line 1 */}
        <Grid item xs={12}>
          <Controller
            name="addressLine1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('addressBook.form.addressLine1', 'Address Line 1')}
                variant="outlined"
                fullWidth
                required
                size="small"
                error={!!errors.addressLine1}
                helperText={errors.addressLine1?.message}
                disabled={isLoading}
              />
            )}
          />
        </Grid>
        
        {/* Address Line 2 */}
        <Grid item xs={12}>
          <Controller
            name="addressLine2"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('addressBook.form.addressLine2Optional', 'Address Line 2 (Optional)')}
                variant="outlined"
                fullWidth
                size="small"
                error={!!errors.addressLine2}
                helperText={errors.addressLine2?.message}
                disabled={isLoading}
              />
            )}
          />
        </Grid>
        
        {/* Country */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={countries}
                getOptionLabel={(option) => option.name || ''}
                loading={isLoadingCountries}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                onChange={(_, newValue) => {
                  field.onChange(newValue ? newValue.code : '');
                }}
                value={field.value ? countries.find(c => c.code === field.value) || null : null}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('addressBook.form.country', 'Country')}
                    variant="outlined"
                    size="small"
                    error={!!errors.country}
                    helperText={errors.country?.message}
                    required
                    disabled={isLoading}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingCountries ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
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
              <Autocomplete
                {...field}
                options={states}
                getOptionLabel={(option) => option.name || ''}
                loading={isLoadingStates}
                disabled={!selectedCountry || isLoading}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, newValue) => {
                  field.onChange(newValue ? newValue.name : '');
                }}
                value={field.value ? states.find(s => s.name === field.value) || null : null}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('addressBook.form.stateProvince', 'State/Province')}
                    variant="outlined"
                    size="small"
                    error={!!errors.state}
                    helperText={errors.state?.message}
                    required
                    disabled={isLoading || !selectedCountry}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingStates ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Grid>
        
        {/* City */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={cities}
                getOptionLabel={(option) => option.name || ''}
                loading={isLoadingCities}
                disabled={!selectedState || isLoading}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, newValue) => {
                  field.onChange(newValue ? newValue.name : '');
                }}
                value={field.value ? cities.find(c => c.name === field.value) || null : null}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('addressBook.form.city', 'City')}
                    variant="outlined"
                    size="small"
                    error={!!errors.city}
                    helperText={errors.city?.message}
                    required
                    disabled={isLoading || !selectedState}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingCities ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Grid>
        
        {/* Postal Code */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="postalCode"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('addressBook.form.postalCode', 'Postal Code')}
                variant="outlined"
                fullWidth
                required
                size="small"
                error={!!errors.postalCode}
                helperText={errors.postalCode?.message}
                disabled={isLoading}
              />
            )}
          />
        </Grid>
        
        {/* Phone Number */}
        <Grid item xs={12}>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('addressBook.form.phoneNumber', 'Phone Number')}
                variant="outlined"
                fullWidth
                required
                size="small"
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber?.message}
                disabled={isLoading}
                inputProps={{
                  inputMode: 'tel'
                }}
              />
            )}
          />
        </Grid>
      </Grid>
      
      {/* Submit Button */}
      <Stack 
        direction="row" 
        justifyContent="flex-end" 
        spacing={2} 
        mt={theme.spacing(3)}
        sx={{
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -theme.spacing(2),
            left: -theme.spacing(3),
            right: -theme.spacing(3),
            height: 1,
            backgroundColor: theme.palette.divider,
            display: { xs: 'none', sm: 'block' }
          }
        }}
      >
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
          sx={{
            px: { xs: 3, sm: 4 },
            py: { xs: 1, sm: 1.25 },
            fontWeight: 600,
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: theme.shadows[4]
            }
          }}
        >
          {submitButtonText || t('common.save', 'Save')}
        </Button>
      </Stack>
    </Box>
  );
}
