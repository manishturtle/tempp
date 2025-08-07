'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Stack, TextField, MenuItem, 
  FormControl, InputLabel, Select, FormControlLabel, Switch,
  Paper, Divider, Grid, Alert, CircularProgress, Radio, RadioGroup,
  Checkbox, ListItemText, OutlinedInput, FormHelperText
} from '@mui/material';
import { 
  Save as SaveIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import EntityAutocomplete from '@/app/components/common/Autocomplete/EntityAutocomplete';
import { entityEndpoints } from '@/app/components/common/Autocomplete/apiEndpoints';

// Date picker imports
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

// Import schema and types
import { variantSchema, VariantFormData, AttributeWithOptions, ProductImage } from './VariantForm.schema';

// Import ImageManager component
import { ImageManager } from './ImageManager';

/**
 * VariantForm component for adding/editing product variants
 */
export interface VariantFormProps {
  onSubmit: SubmitHandler<VariantFormData>;
  defaultValues?: Partial<VariantFormData>;
  parentProductAttributes: AttributeWithOptions[];
  parentProductImages: ProductImage[];
  isLoading?: boolean;
  formId?: string;
  variantId?: number;
  parentProductId?: number;
  mode?: 'view' | 'edit' | 'add';
}

export default function VariantForm({
  onSubmit,
  defaultValues,
  parentProductAttributes,
  parentProductImages,
  isLoading = false,
  formId = 'variant-form',
  variantId = -1,
  parentProductId = -1,
  mode = 'add'
}: VariantFormProps) {
  const { t } = useTranslation();
  
  /**
   * Convert API images to the format expected by the UI
   */
  const convertApiImagesToUiFormat = (apiImages: ProductImage[] = []): Array<{
    id: string;
    alt_text: string;
    sort_order: number;
    is_default: boolean;
    image?: string;
  }> => {
    return apiImages.map(apiImage => ({
      id: apiImage.id?.toString() || '',
      alt_text: apiImage.alt_text || '',
      sort_order: typeof apiImage.sort_order === 'number' ? apiImage.sort_order : 0,
      is_default: !!apiImage.is_default,
      image: apiImage.image || '',
    }));
  };

  // State for variant temp images
  const [variantTempImages, setVariantTempImages] = useState<Array<{
    id: string;
    alt_text: string;
    sort_order: number;
    is_default: boolean;
    image?: string;
  }>>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues
  } = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      sku: '',
      display_price: undefined,
      quantity_on_hand: undefined,
      is_active: true,
      status_override: null,
      options: {},
      ...defaultValues
    }
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset({
        sku: '',
        display_price: undefined,
        quantity_on_hand: undefined,
        is_active: true,
        status_override: null,
        options: {},
        ...defaultValues
      });
      
      // Process any existing images when defaultValues contains images array
      if (defaultValues.images && Array.isArray(defaultValues.images) && defaultValues.images.length > 0) {
        console.log('VariantForm: Initializing variantTempImages from defaultValues.images', defaultValues.images);
        const convertedImages = convertApiImagesToUiFormat(defaultValues.images);
        setVariantTempImages(convertedImages);
      } else {
        // Reset the temp images state when defaultValues has no images
        // This ensures we don't have stale image data from previous form instances
        console.log('VariantForm: Resetting variantTempImages state due to defaultValues change');
        setVariantTempImages([]);
      }
    }
  }, [defaultValues, reset]);

  // Check if we have any attributes
  const hasAttributes = parentProductAttributes.length > 0;

  // Determine if fields should be disabled
  const isViewMode = mode === 'view';
  const isFieldDisabled = isLoading || isViewMode;

  // Handle form submission with temp images
  const handleFormSubmit: SubmitHandler<VariantFormData> = (data) => {
    console.log('VariantForm handleFormSubmit: Current variantTempImages state:', variantTempImages);
    
    // Combine form data with temp images
    const formDataWithImages = {
      ...data,
      temp_images: variantTempImages
    };
    
    console.log('VariantForm handleFormSubmit: Final payload with temp_images:', JSON.stringify(formDataWithImages, null, 2));
    
    // Call the parent onSubmit handler with the combined data
    onSubmit(formDataWithImages);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(handleFormSubmit)}>
      <Grid container >
        {!hasAttributes && (
          <Grid item xs={12}>
            <Alert severity="warning">
              {t('products.variants.noAttributesAvailable', 'No variant attributes available')}
            </Alert>
          </Grid>
        )}

        {/* SKU Field */}
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Controller
            name="sku"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('products.variants.name', 'Variant Name')}
                fullWidth
                size="small"
                error={!!errors.sku}
                helperText={errors.sku?.message}
                disabled={isFieldDisabled}
              />
            )}
          />
        </Grid>

        {/* Variant Options - Dynamic fields based on attribute data type */}
        {hasAttributes && (
          <Grid item xs={12}>
            {parentProductAttributes.map((attribute) => (
              <Grid item xs={12} key={attribute.id} sx={{ mb: 2 }}>
                {attribute.data_type === 'SELECT' && (
                  <Controller
                    name={`options.${attribute.id}`}
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.options}>
                        <InputLabel id={`attribute-${attribute.id}-label`}>
                          {attribute.name}
                        </InputLabel>
                        <Select
                          {...field}
                          labelId={`attribute-${attribute.id}-label`}
                          label={attribute.name}
                          fullWidth
                          size="small"
                          error={!!errors.options}
                          disabled={isFieldDisabled}
                        >
                          {attribute.options.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                              {option.option_label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.options && (
                          <FormHelperText>
                            {errors.options.message?.toString() || 'Invalid option'}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                )}
                
                {attribute.data_type === 'TEXT' && (
                  <Controller
                    name={`options.${attribute.id}`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={attribute.name}
                        fullWidth
                        size="small"
                        error={!!errors.options}
                        disabled={isFieldDisabled}
                      />
                    )}
                  />
                )}
                
                {attribute.data_type === 'NUMBER' && (
                  <Controller
                    name={`options.${attribute.id}`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={attribute.name}
                        type="number"
                        fullWidth
                        size="small"
                        inputProps={{
                          min: attribute.validation_rules?.min_value,
                          max: attribute.validation_rules?.max_value
                        }}
                        error={!!errors.options}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={isFieldDisabled}
                      />
                    )}
                  />
                )}
                
                {attribute.data_type === 'DATE' && (
                  <Controller
                    name={`options.${attribute.id}`}
                    control={control}
                    render={({ field }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          label={attribute.name}
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date) => field.onChange(date ? date.format('YYYY-MM-DD') : null)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              error: !!errors.options,
                            }
                          }}
                          disabled={isFieldDisabled}
                        />
                      </LocalizationProvider>
                    )}
                  />
                )}
                
                {attribute.data_type === 'BOOLEAN' && (
                  <Controller
                    name={`options.${attribute.id}`}
                    control={control}
                    render={({ field }) => (
                      <FormControl component="fieldset" error={!!errors.options}>
                        <Typography variant="subtitle2" gutterBottom>
                          {attribute.name}
                        </Typography>
                        <RadioGroup
                          row
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value === 'true')}
                        >
                          <FormControlLabel 
                            value={true} 
                            control={<Radio />} 
                            label={t('common.yes', 'Yes')}
                            disabled={isFieldDisabled}
                          />
                          <FormControlLabel 
                            value={false} 
                            control={<Radio />} 
                            label={t('common.no', 'No')}
                            disabled={isFieldDisabled}
                          />
                        </RadioGroup>
                        {errors.options && (
                          <FormHelperText>
                            {errors.options.message?.toString() || 'Invalid option'}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                )}
                
                {attribute.data_type === 'MULTI_SELECT' && (
                  <Controller
                    name={`options.${attribute.id}`}
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.options}>
                        <InputLabel id={`attribute-${attribute.id}-label`}>
                          {attribute.name}
                        </InputLabel>
                        <Select
                          {...field}
                          labelId={`attribute-${attribute.id}-label`}
                          label={attribute.name}
                          multiple
                          value={Array.isArray(field.value) ? field.value : []}
                          renderValue={(selected) => {
                            if (!Array.isArray(selected)) return '';
                            
                            return selected
                              .map(value => {
                                const option = attribute.options.find(opt => opt.id === value);
                                return option ? option.option_label : value;
                              })
                              .join(', ');
                          }}
                          input={<OutlinedInput label={attribute.name} />}
                          disabled={isFieldDisabled}
                        >
                          {attribute.options.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                              <Checkbox checked={Array.isArray(field.value) && field.value.includes(option.id)} />
                              <ListItemText primary={option.option_label} />
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.options && (
                          <FormHelperText>
                            {errors.options.message?.toString() || 'Invalid option'}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        )}

        {/* Price Field */}
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Controller
            name="display_price"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('products.variants.displayPrice', 'Display Price')}
                type="number"
                fullWidth
                size="small"
                error={!!errors.display_price}
                helperText={errors.display_price?.message}
                // Ensure value is always a number
                value={typeof field.value === 'string' ? parseFloat(field.value) || 0 : field.value}
                // Force conversion to number on change
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  field.onChange(isNaN(value) ? 0 : value);
                }}
                disabled={isFieldDisabled}
              />
            )}
          />
        </Grid>

        {/* Stock Field */}
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Controller
            name="quantity_on_hand"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('products.variants.quantityOnHand', 'Quantity On Hand')}
                type="number"
                fullWidth
                size="small"
                inputProps={{ min: 0, step: 1 }}
                error={!!errors.quantity_on_hand}
                helperText={errors.quantity_on_hand?.message}
                // Ensure value is always an integer
                value={typeof field.value === 'string' ? parseInt(field.value, 10) || 0 : field.value}
                // Force conversion to integer on change
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                  field.onChange(isNaN(value) ? 0 : value);
                }}
                disabled={isFieldDisabled}
              />
            )}
          />
        </Grid>

        {/* Status Field */}
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Controller
            name="status_override"
            control={control}
            render={({ field }) => (
              <EntityAutocomplete
                name="status_override"
                control={control}
                label={t('products.variants.statusOverride', 'Status Override')}
                apiEndpoint={entityEndpoints.productStatuses}
                error={!!errors.status_override}
                helperText={errors.status_override?.message}
                disabled={isFieldDisabled}
                value={field.value}
                onChange={(value) => {
                  // Extract just the ID if an object is selected, otherwise use null
                  const statusId = value && typeof value === 'object' && 'id' in value 
                    ? value.id 
                    : (value || null);
                  field.onChange(statusId);
                }}
              />
            )}
          />
        </Grid>

        {/* Active Status */}
        <Grid item xs={12} sx={{ mb: 2 }}>
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={isFieldDisabled}
                  />
                }
                label={t('products.variants.isActive', 'Active')}
              />
            )}
          />
        </Grid>

        {/* Image Manager */}
        <Grid item xs={12} sx={{ mb: 2 }}>
          <ImageManager
            images={variantTempImages}
            onImagesChange={setVariantTempImages}
            ownerType="variant"
            disabled={isFieldDisabled}
            maxImages={5}
          />
        </Grid>
      </Grid>
    </form>
  );
}
