"use client";

/**
 * Tenant Settings Form Component
 * 
 * This component provides a form for viewing and updating tenant-specific system-wide settings.
 */
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Switch, 
  FormControlLabel, 
  Button, 
  Grid, 
  MenuItem, 
  Divider, 
  Alert, 
  Snackbar,
  CircularProgress
} from '@mui/material';
import { tenantSettingSchema, TenantSettingSchema } from '@/app/types/schemas/settings';
import { useFetchTenantSettings, useUpdateTenantSettings } from '@/app/hooks/api/settings';
import { currencies } from '@/app/constants/currencies';
import { TenantSettingFormData } from '@/app/types/settings';

// Default tenant ID - in a real app, this would come from context or props
const DEFAULT_TENANT_ID = 1;

export default function TenantSettingsForm() {
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error'>('success');

  // Fetch tenant settings
  const { 
    data: tenantSettings, 
    isLoading: isLoadingSettings, 
    error: settingsError 
  } = useFetchTenantSettings(DEFAULT_TENANT_ID);

  // Update tenant settings mutation
  const { 
    mutate: updateSettings, 
    isPending: isUpdating, 
    error: updateError 
  } = useUpdateTenantSettings();

  // Initialize form with react-hook-form and zod validation
  const { 
    control, 
    handleSubmit, 
    reset, 
    formState: { errors, isDirty } 
  } = useForm<TenantSettingSchema>({
    resolver: zodResolver(tenantSettingSchema),
    defaultValues: {
      base_currency: '',
      tax_inclusive_pricing_global: false,
      show_tax_in_cart: false,
      show_tax_in_checkout: false,
      sku_prefix: '',
      sku_format: '',
    }
  });

  // Reset form when settings are loaded
  useEffect(() => {
    if (tenantSettings) {
      reset({
        base_currency: tenantSettings.base_currency,
        tax_inclusive_pricing_global: tenantSettings.tax_inclusive_pricing_global,
        show_tax_in_cart: tenantSettings.show_tax_in_cart,
        show_tax_in_checkout: tenantSettings.show_tax_in_checkout,
        sku_prefix: tenantSettings.sku_prefix,
        sku_format: tenantSettings.sku_format,
      });
    }
  }, [tenantSettings, reset]);

  // Form submission handler
  const onSubmit = (data: TenantSettingSchema) => {
    updateSettings(
      { 
        tenantId: DEFAULT_TENANT_ID, 
        data: data as TenantSettingFormData 
      },
      {
        onSuccess: () => {
          setSnackbarMessage('Settings updated successfully');
          setSnackbarSeverity('success');
          setOpenSnackbar(true);
        },
        onError: () => {
          setSnackbarMessage('Failed to update settings');
          setSnackbarSeverity('error');
          setOpenSnackbar(true);
        }
      }
    );
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Show loading state
  if (isLoadingSettings) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (settingsError) {
    return (
      <Alert severity="error">
        Error loading settings. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Currency Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="base_currency"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Base Currency"
                      error={!!errors.base_currency}
                      helperText={errors.base_currency?.message}
                      disabled={isUpdating}
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.code} value={currency.code}>
                          {currency.name} ({currency.symbol})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Tax Display Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="tax_inclusive_pricing_global"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={isUpdating}
                        />
                      }
                      label="Tax Inclusive Pricing (Global)"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="show_tax_in_cart"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={isUpdating}
                        />
                      }
                      label="Show Tax in Cart"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="show_tax_in_checkout"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={isUpdating}
                        />
                      }
                      label="Show Tax in Checkout"
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              SKU Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="sku_prefix"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="SKU Prefix"
                      error={!!errors.sku_prefix}
                      helperText={errors.sku_prefix?.message || "Optional prefix for all SKUs"}
                      disabled={isUpdating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="sku_format"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="SKU Format"
                      error={!!errors.sku_format}
                      helperText={errors.sku_format?.message || "Optional format string for SKUs (e.g., {prefix}-{id:5})"}
                      disabled={isUpdating}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isDirty || isUpdating}
              startIcon={isUpdating ? <CircularProgress size={20} /> : null}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Card>
      </form>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
