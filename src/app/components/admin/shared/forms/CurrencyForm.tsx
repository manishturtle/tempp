"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  FormControlLabel, 
  Switch,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface CurrencyFormValues {
  code: string;
  name: string;
  symbol: string;
  exchange_rate_to_usd: number;
  is_active: boolean;
}

export interface CurrencyFormProps {
  initialData?: CurrencyFormValues;
  isViewMode?: boolean;
  isLoading?: boolean;
  onSubmit?: (data: CurrencyFormValues) => void;
}

export interface CurrencyFormRef {
  submitForm: () => void;
  getFormValues: () => CurrencyFormValues;
  validate: () => boolean;
}

const CurrencyForm = forwardRef<CurrencyFormRef, CurrencyFormProps>(
  ({ initialData, isViewMode = false, isLoading = false, onSubmit }, ref) => {
    const { t } = useTranslation();
    
    const [formData, setFormData] = useState<CurrencyFormValues>({
      code: '',
      name: '',
      symbol: '',
      exchange_rate_to_usd: 1,
      is_active: true
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Update form data when initialData changes
    useEffect(() => {
      if (initialData) {
        setFormData({
          code: initialData.code || '',
          name: initialData.name || '',
          symbol: initialData.symbol || '',
          exchange_rate_to_usd: typeof initialData.exchange_rate_to_usd === 'string' 
            ? parseFloat(initialData.exchange_rate_to_usd) || 1 
            : initialData.exchange_rate_to_usd || 1,
          is_active: initialData.is_active !== undefined ? initialData.is_active : true
        });
      }
    }, [initialData]);
    
    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      
      setFormData({
        ...formData,
        [name]: type === 'checkbox' 
          ? checked 
          : type === 'number' 
            ? parseFloat(value) || 0 
            : value
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
      
      if (!formData.code) {
        newErrors.code = t('validation.required', 'This field is required');
      } else if (formData.code.length !== 3) {
        newErrors.code = t('validation.currencyCodeLength', 'Currency code must be exactly 3 characters');
      }
      
      if (!formData.name) {
        newErrors.name = t('validation.required', 'This field is required');
      }
      
      if (!formData.symbol) {
        newErrors.symbol = t('validation.required', 'This field is required');
      }
      
      if (formData.exchange_rate_to_usd <= 0) {
        newErrors.exchange_rate_to_usd = t('validation.positiveNumber', 'Must be a positive number');
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
          label={t('currencies.code', 'Currency Code')}
          name="code"
          size="small"
          value={formData.code}
          onChange={handleChange}
          fullWidth
          required
          disabled={isViewMode}
          error={!!errors.code}
          helperText={errors.code || t('currencies.codeHelp', 'Three-letter currency code (e.g., USD, EUR, GBP)')}
          inputProps={{ maxLength: 3 }}
          autoFocus={!isViewMode}
        />
        
        <TextField
          label={t('currencies.name', 'Currency Name')}
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
          label={t('currencies.symbol', 'Currency Symbol')}
          name="symbol"
          size="small"
          value={formData.symbol}
          onChange={handleChange}
          fullWidth
          required
          disabled={isViewMode}
          error={!!errors.symbol}
          helperText={errors.symbol || t('currencies.symbolHelp', 'Currency symbol (e.g., $, €, £)')}
        />
        
        <TextField
          label={t('currencies.exchangeRate', 'Exchange Rate to USD')}
          name="exchange_rate_to_usd"
          type="number"
          size="small"
          value={formData.exchange_rate_to_usd}
          onChange={handleChange}
          fullWidth
          required
          disabled={isViewMode}
          error={!!errors.exchange_rate_to_usd}
          helperText={errors.exchange_rate_to_usd || t('currencies.exchangeRateHelp', 'Exchange rate relative to 1 USD')}
          InputProps={{
            startAdornment: <InputAdornment position="start">1 USD =</InputAdornment>,
          }}
          inputProps={{ 
            step: '0.000001',
            min: '0.000001'
          }}
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

CurrencyForm.displayName = 'CurrencyForm';

export default CurrencyForm;
