import { FC } from 'react';
import { 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Checkbox, 
  FormControlLabel,
  Stack,
  Button,
  Box,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, Control, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Address form data type
export interface AddressFormData {
  id?: string | number;
  address_type: string;
  street_1: string;
  street_2?: string;
  street_3?: string;
  city: string;
  state?: string;
  state_province?: string; // API uses state_province, form uses state
  postal_code: string;
  country: string;
  is_default?: boolean;
  is_billing?: boolean;
  is_shipping?: boolean;
  is_primary_billing?: boolean; // API uses is_primary_billing, form uses is_billing
  is_primary_shipping?: boolean; // API uses is_primary_shipping, form uses is_shipping
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  custom_fields?: Record<string, any>;
}

// Zod schema for address validation
export const addressSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  address_type: z.string().min(1, { message: 'field.required' }),
  street_1: z.string().min(1, { message: 'field.required' }),
  street_2: z.string().optional().or(z.literal('')),
  street_3: z.string().optional().or(z.literal('')),
  city: z.string().min(1, { message: 'field.required' }),
  state: z.string().optional().or(z.literal('')),
  state_province: z.string().optional().or(z.literal('')),
  postal_code: z.string().min(1, { message: 'field.required' }),
  country: z.string().min(1, { message: 'field.required' }),
  is_default: z.boolean().optional().default(false),
  is_billing: z.boolean().optional().default(false),
  is_shipping: z.boolean().optional().default(false),
  is_primary_billing: z.boolean().optional(),
  is_primary_shipping: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.number().optional(),
  updated_by: z.number().optional(),
  custom_fields: z.record(z.any()).optional()
});

export interface AddressFormProps {
  // Props for standalone usage
  initialData?: AddressFormData;
  onSubmit?: (data: AddressFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isViewMode?: boolean;
  
  // Props for usage with parent form (account creation)
  control?: Control<AddressFormData>;
  errors?: FieldErrors<AddressFormData>;
}

/**
 * Reusable address form component
 */
export const AddressForm: FC<AddressFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isViewMode = false,
  control: externalControl,
  errors: externalErrors,
}) => {
  const { t } = useTranslation();
  
  // Set default values for the form
  const defaultValues = {
    address_type: '',
    street_1: '',
    street_2: '',
    street_3: '',
    city: '',
    state: '',
    state_province: '',
    postal_code: '',
    country: '',
    is_default: false,
    is_billing: false,
    is_shipping: false,
    is_primary_billing: false,
    is_primary_shipping: false,
    custom_fields: {},
    ...initialData
  } as AddressFormData;
  
  // Initialize form with react-hook-form if not provided externally
  const { 
    control: internalControl, 
    handleSubmit, 
    formState: { errors: internalErrors } 
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues
  });

  // Use either external or internal control and errors
  const control = externalControl || internalControl;
  const errors = externalErrors || internalErrors;

  // Handle form submission
  const handleFormSubmit = onSubmit ? handleSubmit((data) => {
    if (onSubmit) onSubmit(data);
  }) : undefined;
  
  // Function to manually submit the form - can be called from outside
  const submitForm = () => {
    if (onSubmit) {
      // Get current form values and submit them
      const currentValues = control._formValues as AddressFormData;
      onSubmit(currentValues);
    }
  };
  
  return (
    <form onSubmit={handleFormSubmit} id="address-form">
      <Grid container spacing={2}>
        {/* Address Type */}
        <Grid item xs={12}>
          <Controller
            name="address_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small" error={!!errors.address_type} disabled={isViewMode}>
                <InputLabel id="address-type-label">Address Type *</InputLabel>
                <Select
                  {...field}
                  labelId="address-type-label"
                  label="Address Type *"
                  size="small"
                  disabled={isViewMode}
                >
                  <MenuItem value="BILLING">{t('Billing')}</MenuItem>
                  <MenuItem value="SHIPPING">{t('Shipping')}</MenuItem>
                  <MenuItem value="HOME">{t('Home')}</MenuItem>
                  <MenuItem value="BUSINESS">{t('Business')}</MenuItem>
                  <MenuItem value="OTHER">{t('Other')}</MenuItem>
                </Select>
                {errors.address_type && (
                  <FormHelperText>{t(errors.address_type.message || 'field.required')}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
        
        {/* Street 1 */}
        <Grid item xs={12}>
          <Controller
            name="street_1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Street 1 *"
                fullWidth
                size="small"
                required
                disabled={isViewMode}
                error={!!errors.street_1}
                helperText={errors.street_1 ? t(errors.street_1.message || 'field.required') : ''}
              />
            )}
          />
        </Grid>
        
        {/* Street 2 */}
        <Grid item xs={12}>
          <Controller
            name="street_2"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Street 2"
                size="small"
                fullWidth
                disabled={isViewMode}
                error={!!errors.street_2}
                helperText={errors.street_2 ? t(errors.street_2.message || '') : ''}
              />
            )}
          />
        </Grid>
        
        {/* Street 3 */}
        <Grid item xs={12}>
          <Controller
            name="street_3"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Street 3"
                size="small"
                fullWidth
                disabled={isViewMode}
                error={!!errors.street_3}
                helperText={errors.street_3 ? t(errors.street_3.message || '') : ''}
              />
            )}
          />
        </Grid>
        
        {/* City */}
        <Grid item xs={12}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="City *"
                fullWidth
                required
                size="small"
                disabled={isViewMode}
                error={!!errors.city}
                helperText={errors.city ? t(errors.city.message || 'field.required') : ''}
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
              <TextField
                {...field}
                label="State/Province"
                fullWidth
                size="small"
                disabled={isViewMode}
                error={!!errors.state}
                helperText={errors.state ? t(errors.state.message || '') : ''}
              />
            )}
          />
        </Grid>

        {/* Postal Code */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="postal_code"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Postal Code *"
                fullWidth
                required
                size="small"
                disabled={isViewMode}
                error={!!errors.postal_code}
                helperText={errors.postal_code ? t(errors.postal_code.message || 'field.required') : ''}
              />
            )}
          />
        </Grid>

        {/* Country */}
        <Grid item xs={12}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small" error={!!errors.country} disabled={isViewMode}>
                <InputLabel>Country *</InputLabel>
                <Select
                  {...field}
                  labelId="country-label"
                  label="Country *"
                  size="small"
                  disabled={isViewMode}
                >
                  <MenuItem value="US">United States</MenuItem>
                  <MenuItem value="CA">Canada</MenuItem>
                  <MenuItem value="GB">United Kingdom</MenuItem>
                  <MenuItem value="AU">Australia</MenuItem>
                  <MenuItem value="IN">India</MenuItem>
                  <MenuItem value="DE">Germany</MenuItem>
                  <MenuItem value="FR">France</MenuItem>
                </Select>
                {errors.country && (
                  <FormHelperText>{t(errors.country.message || 'field.required')}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
        
        {/* Checkboxes */}
        <Grid item xs={12}>
          <Stack spacing={1}>
            <Controller
              name="is_default"
              control={control}
              render={({ field: { value, ...field } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={value}
                      onChange={(e) => {
                        field.onChange(e);
                        // If this is the default address, it should also be at least one of billing or shipping
                        if (e.target.checked) {
                          const formValues = control._formValues as AddressFormData;
                          if (!formValues.is_billing && !formValues.is_shipping) {
                            // Use the Controller for is_billing to update its value
                            setTimeout(() => {
                              const billingCheckbox = document.querySelector('input[name="is_billing"]') as HTMLInputElement;
                              if (billingCheckbox) {
                                billingCheckbox.checked = true;
                                billingCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                              }
                            }, 0);
                          }
                        }
                      }}
                      disabled={isViewMode}
                    />
                  }
                  label="Set as Default Address"
                />
              )}
            />
            <Controller
              name="is_billing"
              control={control}
              render={({ field: { value, ...field } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={value}
                      onChange={(e) => field.onChange(e)}
                      disabled={isViewMode}
                    />
                  }
                  label="Set as Primary Billing Address"
                />
              )}
            />
            <Controller
              name="is_shipping"
              control={control}
              render={({ field: { value, ...field } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={value}
                      onChange={(e) => field.onChange(e)}
                      disabled={isViewMode}
                    />
                  }
                  label="Set as Primary Shipping Address"
                />
              )}
            />
          </Stack>
        </Grid>
      </Grid>
      
      {/* Hidden submit button that can be triggered by the AnimatedDrawer */}
      <Button 
        id="address-form-submit"
        type="button"
        onClick={submitForm}
        sx={{ display: 'none' }}
      >
        Submit
      </Button>
    </form>
  );
};

export default AddressForm;
