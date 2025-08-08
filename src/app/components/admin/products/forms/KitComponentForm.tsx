'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  FormControlLabel, 
  FormHelperText, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Radio, 
  RadioGroup, 
  Select, 
  TextField, 
  Typography,
  Autocomplete,
  CircularProgress,
  Paper
} from '@mui/material';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

// Import schema and types
import { 
  kitComponentSchema, 
  KitComponentFormData, 
  KitComponentType,
  ProductSearchResult,
  VariantSearchResult
} from './KitComponentForm.schema';

// Import API hooks
import { useFetchProducts, useFetchProductVariants } from '@/app/hooks/api/products';

interface KitComponentFormProps {
  onSubmit: SubmitHandler<KitComponentFormData>;
  defaultValues?: Partial<KitComponentFormData>;
  productId: number;
  isLoading?: boolean;
}

export default function KitComponentForm({
  onSubmit,
  defaultValues,
  productId,
  isLoading = false
}: KitComponentFormProps) {
  const { t } = useTranslation();
  
  // State for product/variant search
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [variantSearchQuery, setVariantSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantSearchResult | null>(null);
  
  // Form setup with schema validation
  const { 
    control, 
    handleSubmit, 
    watch,
    setValue,
    formState: { errors } 
  } = useForm<KitComponentFormData>({
    resolver: zodResolver(kitComponentSchema),
    defaultValues: {
      type: KitComponentType.REQUIRED,
      quantity: 1,
      component_product_id: null,
      component_variant_id: null,
      ...defaultValues
    }
  });
  
  // Watch for form values that affect conditional rendering
  const componentType = watch('type');
  
  // Fetch products based on type (REGULAR for required components, PARENT for swappable groups)
  const { data: regularProducts, isLoading: isRegularProductsLoading } = useFetchProducts({
    product_type: 'REGULAR',
    search: productSearchQuery,
    is_active: true
  });
  
  const { data: parentProducts, isLoading: isParentProductsLoading } = useFetchProducts({
    product_type: 'PARENT',
    search: productSearchQuery,
    is_active: true
  });
  
  // Fetch variants for the selected product (if applicable)
  const { data: productVariants, isLoading: isVariantsLoading } = useFetchProductVariants(
    selectedProduct?.id || null,
    { search: variantSearchQuery }
  );
  
  // Effect to load selected product/variant data when editing
  useEffect(() => {
    const loadInitialData = async () => {
      if (defaultValues?.component_product_id) {
        // Load product data
        try {
          // This would be better with a dedicated API endpoint to fetch a single product
          const products = componentType === KitComponentType.REQUIRED 
            ? regularProducts?.results 
            : parentProducts?.results;
            
          if (products) {
            const product = products.find(p => p.id === defaultValues.component_product_id);
            if (product) {
              setSelectedProduct(product);
            }
          }
        } catch (error) {
          console.error('Error loading product data:', error);
        }
      }
      
      if (defaultValues?.component_variant_id && defaultValues?.component_product_id) {
        // Load variant data
        try {
          if (productVariants) {
            const variant = productVariants.find(v => v.id === defaultValues.component_variant_id);
            if (variant) {
              setSelectedVariant(variant);
            }
          }
        } catch (error) {
          console.error('Error loading variant data:', error);
        }
      }
    };
    
    loadInitialData();
  }, [defaultValues, regularProducts, parentProducts, productVariants, componentType]);
  
  // Get products based on component type
  const getProductOptions = (): ProductSearchResult[] => {
    if (componentType === KitComponentType.REQUIRED) {
      return regularProducts?.results || [];
    } else {
      return parentProducts?.results || [];
    }
  };
  
  // Get variants for the selected product
  const getVariantOptions = (): VariantSearchResult[] => {
    return productVariants || [];
  };
  
  // Handle product selection
  const handleProductSelect = (product: ProductSearchResult | null) => {
    setSelectedProduct(product);
    setValue('component_product_id', product?.id || null);
    
    // Clear variant selection if product changes
    if (selectedVariant) {
      setSelectedVariant(null);
      setValue('component_variant_id', null);
    }
  };
  
  // Handle variant selection
  const handleVariantSelect = (variant: VariantSearchResult | null) => {
    setSelectedVariant(variant);
    setValue('component_variant_id', variant?.id || null);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Component Type */}
          <Grid item xs={12}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl component="fieldset" error={!!errors.type}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('products.kit.componentType')}
                  </Typography>
                  <RadioGroup
                    {...field}
                    row
                  >
                    <FormControlLabel
                      value={KitComponentType.REQUIRED}
                      control={<Radio />}
                      label={t('products.kit.requiredComponent')}
                    />
                    <FormControlLabel
                      value={KitComponentType.SWAPPABLE}
                      control={<Radio />}
                      label={t('products.kit.swappableGroup')}
                    />
                  </RadioGroup>
                  {errors.type && (
                    <FormHelperText error>{errors.type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
          
          {/* Product/Variant Selection */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {componentType === KitComponentType.REQUIRED 
                ? t('products.kit.selectProductOrVariant')
                : t('products.kit.selectParentProduct')
              }
            </Typography>
            
            {/* Product Selection */}
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                id="product-select"
                options={getProductOptions()}
                loading={componentType === KitComponentType.REQUIRED 
                  ? isRegularProductsLoading 
                  : isParentProductsLoading
                }
                getOptionLabel={(option) => option.name}
                value={selectedProduct}
                onChange={(_, newValue) => handleProductSelect(newValue)}
                onInputChange={(_, newInputValue) => setProductSearchQuery(newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={componentType === KitComponentType.REQUIRED 
                      ? t('products.kit.product') 
                      : t('products.kit.parentProduct')
                    }
                    error={!!errors.component_product_id}
                    helperText={errors.component_product_id?.message}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {(isRegularProductsLoading || isParentProductsLoading) ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Box>
            
            {/* Variant Selection - Only show for REQUIRED type and when a product is selected */}
            {componentType === KitComponentType.REQUIRED && selectedProduct && (
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  id="variant-select"
                  options={getVariantOptions()}
                  loading={isVariantsLoading}
                  getOptionLabel={(option) => `${option.sku} (${option.product_name})`}
                  value={selectedVariant}
                  onChange={(_, newValue) => handleVariantSelect(newValue)}
                  onInputChange={(_, newInputValue) => setVariantSearchQuery(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('products.kit.variant')}
                      error={!!errors.component_variant_id}
                      helperText={errors.component_variant_id?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isVariantsLoading ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
            )}
          </Grid>
          
          {/* Quantity */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label={t('products.kit.quantity')}
                  fullWidth
                  inputProps={{ min: 1 }}
                  error={!!errors.quantity}
                  helperText={errors.quantity?.message}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    field.onChange(value);
                  }}
                />
              )}
            />
          </Grid>
          
          {/* Form Actions */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : defaultValues?.component_product_id ? (
                t('common.update')
              ) : (
                t('common.add')
              )}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </form>
  );
}
