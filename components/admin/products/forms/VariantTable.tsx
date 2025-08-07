'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import { DrawerProvider } from '@/app/contexts/DrawerContext';
import { useTranslation } from 'react-i18next';
import { 
  Add as AddIcon, 
  Visibility as VisibilityIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { useFormContext } from 'react-hook-form';
import { PublicationStatus, ProductVariant, ProductVariantFormData } from '@/app/types/products';
import { useCreateProduct, useFetchProductImages, useCreateProductVariant, useUpdateProductVariant, useDeleteProductVariant, useFetchProductVariants, useFetchProductVariant } from '@/app/hooks/api/products';
import { useFetchAttributes } from '@/app/hooks/api/attributes';
import { AttributesFilter } from '@/app/types/attributes';
import VariantForm from '@/app/components/admin/products/forms/VariantForm';
import { VariantFormData, AttributeWithOptions, ProductImage } from './VariantForm.schema';

interface OptionDetail {
  id: number;
  attribute_id: number;
  attribute_name: string;
  attribute_code: string;
  option_label: string;
  option_value: string;
}

interface ExtendedProductVariant extends ProductVariant {
  options_detail: OptionDetail[];
}

interface AttributeValue {
  value: any;
  is_deleted?: boolean;
}

interface VariantTableProps {
  productId?: number;
  variantDefiningAttributes?: number[];
  viewMode?: boolean;
  onEditModeRequest?: () => void; // Callback to request parent form to enter edit mode
  onProductIdChange?: (id: number) => void; // Callback to update parent form's product ID
}

export default function VariantTable({
  productId,
  variantDefiningAttributes,
  viewMode = false,
  onEditModeRequest,
  onProductIdChange
}: VariantTableProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftProductId, setDraftProductId] = useState<number | null>(productId || null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');
  const methods = useFormContext();
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [isLoadingVariant, setIsLoadingVariant] = useState(false);
  const drawerSidebarContent = {};

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);

  // Create product mutation
  const createProductMutation = useCreateProduct();
  
  // Create, update, delete variant mutations
  const createVariantMutation = useCreateProductVariant(draftProductId || productId || -1);
  const updateVariantMutation = useUpdateProductVariant(
    draftProductId || productId || -1, 
    selectedVariant?.id || -1
  );
  const deleteVariantMutation = useDeleteProductVariant(draftProductId || productId || -1);
  
  // Fetch variants
  const { data: variantsData, isLoading: isVariantsLoading } = useFetchProductVariants(
    draftProductId || productId || null
  );

  // Fetch single variant data when selectedVariantId changes
  const { data: variantDetailData, isLoading: isVariantDetailLoading } = useFetchProductVariant(
    draftProductId || productId || null,
    selectedVariantId
  );

  // Log the selected variant ID and API request status
  useEffect(() => {
    console.group('Variant Detail API Request');
    console.log('Selected Variant ID:', selectedVariantId);
    console.log('Product ID:', draftProductId || productId);
    console.log('Is Loading:', isVariantDetailLoading);
    console.groupEnd();
  }, [selectedVariantId, draftProductId, productId, isVariantDetailLoading]);

  // Update selectedVariant when variantDetailData is loaded
  useEffect(() => {
    if (variantDetailData && !isVariantDetailLoading) {
      console.group('Variant Detail Data Loaded');
      console.log('Variant Detail Data:', variantDetailData);
      console.log('Is Loading:', isVariantDetailLoading);
      
      // Process the options_detail array into the format expected by the form
      const processedOptions: Record<string, any> = {};
      
      // Cast to ExtendedProductVariant to access options_detail with proper typing
      const variantWithDetails = variantDetailData as ExtendedProductVariant;
      
      if (variantWithDetails.options_detail && Array.isArray(variantWithDetails.options_detail)) {
        variantWithDetails.options_detail.forEach((option: OptionDetail) => {
          // Map each option to its attribute_id
          processedOptions[option.attribute_id] = option.id;
        });
      }
      
      // Create a processed variant object with the correct structure for the form
      const processedVariant = {
        ...variantDetailData,
        options: processedOptions
      };
      
      console.log('Processed Variant for Form:', processedVariant);
      console.groupEnd();
      
      setSelectedVariant(processedVariant);
      setIsLoadingVariant(false);
    }
  }, [variantDetailData, isVariantDetailLoading]);

  // Create a filter for fetching variant defining attributes
  const attributesFilter = useMemo<AttributesFilter>(() => {
    if (!variantDefiningAttributes || variantDefiningAttributes.length === 0) {
      return {};
    }
    return {
      use_for_variants: true
    };
  }, [variantDefiningAttributes]);
  
  // Fetch attributes using the filter
  const { data: attributesData, isLoading: isAttributesLoading } = useFetchAttributes(attributesFilter);
  
  // Transform attributes to AttributeWithOptions format
  const variantAttributes = useMemo<AttributeWithOptions[]>(() => {
    if (!attributesData?.results || !variantDefiningAttributes) return [];
    
    return attributesData.results
      .filter(attr => variantDefiningAttributes.includes(attr.id))
      .map(attr => ({
        id: attr.id,
        name: attr.name,
        code: attr.code,
        data_type: attr.data_type,
        validation_rules: attr.validation_rules,
        is_required: attr.is_required,
        options: (attr.options || []).map(option => ({
          id: option.id,
          option_label: option.option_label,
          option_value: option.option_value
        }))
      }));
  }, [attributesData, variantDefiningAttributes]);
  
  // Prepare product ID for image fetching - ensure this is stable between renders
  const productIdForImages = useMemo(() => {
    return draftProductId || productId || -1;
  }, [draftProductId, productId]);
  
  // Fetch product images if we have a product ID
  const { data: productImagesData, isLoading: isImagesLoading } = useFetchProductImages(
    { productId: productIdForImages }
  );
  
  // Local notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  useEffect(() => {
    if (productId && variantDefiningAttributes && variantDefiningAttributes.length > 0) {
      console.log('Product ID and variant defining attributes available, opening drawer');
      console.log('Product ID:', productId);
      console.log('Variant defining attributes:', variantDefiningAttributes);
      
      // Log the fetched attribute data when it's available
      if (attributesData && attributesData.results) {
        const variantAttributes = attributesData.results.filter(
          attr => variantDefiningAttributes.includes(attr.id)
        );
        console.log('Variant defining attribute details:', variantAttributes);
      }
      
      handleOpenDrawer();
    }
  }, [productId, variantDefiningAttributes, attributesData]);

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedVariant(null);
    setDrawerMode('add');
    setActiveSidebarItem('view');
  };

  const handleAddVariant = async () => {
    // Request parent form to enter edit mode if callback is provided
    if (onEditModeRequest) {
      console.log('Requesting parent form to enter edit mode');
      onEditModeRequest();
    }
    
    // If we already have a product ID, pass it to the parent form
    if (draftProductId && onProductIdChange) {
      console.log('Updating parent form product ID to:', draftProductId);
      onProductIdChange(draftProductId);
    } else if (productId && onProductIdChange) {
      console.log('Updating parent form product ID to:', productId);
      onProductIdChange(productId);
    }
    
    if (draftProductId) {
      console.log('Opening variant modal for existing draft product:', draftProductId);
      console.log('Variant defining attributes:', variantDefiningAttributes);
      setDrawerMode('add');
      handleOpenDrawer();
      return;
    }
    
    if (productId) {
      console.log('Opening variant modal for existing product:', productId);
      setDrawerMode('add');
      handleOpenDrawer();
      return;
    }
    
    setIsDraftSaving(true);
    
    try {
      const formData = methods.getValues();
      
      const processedAttributeValues = Object.entries(formData.attributes || {})
        .filter(([attributeId, attrValue]) => {
          const attr = attrValue as AttributeValue;
          // Skip deleted attributes
          if (attr.is_deleted) return false;
          
          // Skip null/undefined values
          if (attr.value === null || attr.value === undefined) return false;
          
          // Skip empty strings
          if (attr.value === '') return false;
          
          // Skip variant-defining attributes
          const attrId = Number(attributeId);
          if ((formData.variant_defining_attributes && 
              formData.variant_defining_attributes.includes(attrId)) ||
              (variantDefiningAttributes && 
              variantDefiningAttributes.includes(attrId))) {
              return false;
          }
          
          return true;
        })
        .map(([attributeId, attrValue]) => {
          const attr = attrValue as AttributeValue;
          return {
            attribute: Number(attributeId),
            value: attr.value
          };
        });
      
      // Transfer parent_temp_images to temp_images if needed
      if (formData.parent_temp_images && formData.parent_temp_images.length > 0) {
        formData.temp_images = [...formData.parent_temp_images];
      }
      
      // Create a clean payload without parent_temp_images
      const { parent_temp_images, ...cleanFormData } = formData;
      
      const apiPayload = {
        ...cleanFormData,
        attribute_values_input: processedAttributeValues,
        variant_defining_attributes: variantDefiningAttributes || formData.variant_defining_attributes || [],
        attribute_groups: formData.attribute_groups || [],
        publication_status: PublicationStatus.DRAFT // Always DRAFT when creating via API
      };
      
      const result = await createProductMutation.mutateAsync(apiPayload as any);
      
      setDraftProductId(result.id);
      
      // Update parent form's product ID if callback is provided
      if (onProductIdChange && result.id) {
        console.log('Updating parent form product ID after creation to:', result.id);
        onProductIdChange(result.id);
      }
      
      setNotification({
        open: true,
        message: t('products.form.draftSuccess', 'Draft product created successfully. You can now add variants.'),
        severity: 'success'
      });
      
      console.log('Opening variant modal for new draft product:', result.id);
      setDrawerMode('add');
      handleOpenDrawer();
      
    } catch (error) {
      console.error('Failed to create draft product:', error);
      setNotification({
        open: true,
        message: t('products.form.draftError', 'Failed to create draft product'),
        severity: 'error'
      });
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Handle variant form submission
  const handleVariantSubmit = async (data: VariantFormData) => {
    try {
      console.log('Submitting variant data:', data);
      
      // Log the temp_images specifically to verify they're being received
      console.log('Temp images from form submission:', data.temp_images);
      
      const variantData: ProductVariantFormData = {
        sku: data.sku,
        display_price: data.display_price,
        quantity_on_hand: data.quantity_on_hand,
        is_active: data.is_active,
        options: [], // Will be populated with option IDs
        status_override: data.status_override,
        temp_images: data.temp_images || [] // Ensure temp_images is never undefined
      };
      
      // Convert options from record to array format
      if (data.options && typeof data.options === 'object') {
        // Extract option values (which should be option IDs) from the options object
        const optionValues = Object.values(data.options);
        
        // Filter out any null/undefined values and flatten arrays (for multi-select)
        const flattenedOptions = optionValues.flatMap(value => {
          // Handle multi-select (arrays of option IDs)
          if (Array.isArray(value)) {
            return value.filter(v => v !== null && v !== undefined);
          }
          // Handle single select (single option ID)
          return value !== null && value !== undefined ? [value] : [];
        });
        
        variantData.options = flattenedOptions;
      }
      
      console.log('Processed variant data for API:', JSON.stringify(variantData, null, 2));
      
      if (selectedVariant) {
        // Update existing variant
        // Note: We're no longer setting temp_images to an empty array for updates
        // This was causing the issue with images not being saved during updates
        
        console.log('Update variant data (with temp_images):', JSON.stringify(variantData, null, 2));
        await updateVariantMutation.mutateAsync(variantData);
        
        setNotification({
          open: true,
          message: t('products.variants.updateSuccess', 'Variant updated successfully'),
          severity: 'success'
        });
      } else {
        // Create new variant
        console.log('Create variant payload with temp_images:', JSON.stringify(variantData, null, 2));
        await createVariantMutation.mutateAsync(variantData);
        
        setNotification({
          open: true,
          message: t('products.variants.createSuccess', 'Variant created successfully'),
          severity: 'success'
        });
      }
      
      // Close drawer after successful submission
      handleCloseDrawer();
    } catch (error) {
      console.error('Error submitting variant:', error);
      setNotification({
        open: true,
        message: t('products.variants.submitError', 'Error saving variant'),
        severity: 'error'
      });
    }
  };
  
  // Handle variant deletion with confirmation
  const handleDeleteClick = (event: React.MouseEvent, variant: ProductVariant) => {
    // Stop propagation to prevent the card click event from firing
    event.stopPropagation();
    
    // Set the variant to delete and open the confirmation dialog
    setVariantToDelete(variant);
    setDeleteDialogOpen(true);
  };
  
  // Confirm deletion
  const confirmDelete = async () => {
    if (variantToDelete) {
      try {
        await deleteVariantMutation.mutateAsync(variantToDelete.id);
        
        setNotification({
          open: true,
          message: t('products.variants.deleteSuccess', 'Variant deleted successfully'),
          severity: 'success'
        });
        
        // Close the dialog
        setDeleteDialogOpen(false);
        setVariantToDelete(null);
      } catch (error) {
        console.error('Error deleting variant:', error);
        setNotification({
          open: true,
          message: t('products.variants.deleteError', 'Error deleting variant'),
          severity: 'error'
        });
      }
    }
  };
  
  // Cancel deletion
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setVariantToDelete(null);
  };

  // Handle edit variant
  const handleEditVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setDrawerMode('edit');
    setActiveSidebarItem('edit');
    handleOpenDrawer();
  };

  // Handle view variant - now fetches the latest data from API
  const handleViewVariant = (variant: ProductVariant) => {
    console.group('View Variant Clicked');
    console.log('Variant:', variant);
    console.log('Variant ID:', variant.id);
    console.log('Product ID:', draftProductId || productId);
    console.log('API Request will use Product ID:', draftProductId || productId || null);
    console.log('API Request will use Variant ID:', variant.id);
    console.log('API Endpoint:', `products/${draftProductId || productId}/variants/${variant.id}/`);
    console.groupEnd();
    
    setIsLoadingVariant(true);
    setSelectedVariantId(variant.id);
    setDrawerMode('view');
    setActiveSidebarItem('view');
    handleOpenDrawer();
  };

  const drawerSidebarIcons = useMemo(() => {
    // If in add mode, return empty array
    if (drawerMode === 'add') {
      return [];
    }
    
    // Only show icons in edit or view mode
    const icons = [
      { 
        id: 'view', 
        icon: <VisibilityIcon />, 
        tooltip: t('view'), 
        onClick: () => {
          setDrawerMode('view');
          setActiveSidebarItem('view');
        }
      }
    ];
    
    // Only add edit icon if not in view mode
    if (!viewMode) {
      icons.push({ 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('edit'), 
        onClick: () => {
          setDrawerMode('edit');
          setActiveSidebarItem('edit');
        }
      });
    }
    
    return icons;
  }, [drawerMode, t, viewMode]);

  return (
    <DrawerProvider>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{t('products.variants.productVariants')}</Typography>
          <Button 
            variant="contained" 
            startIcon={isDraftSaving ? <CircularProgress size={20} /> : <AddIcon />}
            onClick={handleAddVariant}
            disabled={isDraftSaving || viewMode}
          >
            {draftProductId 
              ? t('products.variants.addVariant') 
              : (isDraftSaving 
                ? t('products.form.savingDraft') 
                : t('products.form.startAddingVariants'))}
          </Button>
        </Box>

        {isVariantsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : variantsData?.results.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('products.variants.noVariantsFound')}
          </Alert>
        ) : (
          <Box>
            {/* Header Card */}
            <Paper
            elevation={0} 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between',
                backgroundColor: 'action.hover',
                mb: 1
              }}
            >
              <Box sx={{ width: '15%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('image')}</Typography>
              </Box>
              <Box sx={{ width: '20%', display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('sku')}</Typography>
              </Box>
              <Box sx={{ width: '20%', display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('name')}</Typography>
              </Box>
              <Box sx={{ width: '15%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('price')}</Typography>
              </Box>
              <Box sx={{ width: '15%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('status')}</Typography>
              </Box>
              <Box sx={{ width: '10%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="subtitle2">{t('actions')}</Typography>
              </Box>
            </Paper>
            
            {/* Variant Cards */}
            <Grid container spacing={2}>
              {variantsData?.results.map((variant: ProductVariant) => (
                <Grid item xs={12} key={variant.id}>
                  <Card 
                    sx={{ 
                      elevation: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                      }
                    }}
                    onClick={() => handleViewVariant(variant)}
                  >
                    <CardContent sx={{ p: 2 , alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ width: '15%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                          <Paper 
                            elevation={0} 
                            sx={{ 
                              width: 50, 
                              height: 50, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              backgroundColor: theme.palette.grey[200],
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                          >
                            {variant.images && variant.images.length > 0 ? (
                              <Box 
                                component="img"
                                src={variant.images[0].image}
                                alt={variant.images[0].alt_text || `${variant.sku} image`}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <ImageIcon sx={{ color: theme.palette.grey[400] }} />
                            )}
                          </Paper>
                        </Box>
                        <Box sx={{ width: '20%', display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">{variant.sku}</Typography>
                        </Box>
                        <Box sx={{ width: '20%', display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">{variant.options_display || '-'}</Typography>
                        </Box>
                        <Box sx={{ width: '15%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {variant.display_price}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '15%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {variant.is_active ? t('active') : t('inactive')}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '10%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => handleDeleteClick(e, variant)}
                            disabled={viewMode}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        <AnimatedDrawer
          open={isDrawerOpen}
          onClose={handleCloseDrawer}
          title={
            drawerMode === 'add' 
              ? t('products.variants.addVariant') 
              : drawerMode === 'edit'
                ? t('products.variants.editVariant')
                : t('products.variants.viewVariant')
          }
          initialWidth={550}
          expandedWidth={550}
          sidebarIcons={drawerSidebarIcons}
          sidebarContent={drawerSidebarContent}
          defaultSidebarItem={activeSidebarItem}
          onSave={drawerMode !== 'view' ? () => {
            // Submit the form programmatically
            const form = document.getElementById('variant-form');
            if (form) {
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          } : undefined}
          >
          <Box >
            {isLoadingVariant || isVariantDetailLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : variantAttributes.length > 0 ? (
              <VariantForm
                onSubmit={handleVariantSubmit}
                defaultValues={selectedVariant || undefined}
                parentProductAttributes={variantAttributes}
                parentProductImages={productImagesData?.results || []}
                isLoading={isAttributesLoading || isImagesLoading}
                parentProductId={productIdForImages}
                mode={drawerMode}
              />
            ) : (
              <Alert severity="warning">
                {t('products.variants.noAttributesAvailable', 'No variant attributes available')}
              </Alert>
            )}
          </Box>
        </AnimatedDrawer>

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })} 
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        </Snackbar>
        
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDelete}
          aria-labelledby="delete-variant-dialog-title"
          aria-describedby="delete-variant-dialog-description"
        >
          <DialogTitle id="delete-variant-dialog-title">
            {t('products.variants.confirmDelete', 'Confirm Deletion')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-variant-dialog-description" sx={{ mb: 2 }}>
              {t('products.variants.deleteWarning', 'Are you sure you want to delete this variant? This action cannot be undone.')}
            </DialogContentText>
            
            {variantToDelete && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('products.variants.variantDetails', 'Variant Details')}:
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('sku')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {variantToDelete.sku}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('name')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {variantToDelete.options_display || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('price')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {variantToDelete.display_price}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      {t('status')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {variantToDelete.is_active ? t('active') : t('inactive')}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete} color="primary">
              {t('cancel')}
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DrawerProvider>
  );
}
