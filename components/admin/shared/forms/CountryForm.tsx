"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  FormControlLabel, 
  Switch,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface CountryFormValues {
  iso_code: string;
  name: string;
  is_active: boolean;
  flag_url?: string;
  phone_code?: string;
  iso_code_3?: string;
}

export interface CountryFormProps {
  initialData?: CountryFormValues;
  isViewMode?: boolean;
  isLoading?: boolean;
  onSubmit?: (data: CountryFormValues) => void;
}

export interface CountryFormRef {
  submitForm: () => void;
  getFormValues: () => CountryFormValues;
  validate: () => boolean;
}

const CountryForm = forwardRef<CountryFormRef, CountryFormProps>(
  ({ initialData, isViewMode = false, isLoading = false, onSubmit }, ref) => {
    const { t } = useTranslation();
    
    const [formData, setFormData] = useState<CountryFormValues>({
      iso_code: '',
      name: '',
      is_active: true,
      flag_url: '',
      phone_code: '',
      iso_code_3: ''
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Update form data when initialData changes
    useEffect(() => {
      if (initialData) {
        setFormData({
          iso_code: initialData.iso_code || '',
          name: initialData.name || '',
          is_active: initialData.is_active !== undefined ? initialData.is_active : true,
          flag_url: initialData.flag_url || '',
          phone_code: initialData.phone_code || '',
          iso_code_3: initialData.iso_code_3 || ''
        });
      }
    }, [initialData]);
    
    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
      
      // Clear error for this field
      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: ''
        });
      }
    };
    
    // Validate form
    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      
      if (!formData.iso_code) {
        newErrors.iso_code = t('validation.required', 'This field is required');
      } else if (formData.iso_code.length !== 2) {
        newErrors.iso_code = t('validation.isoCodeLength', 'ISO code must be exactly 2 characters');
      }
      
      if (!formData.name) {
        newErrors.name = t('validation.required', 'This field is required');
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
    
    // Submit form
    const submitForm = () => {
      if (validate() && onSubmit) {
        onSubmit(formData);
      }
    };
    
    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      submitForm,
      getFormValues: () => formData,
      validate
    }));
    
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      );
    }
    
    return (
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          label={t('countries.isoCode', 'ISO Code')}
          name="iso_code"
          size="small"
          value={formData.iso_code}
          onChange={handleChange}
          fullWidth
          required
          disabled={isViewMode}
          error={!!errors.iso_code}
          helperText={errors.iso_code || t('countries.isoCodeHelp', 'Two-letter country code (e.g., US, IN, GB)')}
          inputProps={{ maxLength: 2 }}
          autoFocus={!isViewMode}
        />
        
        <TextField
          label={t('countries.isoCode3', 'ISO Code 3')}
          name="iso_code_3"
          size="small"
          value={formData.iso_code_3 || ''}
          onChange={handleChange}
          fullWidth
          disabled={isViewMode}
          error={!!errors.iso_code_3}
          helperText={errors.iso_code_3 || t('countries.isoCode3Help', 'Three-letter country code (e.g., USA, IND, GBR)')}
          inputProps={{ maxLength: 3 }}
        />
        
        <TextField
          label={t('countries.name', 'Country Name')}
          name="name"
          size="small"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          required
          disabled={isViewMode}
          error={!!errors.name}
          helperText={errors.name}
        />
        
        <TextField
          label={t('countries.phoneCode', 'Phone Code')}
          name="phone_code"
          size="small"
          value={formData.phone_code || ''}
          onChange={handleChange}
          fullWidth
          disabled={isViewMode}
          error={!!errors.phone_code}
          helperText={errors.phone_code || t('countries.phoneCodeHelp', 'International dialing code with + prefix (e.g., +1, +91)')}
        />
        
        <TextField
          label={t('countries.flagUrl', 'Flag URL')}
          name="flag_url"
          size="small"
          value={formData.flag_url || ''}
          onChange={handleChange}
          fullWidth
          disabled={isViewMode}
          error={!!errors.flag_url}
          helperText={errors.flag_url || t('countries.flagUrlHelp', 'URL to the country flag image')}
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={handleChange}
              name="is_active"
              color="primary"
              disabled={isViewMode}
            />
          }
          label={t('fields.status', 'Active')}
        />
      </Box>
    );
  }
);

CountryForm.displayName = 'CountryForm';

export default CountryForm;
