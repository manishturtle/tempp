import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  TextField,
  MenuItem,
  FormControl,
  FormHelperText,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Typography,
  Autocomplete
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '@/app/contexts/DrawerContext';
import { useFetchLocation, useCreateLocation, useUpdateLocation } from '@/app/hooks/api/inventory';
import { useFetchCountries } from '@/app/hooks/api/shared';
import Loader from '@/app/components/common/Loader';
import { Country } from '@/app/types/shared';

// Validation schema
const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location_type: z.string().min(1, 'Location type is required'),
  address_line_1: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state_province: z.string().min(1, 'State/Province is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country_code: z.string().min(1, 'Country is required'),
  is_active: z.boolean().default(true),
  notes: z.string().optional()
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationFormProps {
  mode: 'add' | 'view' | 'edit';
  locationId?: number | null;
  onSuccess?: () => void;
  onSubmit?: (data: LocationFormData) => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ mode, locationId, onSuccess, onSubmit }) => {
  const { t } = useTranslation();
  const drawerContext = useDrawer();
  const isViewMode = mode === 'view';
  
  const { data: locationData, isLoading } = useFetchLocation(locationId || 0, {
    enabled: mode !== 'add' && !!locationId
  });

  const { data: countriesData, isLoading: isLoadingCountries } = useFetchCountries(undefined, true);

  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      location_type: '',
      address_line_1: '',
      city: '',
      state_province: '',
      postal_code: '',
      country_code: '',
      is_active: true,
      notes: ''
    }
  });

  React.useEffect(() => {
    if (locationData) {
      reset({
        name: locationData.name,
        location_type: locationData.location_type,
        address_line_1: locationData.address_line_1,
        city: locationData.city,
        state_province: locationData.state_province,
        postal_code: locationData.postal_code,
        country_code: locationData.country_code,
        is_active: locationData.is_active,
        notes: locationData.notes || ''
      });
    }
  }, [locationData, reset]);

  const handleSave = async (data: LocationFormData) => {
    try {
      if (mode === 'edit' && locationId) {
        await updateLocation.mutateAsync({ id: locationId, ...data });
      } else {
        await createLocation.mutateAsync(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box component="form" id="location-form" onSubmit={handleSubmit(onSubmit || handleSave)}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                label={t('locations.form.name', 'Location Name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
                disabled={isViewMode}
                required
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Controller
            name="location_type"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                select
                label={t('locations.form.type', 'Location Type')}
                error={!!errors.location_type}
                helperText={errors.location_type?.message}
                fullWidth
                disabled={isViewMode}
                required
              >
                <MenuItem value="WAREHOUSE">{t('locations.types.warehouse', 'Warehouse')}</MenuItem>
                <MenuItem value="STORE">{t('locations.types.store', 'Store')}</MenuItem>
                <MenuItem value="DROPSHIP">{t('locations.types.dropship', 'Dropship')}</MenuItem>
                <MenuItem value="SUPPLIER">{t('locations.types.supplier', 'Supplier')}</MenuItem>
                <MenuItem value="OTHER">{t('locations.types.other', 'Other')}</MenuItem>
              </TextField>
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Controller
            name="address_line_1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                label={t('locations.form.address', 'Address')}
                error={!!errors.address_line_1}
                helperText={errors.address_line_1?.message}
                fullWidth
                disabled={isViewMode}
                required
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                label={t('locations.form.city', 'City')}
                error={!!errors.city}
                helperText={errors.city?.message}
                fullWidth
                disabled={isViewMode}
                required
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Controller
            name="state_province"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                label={t('locations.form.state', 'State/Province')}
                error={!!errors.state_province}
                helperText={errors.state_province?.message}
                fullWidth
                disabled={isViewMode}
                required
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Controller
            name="postal_code"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                label={t('locations.form.postalCode', 'Postal Code')}
                error={!!errors.postal_code}
                helperText={errors.postal_code?.message}
                fullWidth
                disabled={isViewMode}
                required
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Controller
            name="country_code"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Autocomplete
                size='small'
                options={countriesData || []}
                getOptionLabel={(option: Country) => option.name}
                value={(countriesData || []).find((country: Country) => country.iso_code === value) || null}
                onChange={(_, newValue) => onChange(newValue?.iso_code || '')}
                disabled={isViewMode}
                loading={isLoadingCountries}
                loadingText={t('common.loadingData', 'Loading data...')}
                noOptionsText={t('common.noResults', 'No results found')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size='small'
                    label={t('locations.form.country', 'Country')}
                    error={!!errors.country_code}
                    helperText={errors.country_code?.message}
                    required
                  />
                )}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size='small'
                label={t('locations.form.notes', 'Notes')}
                error={!!errors.notes}
                helperText={errors.notes?.message}
                fullWidth
                multiline
                rows={4}
                disabled={isViewMode}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Controller
            name="is_active"
            control={control}
            render={({ field: { value, onChange } }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isViewMode}
                  />
                }
                label={t('locations.form.active', 'Active')}
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default LocationForm;
