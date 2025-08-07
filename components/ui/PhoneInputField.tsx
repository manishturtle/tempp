'use client';

import { Controller, useFormContext, Control } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import { Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  fullWidth?: boolean;
  margin?: 'none' | 'dense' | 'normal';
  size?: 'small' | 'medium';
  error?: boolean;
  helperText?: string;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: string;
  control?: Control<any>; // Add control prop
}

export const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  name,
  label,
  required = false,
  fullWidth = true,
  margin = 'normal',
  size = 'small',
  error,
  helperText,
  autoComplete = 'tel',
  disabled = false,
  placeholder,
  defaultCountry = 'in',
  control: controlProp, // Accept control prop
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  // Use provided control or get from context
  const context = useFormContext();
  const control = controlProp || context?.control;

  if (!control) {
    console.error('PhoneInputField must be used within a FormProvider or have a control prop');
    return null;
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error: fieldError } }) => (
        <div style={{ 
          width: fullWidth ? '100%' : 'auto', 
          marginTop: margin === 'normal' ? theme.spacing(2) : margin === 'dense' ? theme.spacing(1) : 0, 
          marginBottom: margin !== 'none' ? theme.spacing(1) : 0 
        }}>
          <div style={{ width: '100%' }}>
            <PhoneInput
              country={defaultCountry}
              value={field.value || ''}
              onChange={(phone) => field.onChange(phone)}
              onBlur={field.onBlur}
              disabled={disabled}
              placeholder={placeholder || t('common:form.phonePlaceholder')}
              inputProps={{
                name,
                required,
                autoComplete,
                style: {
                  width: '100%',
                  height: size === 'small' ? '38px' : size === 'medium' ? '40px' : '56px',                  padding: '8.5px 14px 8.5px 46px',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  border: `1px solid ${error || fieldError ? theme.palette.error.main : 'rgba(0, 0, 0, 0.23)'}`,
                },
              }}
              containerStyle={{
                width: '100%',
              }}
              buttonStyle={{
                backgroundColor: 'transparent',
                border: 'none',
                borderRight: `1px solid ${error || fieldError ? theme.palette.error.main : 'rgba(0, 0, 0, 0.23)'}`,
              }}
            />
          </div>
          {(error || fieldError) && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 1.5 }}>
              {typeof fieldError?.message === 'string' ? fieldError.message : helperText}
            </Typography>
          )}
          {helperText && !error && !fieldError && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5, ml: 1.5 }}>
              {helperText}
            </Typography>
          )}
        </div>
      )}
    />
  );
};

export default PhoneInputField;