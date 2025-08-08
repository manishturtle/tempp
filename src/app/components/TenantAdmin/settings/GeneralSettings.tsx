'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl, 
  FormLabel,
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Radio, 
  RadioGroup,
  Paper,
  Button,
  Grid,
  SelectChangeEvent,
  Autocomplete,
  CircularProgress,
  styled,
  Snackbar,
  Alert,
} from '@mui/material';
import { getTenantConfig, saveTenantConfig, mapToApiFormat, mapFromApiFormat } from '../../../services/tenantConfigService';
import { COCKPIT_API_BASE_URL } from '../../../../utils/constants';
// Custom scrollbar styles
const CustomScrollbar = styled('div')({
  '&::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '10px',
    '&:hover': {
      background: '#555',
    },
  },
});

type TimeFormat = '12h' | '24h';
type FirstDayOfWeek = 'sunday' | 'monday';

export interface GeneralFormData {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  taxId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h' | '24-hour';
  firstDayOfWeek: 'sunday' | 'monday';
  currency: string;
  language: string;
}

interface GeneralSettingsProps {
  onSave: (data: GeneralFormData) => void;
  readOnly?: boolean;
  defaultValues?: GeneralFormData;
}

interface FormData {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  countryCode: string; // Added to store country code for API calls
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  taxId: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: TimeFormat;
  currency: string;
  firstDayOfWeek: FirstDayOfWeek;
}

const GeneralSettings = React.forwardRef(({ onSave, readOnly = false, defaultValues }: GeneralSettingsProps, ref) => {
  // Expose the triggerSubmit method to parent
  React.useImperativeHandle(ref, () => ({
    triggerSubmit: () => {
      handleSubmit(onSave)();
    }
  }));
  const { control, handleSubmit, reset, setValue, watch, formState: { isDirty } } = useForm<FormData>({
    defaultValues: {
      companyName: '',
      contactEmail: '',
      contactPhone: '',
      country: '',
      countryCode: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      taxId: '',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'yyyy-MM-dd',
      timeFormat: '12h',
      currency: 'usd',
      firstDayOfWeek: 'sunday',
    },
  });

  // Watch form values
  const watchedValues = watch();
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [activeTab, setActiveTab] = useState('general');
  
  // Location data state
  // Define types for consistent use across the component
  type CountryType = {id: string; name: string; code: string};  
  type StateType = {id: string; name: string};
  type CityType = {id: string; name: string};
  type TimezoneType = {code: string; name: string};
  type LanguageType = {code: string; name: string; nativeName: string};
  type DateFormatType = {value: string; label: string};
  type CurrencyType = {code: string; symbol: string; name: string};
  
  const [countries, setCountries] = useState<CountryType[]>([]);
  const [states, setStates] = useState<Array<{id: string, name: string}>>([]);
  const [cities, setCities] = useState<Array<{id: string, name: string}>>([]);
  
  
  // UI state for dropdowns
  const [searchQueries, setSearchQueries] = useState({
    country: '',
    state: '',
    city: '',
    timezone: '',
    language: '',
    dateFormat: '', 
    currency: ''
  });
  
  
  const [open, setOpen] = useState({
    country: false,
    state: false,
    city: false,
    language: false,
    dateFormat: false,
    currency: false,
    timezone: false
  });
  
  const handleSearchQueryChange = (field: 'country' | 'state' | 'city' | 'timezone' | 'language' | 'dateFormat' | 'currency', value: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Loading states
  const [isLoading, setIsLoading] = useState({
    initial: true,  // For initial page load
    country: false, // For country loading
    state: false,   // For state loading
    city: false     // For city loading
  });
  
  const [error, setError] = useState<{
    country: string | null;
    state: string | null;
    city: string | null;
  }>({
    country: null,
    state: null,
    city: null
  });

  // Date format options
  const dateFormats = [
    { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
    { label: 'DD-MM-YYYY', value: 'dd-MM-yyyy' },
    { label: 'MM-DD-YYYY', value: 'MM-dd-yyyy' },
    { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
    { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
    { label: 'YYYY/MM/DD', value: 'yyyy/MM/dd' },
    { label: 'Do MMM YYYY', value: 'do MMM yyyy' },         // 18th Jun 2025
    { label: 'MMMM Do, YYYY', value: 'MMMM do, yyyy' },     // June 18th, 2025
    { label: 'ddd, MMM D YYYY', value: 'EEE, MMM d yyyy' }, // Wed, Jun 18 2025
    { label: 'Full ISO', value: "yyyy-MM-dd'T'HH:mm:ssxxx" } // 2025-06-18T14:23:00+05:30
  ];
  
  // Language options
 
  
  
  const languages: LanguageType[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' }
  ];
  
  // Ensure languages are available before filtering
  const availableLanguages = useMemo(() => languages, []);
  const filteredLanguages = useMemo(() => {
    if (!searchQueries.language) return availableLanguages;
    const query = searchQueries.language.toLowerCase();
    return availableLanguages.filter(
      lang =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [availableLanguages, searchQueries.language]);
  
    // const timezones  = Intl.supportedValuesOf('timeZone');
  
  // Currency options
  const currencies: CurrencyType[] = [
    { code: 'usd', symbol: '$', name: 'US Dollar (USD)' },
    {code: 'inr', symbol: '₹', name: 'Indian Rupee (INR)' }
   
  ];
    const timezoneOptions = Intl.supportedValuesOf('timeZone').map(tz => ({
      code: tz,
      name: tz.replace(/_/g, ' ')
    }));

  const timezones = [
    { code: 'Pacific/Midway', name: '(UTC-11:00) Midway Island, Samoa' },
    { code: 'Pacific/Honolulu', name: '(UTC-10:00) Hawaii' },
    { code: 'America/Anchorage', name: '(UTC-09:00) Alaska' },
    { code: 'America/Los_Angeles', name: '(UTC-08:00) Pacific Time (US & Canada)' },
    { code: 'America/Denver', name: '(UTC-07:00) Mountain Time (US & Canada)' },
    { code: 'America/Chicago', name: '(UTC-06:00) Central Time (US & Canada)' },
    { code: 'America/New_York', name: '(UTC-05:00) Eastern Time (US & Canada)' },
    { code: 'America/Halifax', name: '(UTC-04:00) Atlantic Time (Canada)' },
    { code: 'America/Argentina/Buenos_Aires', name: '(UTC-03:00) Buenos Aires' },
    { code: 'Atlantic/South_Georgia', name: '(UTC-02:00) Mid-Atlantic' },
    { code: 'Atlantic/Azores', name: '(UTC-01:00) Azores' },
    { code: 'UTC', name: '(UTC±00:00) Coordinated Universal Time' },
    { code: 'Europe/London', name: '(UTC+00:00) London, Edinburgh, Dublin' },
    { code: 'Europe/Paris', name: '(UTC+01:00) Paris, Amsterdam, Berlin' },
    { code: 'Europe/Athens', name: '(UTC+02:00) Athens, Istanbul, Helsinki' },
    { code: 'Asia/Kuwait', name: '(UTC+03:00) Kuwait, Riyadh, Moscow' },
    { code: 'Asia/Dubai', name: '(UTC+04:00) Dubai, Abu Dhabi' },
    { code: 'Asia/Karachi', name: '(UTC+05:00) Karachi, Islamabad' },
    { code: 'Asia/Kolkata', name: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
    { code: 'Asia/Dhaka', name: '(UTC+06:00) Dhaka, Astana' },
    { code: 'Asia/Bangkok', name: '(UTC+07:00) Bangkok, Jakarta' },
    { code: 'Asia/Shanghai', name: '(UTC+08:00) Beijing, Hong Kong, Singapore' },
    { code: 'Asia/Tokyo', name: '(UTC+09:00) Tokyo, Seoul' },
    { code: 'Australia/Sydney', name: '(UTC+10:00) Sydney, Brisbane' },
    { code: 'Pacific/Noumea', name: '(UTC+11:00) Solomon Is.' },
    { code: 'Pacific/Auckland', name: '(UTC+12:00) Auckland, Wellington' }
  ];  

  // Fetch tenant config and countries on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch tenant config and countries in parallel
        const [config, countriesResponse] = await Promise.all([
          getTenantConfig(),
          fetch(`https://becockpit.turtleit.in/api/location/v1/countries/`)
        ]);
        
        if (!countriesResponse.ok) {
          throw new Error('Failed to fetch countries');
        }
        
        const countriesData = await countriesResponse.json();
        const formData = mapFromApiFormat(config);
        
        if (!isMounted) return;
        
        setCountries(countriesData);
        
        console.log('Initial form data:', formData);
        console.log('Fetched countries:', countriesData);
        
        // Find the matching country by ID or code
        const matchedCountry = countriesData.find((country: any) => 
          String(country.id) === String(formData.country) || 
          String(country.code) === String(formData.country)
        );
        
        const finalCountryId = matchedCountry?.id || formData.country || '';
        const finalCountryCode = matchedCountry?.code || '';
        
        console.log('Matched country:', { matchedCountry, finalCountryId, finalCountryCode });
        
        // Find the matching language from available options
        const matchedLanguage = availableLanguages.find(lang => 
          String(lang.code).toLowerCase() === String(formData.language || '').toLowerCase()
        );
        
        const finalLanguage = matchedLanguage?.code || formData.language || 'en';
        
        console.log('Language mapping:', {
          fromApi: formData.language,
          matchedLanguage,
          finalLanguage,
          availableLanguages
        });
        
        // Prepare form values
        const formValues = {
          ...formData,
          country: finalCountryId,
          countryCode: finalCountryCode,
          state: formData.state || '',
          city: formData.city || '',
          language: finalLanguage
        };
        
        console.log('Setting form values:', formValues);
        
        // Reset form with API data after countries are loaded
        reset(formValues, {
          keepDefaultValues: true
        });
        
        // Set default values for time format and first day of week
        setValue('timeFormat', formData.timeFormat || '12h');
        setValue('firstDayOfWeek', formData.firstDayOfWeek || 'sunday');
        
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setSnackbar({
          open: true,
          message: 'Failed to load settings. Please try again later.',
          severity: 'error'
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [reset]);

  // Fetch states when country changes
  useEffect(() => {
    const fetchStates = async () => {
      const countryCode = watchedValues.countryCode;
      if (!countryCode) {
        setStates([]);
        setCities([]);
        setValue('state', '');
        setValue('city', '');
        return;
      }
      
      setIsLoading(prev => ({...prev, state: true}));
      setError(prev => ({...prev, state: null}));
      setStates([]);
      setCities([]);
      
      try {
        const response = await fetch(`https://becockpit.turtleit.in/api/location/v1/states/?countryCode=${countryCode}`);
        if (!response.ok) {
          throw new Error('Failed to fetch states');
        }
        const data = await response.json();
        setStates(data);
      } catch (err) {
        console.error('Error fetching states:', err);
        setError(prev => ({...prev, state: 'Failed to load states. Please try again later.'}));
      } finally {
        setIsLoading(prev => ({...prev, state: false}));
      }
    };

    fetchStates();
  }, [watchedValues.countryCode, setValue]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      const stateId = watchedValues.state;
      if (!stateId) {
        setCities([]);
        setValue('city', '');
        return;
      }
      
      setIsLoading(prev => ({...prev, city: true}));
      setError(prev => ({...prev, city: null}));
      setCities([]);
      
      try {
        const response = await fetch(`https://becockpit.turtleit.in/api/location/v1/cities/?stateId=${stateId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch cities');
        }
        const data = await response.json();
        setCities(data);
      } catch (err) {
        console.error('Error fetching cities:', err);
        setError(prev => ({...prev, city: 'Failed to load cities. Please try again later.'}));
      } finally {
        setIsLoading(prev => ({...prev, city: false}));
      }
    };

    fetchCities();
  }, [watchedValues.state, setValue]);

  // Filter data based on search query
  const filterCountries = (items: CountryType[], query: string): CountryType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterStates = (items: StateType[], query: string): StateType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterCities = (items: CityType[], query: string): CityType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterTimezones = (items: TimezoneType[], query: string): TimezoneType[] =>
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterLanguages = (items: LanguageType[], query: string): LanguageType[] =>
    query ? items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) || 
      item.nativeName.toLowerCase().includes(query.toLowerCase())
    ) : items;
    
  const filterDateFormats = (items: DateFormatType[], query: string): DateFormatType[] =>
    query ? items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterCurrencies = (items: CurrencyType[], query: string): CurrencyType[] =>
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || 
                          item.code.toLowerCase().includes(query.toLowerCase())) : items;

  const filteredCountries = filterCountries(countries, searchQueries.country);
  const filteredStates = filterStates(states, searchQueries.state);
  const filteredCities = filterCities(cities, searchQueries.city);
  const filteredTimezones = filterTimezones(timezones, searchQueries.timezone);
  // const filteredLanguages = filterLanguages(languages, searchQueries.language);
  const filteredDateFormats = filterDateFormats(dateFormats, searchQueries.dateFormat);
  const filteredCurrencies = filterCurrencies(currencies, searchQueries.currency);

  const handleTimeFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeFormat = event.target.value as TimeFormat;
    setValue('timeFormat', newTimeFormat);
  };

  const handleFirstDayOfWeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFirstDay = event.target.value as FirstDayOfWeek;
    setValue('firstDayOfWeek', newFirstDay);
  };

  const handleSave = async (data: any) => {
    try {
      setIsSaving(true);
      
      // Map form data to API format
      const apiData = mapToApiFormat(data);
      
      // Save to API
      await saveTenantConfig(apiData);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save settings. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <Box sx={{ width: '100%' }}>
        <input type="submit" style={{ display: 'none' }} />
    {/* Company Details Section */}
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Basic Company Details</Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, rowGap: 1, columnGap: 2 }}>
        <Box>
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Company Name"
                variant="outlined"
                size="small"
                margin="dense"
                InputProps={{ readOnly }}
                disabled={readOnly}
              />
            )}
          />
        </Box>
        <Box>
          <Controller
            name="contactEmail"
            control={control}
            rules={{
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Primary Contact Email"
                variant="outlined"
                size="small"
                margin="dense"
                InputProps={{ readOnly }}
                disabled={readOnly}
                error={!!error}
                helperText={error?.message}
              />
            )}
          />
        </Box>
        
        <Box>
          <Controller
            name="contactPhone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Primary Contact Phone"
                variant="outlined"
                size="small"
                margin="dense"
                InputProps={{ readOnly }}
                disabled={readOnly}
              />
            )}
          />
        </Box>

        <Box>
          <Controller
            name="taxId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Tax ID/VAT Number"
                variant="outlined"
                size="small"
                margin="dense"
                InputProps={{ readOnly }}
                disabled={readOnly}
              />
            )}
          />
        </Box>
        
        <Box>
          <Controller
            name="country"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <FormControl fullWidth size="small" margin="dense" sx={{ minWidth: 300 }}>
                <Autocomplete
                  {...field}
                  open={open.country}
                  onOpen={() => setOpen(prev => ({ ...prev, country: true }))}
                  onClose={() => setOpen(prev => ({ ...prev, country: false }))}
                  options={filteredCountries}
                  getOptionLabel={(option) => option.name}
                  value={(() => {
                    const found = countries.find(country => 
                      String(country.id) === String(value) || 
                      String(country.code) === String(value)
                    ) || null;
                    console.log('Current country value:', { 
                      value, 
                      found,
                      countries: countries.map(c => ({ id: c.id, code: c.code, name: c.name }))
                    });
                    return found;
                  })()}
                  onChange={(_, newValue) => {
                    console.log('Country selected:', newValue);
                    const countryId = newValue?.id || '';
                    const countryCode = newValue?.code || '';
                    
                    // Update form values
                    setValue('country', countryId, { shouldDirty: true, shouldValidate: true });
                    setValue('countryCode', countryCode, { shouldDirty: true });
                    setValue('state', '', { shouldDirty: true });
                    setValue('city', '', { shouldDirty: true });
                    
                    // Force update the form state
                    onChange(countryId);
                  }}
                  isOptionEqualToValue={(option, value) => 
                    option?.id === value?.id || option?.code === value?.id || option?.id === value
                  }
                  inputValue={searchQueries.country}
                  onInputChange={(_, newInputValue) => handleSearchQueryChange('country', newInputValue)}
                  loading={isLoading.country}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country"
                      variant="outlined"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoading.country ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                  ListboxComponent={CustomScrollbar}
                  ListboxProps={{
                    style: {
                      maxHeight: 200,
                      paddingRight: '8px',
                    },
                  }}
                  PaperComponent={({ children }) => (
                    <Paper 
                      sx={{ 
                        width: 'auto',
                        minWidth: '300px',
                        boxShadow: 3,
                        mt: 0.5,
                        '& .MuiAutocomplete-listbox': {
                          p: 0,
                        },
                        '& .MuiAutocomplete-option': {
                          minHeight: '40px',
                          '&[data-focus="true"]': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          },
                          '&[aria-selected="true"]': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            '&.Mui-focused': {
                              backgroundColor: 'rgba(25, 118, 210, 0.12)',
                            },
                          },
                        },
                      }}
                    >
                      {children}
                    </Paper>
                  )}
                  sx={{
                    '& .MuiAutocomplete-popper': {
                      minWidth: '300px',
                    },
                    '& .MuiAutocomplete-inputRoot': {
                      paddingRight: '8px !important',
                    },
                  }}
                  noOptionsText={searchQueries.country ? 'No countries found' : 'Start typing to search'}
                />
                {error.country && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {String(error.country)}
                  </Typography>
                )}
              </FormControl>
            )}
            InputProps={{ readOnly }}
            disabled={readOnly}
          />
        </Box>

        <Box>
          <Controller
            name="addressLine1"
            control={control}
            InputProps={{ readOnly }}
            disabled={readOnly}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Address Line 1"
                variant="outlined"
                size="small"
                margin="dense"
                placeholder="Street address"
              />
            )}
          />
        </Box>
        <Box>
          <Controller
            name="addressLine2"
            control={control}
            InputProps={{ readOnly }}
            disabled={readOnly}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Address Line 2 (Optional)"
                variant="outlined"
                size="small"
                margin="dense"
                placeholder="Suite, floor, etc."
              />
            )}
          />
        </Box>
        <Box>
          <Controller
            name="state"
            control={control}
            InputProps={{ readOnly }}
            disabled={readOnly}
            render={({ field: { onChange, value, ...field } }) => (
              <FormControl fullWidth size="small" margin="dense">
                <Autocomplete
                  {...field}
                  open={open.state}
                  onOpen={() => !readOnly && setOpen(prev => ({ ...prev, state: true }))}
                  onClose={() => setOpen(prev => ({ ...prev, state: false }))}
                  options={filteredStates}
                  getOptionLabel={(option) => option.name}
                  value={(() => {
                    if (!value) return null;
                    return states.find(state => 
                      String(state.id) === String(value) || 
                      String(state.code) === String(value)
                    ) || null;
                  })()}
                  onChange={(_, newValue) => {
                    const stateId = newValue?.id || '';
                    onChange(stateId);
                    setValue('state', stateId, { shouldDirty: true, shouldValidate: true });
                    setValue('city', '', { shouldDirty: true });
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (!option || !value) return false;
                    return (
                      String(option.id) === String(value?.id) || 
                      String(option.code) === String(value?.code) ||
                      String(option.id) === String(value)
                    );
                  }}
                  inputValue={searchQueries.state}
                  onInputChange={(_, newInputValue) => handleSearchQueryChange('state', newInputValue)}
                  loading={isLoading.state}
                  disabled={readOnly || !watchedValues.country}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="State/Province"
                      variant="outlined"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoading.state ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                  ListboxComponent={CustomScrollbar}
                  ListboxProps={{
                    style: {
                      maxHeight: 200,
                      paddingRight: '8px',
                    },
                  }}
                  PaperComponent={({ children }) => (
                    <Paper 
                      sx={{ 
                        width: 'auto',
                        minWidth: '300px',
                        boxShadow: 3,
                        mt: 0.5,
                        '& .MuiAutocomplete-listbox': {
                          p: 0,
                        },
                        '& .MuiAutocomplete-option': {
                          minHeight: '40px',
                          '&[data-focus="true"]': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          },
                          '&[aria-selected="true"]': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            '&.Mui-focused': {
                              backgroundColor: 'rgba(25, 118, 210, 0.12)',
                            },
                          },
                        },
                      }}
                    >
                      {children}
                    </Paper>
                  )}
                  sx={{
                    '& .MuiAutocomplete-popper': {
                      minWidth: '300px',
                    },
                    '& .MuiAutocomplete-inputRoot': {
                      paddingRight: '8px !important',
                    },
                  }}
                  noOptionsText={searchQueries.state ? 'No states found' : 'Start typing to search'}
                />
                {error.state && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {String(error.state)}
                  </Typography>
                )}
              </FormControl>
            )}
          />
        </Box>
          <Box>
            <Controller
              name="city"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <FormControl fullWidth size="small" margin="dense">
                  <Autocomplete
                    {...field}
                    open={open.city}
                    onOpen={() => setOpen(prev => ({ ...prev, city: true }))}
                    onClose={() => setOpen(prev => ({ ...prev, city: false }))}
                    options={filteredCities}
                    getOptionLabel={(option) => option.name}
                    value={(() => {
                      if (!value) return null;
                      return cities.find(city => 
                        String(city.id) === String(value) || 
                        String(city.name) === String(value)
                      ) || null;
                    })()}
                    onChange={(_, newValue) => {
                      const cityId = newValue?.id || '';
                      onChange(cityId);
                      setValue('city', cityId, { shouldDirty: true, shouldValidate: true });
                    }}
                    isOptionEqualToValue={(option, value) => {
                      if (!option || !value) return false;
                      return (
                        String(option.id) === String(value?.id) || 
                        String(option.name) === String(value?.name) ||
                        String(option.id) === String(value)
                      );
                    }}
                    inputValue={searchQueries.city}
                    onInputChange={(_, newInputValue) => handleSearchQueryChange('city', newInputValue)}
                    loading={isLoading.city}
                    disabled={!watchedValues.state}
                    InputProps={{ readOnly }}
                    disabled={readOnly}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="City"
                        variant="outlined"
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoading.city ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        {option.name}
                      </li>
                    )}
                    ListboxComponent={CustomScrollbar}
                    ListboxProps={{
                      style: {
                        maxHeight: 200,
                        paddingRight: '8px',
                      },
                    }}
                    PaperComponent={({ children }) => (
                      <Paper 
                        sx={{ 
                          width: 'auto',
                          minWidth: '300px',
                          boxShadow: 3,
                          mt: 0.5,
                          '& .MuiAutocomplete-listbox': {
                            p: 0,
                          },
                          '& .MuiAutocomplete-option': {
                            minHeight: '40px',
                            '&[data-focus="true"]': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                            '&[aria-selected="true"]': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                              '&.Mui-focused': {
                                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                              },
                            },
                          },
                        }}
                      >
                        {children}
                      </Paper>
                    )}
                    sx={{
                      '& .MuiAutocomplete-popper': {
                        minWidth: '300px',
                      },
                      '& .MuiAutocomplete-inputRoot': {
                        paddingRight: '8px !important',
                      },
                    }}
                    noOptionsText={searchQueries.city ? 'No cities found' : 'Start typing to search'}
                  />
                  {error.city && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {String(error.city)}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
          </Box>
          <Box>
            <Controller
              name="postalCode"
              control={control}
              
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="ZIP/Postal Code"
                  variant="outlined"
                  size="small"
                  margin="dense"
                  InputProps={{ readOnly }}
                  disabled={readOnly}
                />
              )}
            />
          </Box>
      
      </Box>
    </Paper>

    {/* Regional & Display Preferences Section */}
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Regional & Display Preferences</Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, rowGap:1, columnGap:2 }}>
        {/* Column 1 - Row 1 */}
        <Box>
          <Autocomplete
            open={open.language}
            onOpen={() => setOpen(prev => ({ ...prev, language: true }))}
            onClose={() => setOpen(prev => ({ ...prev, language: false }))}
            options={filteredLanguages}
            getOptionLabel={(option) => option?.name || ''}
            value={(() => {
              if (!watchedValues.language) return null;
              const foundLang = availableLanguages.find(lang => 
                String(lang.code).toLowerCase() === String(watchedValues.language).toLowerCase()
              );
              console.log('Language selection:', {
                currentValue: watchedValues.language,
                foundLang,
                availableLanguages
              });
              return foundLang || null;
            })()}
            onChange={(_, newValue) => {
              const languageCode = newValue?.code || '';
              console.log('Setting language to:', languageCode);
              setValue('language', languageCode, { shouldDirty: true, shouldValidate: true });
            }}
            isOptionEqualToValue={(option, value) => {
              if (!option || !value) return false;
              const optionCode = option?.code?.toLowerCase() || '';
              const valueCode = (value?.code || value || '').toString().toLowerCase();
              return optionCode === valueCode;
            }}
            InputProps={{ readOnly }}
            disabled={readOnly}
            inputValue={searchQueries.language}
            onInputChange={(_, newInputValue) => handleSearchQueryChange('language', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Default Language"
                variant="outlined"
                
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.code}>
                {option.name} ({option.nativeName})
              </li>
            )}
            ListboxComponent={CustomScrollbar}
            ListboxProps={{
              style: {
                maxHeight: 200,
                paddingRight: '8px',
              },
            }}
            PaperComponent={({ children }) => (
              <Paper 
                sx={{ 
                  width: 'auto',
                  minWidth: '300px',
                  boxShadow: 3,
                  mt: 0.5,
                  '& .MuiAutocomplete-listbox': {
                    p: 0,
                  },
                  '& .MuiAutocomplete-option': {
                    minHeight: '40px',
                    '&[data-focus="true"]': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                    '&[aria-selected="true"]': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      },
                    },
                  },
                }}
              >
                {children}
              </Paper>
            )}
            sx={{
              '& .MuiAutocomplete-popper': {
                minWidth: '300px',
              },
              '& .MuiAutocomplete-inputRoot': {
                paddingRight: '8px !important',
              },
            }}
            noOptionsText={!searchQueries.language ? 'Type to search for languages' : 'No languages found'}
          />
        </Box>
        
        {/* Column 2 - Row 1 */}
        <Box>
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Autocomplete
                        {...field}
                        options={timezoneOptions}
                        getOptionLabel={(option) => option.name}
                        value={timezoneOptions.find(opt => opt.code === value) || null}
                        onChange={(_, newValue) => {
                          onChange(newValue?.code || '');
                        }}
                        InputProps={{ readOnly }}
                        disabled={readOnly}
                        inputValue={searchQueries.timezone}
                        onInputChange={(_, newInputValue) => handleSearchQueryChange('timezone', newInputValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Time Zone"
                            variant="outlined"
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={option.code}>
                            {option.name}
                          </li>
                        )}
                        ListboxComponent={CustomScrollbar}
                        ListboxProps={{
                          style: {
                            maxHeight: 200,
                            paddingRight: '8px',
                          },
                        }}
                        PaperComponent={({ children }) => (
                          <Paper 
                            sx={{ 
                              width: 'auto',
                              minWidth: '300px',
                              boxShadow: 3,
                              mt: 0.5,
                              '& .MuiAutocomplete-listbox': {
                                p: 0,
                              },
                              '& .MuiAutocomplete-option': {
                                minHeight: '40px',
                                '&[data-focus="true"]': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                  '&.Mui-focused': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                  },
                                },
                              },
                            }}
                          >
                            {children}
                          </Paper>
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            minWidth: '300px',
                          },
                          '& .MuiAutocomplete-inputRoot': {
                            paddingRight: '8px !important',
                          },
                        }}
                        noOptionsText={!searchQueries.timezone ? 'Type to search for timezones' : 'No timezones found'}
                      />
                    )}
                  />
                </Box>
        
        {/* Column 1 - Row 2 */}
          {/* Column 1 - Row 2 */}
                <Box>
                  <Controller
                    name="dateFormat"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Autocomplete
                        {...field}
                        open={open.dateFormat}
                        onOpen={() => setOpen(prev => ({ ...prev, dateFormat: true }))}
                        onClose={() => setOpen(prev => ({ ...prev, dateFormat: false }))}
                        options={dateFormats}
                        InputProps={{ readOnly }}
                        disabled={readOnly}
                        getOptionLabel={(option) => option?.label || ''}
                        value={value ? dateFormats.find(opt => opt.value === value) : dateFormats[0]}
                        onChange={(_, newValue) => {
                          if (newValue) {
                            onChange(newValue.value);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Date Format"
                            variant="outlined"
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={option?.value}>
                            {option?.label || 'Select a date format'}
                          </li>
                        )}
                        ListboxComponent={CustomScrollbar}
                        ListboxProps={{
                          style: {
                            maxHeight: 200,
                            paddingRight: '8px',
                          },
                        }}
                        PaperComponent={({ children }) => (
                          <Paper 
                            sx={{ 
                              width: 'auto',
                              minWidth: '300px',
                              boxShadow: 3,
                              mt: 0.5,
                              '& .MuiAutocomplete-listbox': {
                                p: 0,
                              },
                              '& .MuiAutocomplete-option': {
                                minHeight: '40px',
                                '&[data-focus="true"]': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                  '&.Mui-focused': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                  },
                                },
                              },
                            }}
                          >
                            {children}
                          </Paper>
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            minWidth: '300px',
                          },
                          '& .MuiAutocomplete-inputRoot': {
                            paddingRight: '8px !important',
                          },
                        }}
                        noOptionsText={!searchQueries.dateFormat ? 'Type to search for date formats' : 'No date formats found'}
                      />
                    )}
                  />
                </Box>
        
        
                {/* Column 2 - Row 2 */}
                <Box>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Autocomplete
                        {...field}
                        options={currencies}
                        getOptionLabel={(option) => option ? `${option.code} - ${option.name} (${option.symbol})` : ''}
                        value={(() => {
                          if (!value) return null;
                          return currencies.find(curr => 
                            String(curr.code).toLowerCase() === String(value).toLowerCase()
                          ) || null;
                        })()}
                        onChange={(_, newValue) => {
                          const currencyCode = newValue?.code || '';
                          onChange(currencyCode);
                          setValue('currency', currencyCode, { shouldDirty: true, shouldValidate: true });
                        }}
                        isOptionEqualToValue={(option, value) => {
                          if (!option || !value) return false;
                          return (
                            String(option.code).toLowerCase() === String(value?.code || value).toLowerCase()
                          );
                        }}
                        InputProps={{ readOnly }}
                        disabled={readOnly}
                        inputValue={searchQueries.currency}
                        onInputChange={(_, newInputValue) => handleSearchQueryChange('currency', newInputValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Currency"
                            variant="outlined"
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={option.code}>
                            {option.code} - {option.name} ({option.symbol})
                          </li>
                        )}
                        ListboxComponent={CustomScrollbar}
                        ListboxProps={{
                          style: {
                            maxHeight: 200,
                            paddingRight: '8px',
                          },
                        }}
                        PaperComponent={({ children }) => (
                          <Paper 
                            sx={{ 
                              width: 'auto',
                              minWidth: '300px',
                              boxShadow: 3,
                              mt: 0.5,
                              '& .MuiAutocomplete-listbox': {
                                p: 0,
                              },
                              '& .MuiAutocomplete-option': {
                                minHeight: '40px',
                                '&[data-focus="true"]': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                  '&.Mui-focused': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                  },
                                },
                              },
                            }}
                          >
                            {children}
                          </Paper>
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            minWidth: '300px',
                          },
                          '& .MuiAutocomplete-inputRoot': {
                            paddingRight: '8px !important',
                          },
                        }}
                        noOptionsText={!searchQueries.currency ? 'Type to search for currencies' : 'No currencies found'}
                      />
                    )}
                  />
                </Box>
        {/* Column 1 - Row 3 */}
        <Box>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ 
              fontSize: '0.875rem', 
              '&.Mui-focused': {
                color: 'primary.main'
              }
            }}>
              Time Format
            </FormLabel>
            <Controller
              name="timeFormat"
              control={control}
             
              render={({ field }) => (
                <RadioGroup
                  row
                  {...field}
                  sx={{ mt: 0.5 }}
                  
                >
                  <FormControlLabel 
                    value="12h" 
                    control={<Radio size="small" />} 
                    label="12-hour (AM/PM)" 
                    sx={{ mr: 4 }}
                    disabled={readOnly}
                  />
                  <FormControlLabel 
                    value="24h" 
                    control={<Radio size="small" />} 
                    label="24-hour" 
                    disabled={readOnly}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>
        </Box>
      
      </Box>
    </Paper>
    
    {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, mb: 1 }}>
      <Button 
        type="submit"
        variant="contained" 
        color="primary"
        disabled={!isDirty || isSaving}
        sx={{ px: 3, py: 1, minWidth: 120 }}
      >
        {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
      </Button>
    </Box> */}
      </Box>
    </form>
  );
});

GeneralSettings.displayName = 'GeneralSettings';

export default GeneralSettings;