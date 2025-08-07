/**
 * Subcategory Form Component
 * 
 * Form for creating and editing subcategories in the catalogue
 */
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  FormControl,
  Autocomplete,
  InputAdornment,
  Stack,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import { subcategorySchema, SubcategoryFormValues } from '../schemas';
import { useFetchCategoriesNoPagination } from '@/app/hooks/api/catalogue';
import { Category, Subcategory } from '@/app/types/catalogue';
import Grid from '@mui/material/Grid';
import { ImageManager } from '@/app/components/admin/products/forms/ImageManager';
import { ImageData } from '@/app/components/admin/products/forms/ImageUploader';
import { useTranslation } from 'react-i18next';
import { useActiveSellingChannels } from '@/app/hooks/api/useActiveGroupsSellingChannels';
import { useExclusionsChannels } from '@/app/hooks/api/store/useExclusionsChannels';

interface SubcategoryFormProps {
  defaultValues?: Partial<Subcategory>;
  onSubmit: (data: SubcategoryFormValues) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const SubcategoryForm = React.forwardRef<{ submitForm: () => void }, SubcategoryFormProps>((props, ref) => {
  const {
    defaultValues,
    onSubmit,
    isSubmitting = false,
    readOnly = false
  } = props;
  
  // Check if we're in edit mode (has an existing id) or create mode
  const isEditMode = !!defaultValues?.id;

  // Convert existing image to ImageData format if it exists
  const initialImages: ImageData[] = [];
  if (defaultValues?.image) {
    initialImages.push({
      id: 'existing-image',
      alt_text: defaultValues.image_alt_text || '',
      sort_order: 0,
      is_default: true,
      image: defaultValues.image
    });
  }
  const { t } = useTranslation();

  // State for managing images
  const [images, setImages] = useState<ImageData[]>(initialImages);
  
  // Reference to the current image URL to check if it's been deleted
  const imageUrlRef = useRef(defaultValues?.image || '');

  // Fetch categories for the dropdown (without pagination)
  const { data: categoriesData, isLoading: isLoadingCategories } = useFetchCategoriesNoPagination();
  
  // Fetch selling channels
  const { data: sellingChannelsData, isLoading: isLoadingSellingChannels } = useActiveSellingChannels();
  
  // State for fixed channel IDs from the selected category
  const [fixedChannelIds, setFixedChannelIds] = useState<number[]>([]);
  
  // Track if we've set the fixed channels
  const hasSetFixedChannels = useRef(false);
  
  // Get selling channel options
  const sellingChannelOptions = useMemo(() => {
    console.log("Selling channels data:", sellingChannelsData);
    if (!sellingChannelsData) return [];
    return sellingChannelsData.map(channel => ({
      id: channel.id,
      name: channel.segment_name || `Channel ${channel.id}`
    }));
  }, [sellingChannelsData]);
  
  // Helper function to get selected options from values
  const getSelectedOptions = (values: number[]) => {
    return sellingChannelOptions.filter(option => values.includes(option.id));
  };
  
  // Previous isSubmitting state to detect changes
  const prevIsSubmittingRef = React.useRef(isSubmitting);
  
  // Find the selected category object based on the category ID
  const findCategoryById = useCallback((categoryId: number): Category | null => {
    if (!categoriesData || !Array.isArray(categoriesData)) return null;
    return categoriesData.find(cat => cat.id === categoryId) || null;
  }, [categoriesData]);
  
  // Effect to listen for image deletion events
  useEffect(() => {
    const handleImageDeleted = (event: CustomEvent) => {
      // Check if this is a subcategory image deletion event
      if (event.detail?.ownerType === 'subcategory' && event.detail?.success) {
        console.log('Subcategory image deleted event received');
        
        // Clear the imageUrlRef so it doesn't get included in form submission
        imageUrlRef.current = '';
        
        // Also ensure the form setValue is updated to clear the image field
        setValue('image', '');
      }
    };
    
    // Add event listener as a custom event
    document.addEventListener('image-deleted' as any, handleImageDeleted as EventListener);
    
    // Cleanup function
    return () => {
      document.removeEventListener('image-deleted' as any, handleImageDeleted as EventListener);
    };
  }, []);
  
  // Handle fixed selling channels when category changes
 
  // Initialize form with react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      is_active: defaultValues?.is_active ?? true,
      category: defaultValues?.category || 0,
      image: defaultValues?.image || "",
      image_alt_text: defaultValues?.image_alt_text || "",
      customer_group_selling_channel_ids: Array.isArray(defaultValues?.customer_group_selling_channel_ids) 
        ? defaultValues.customer_group_selling_channel_ids 
        : [],
      sort_order: defaultValues?.sort_order ?? 0,
      temp_images: []
    }
  });
  // Debug logging to see what's coming from the API
  useEffect(() => {
    console.log('Categories data from API:', categoriesData);
    console.log('Default values:', defaultValues);
  }, [categoriesData, defaultValues]);

  // Watch for category changes
  const watchCategory = watch('category');
  
  // Use the exclusions channels hook to fetch fixed channels for the selected category
  const { data: exclusionChannelsData, isLoading: isLoadingExclusionChannels } = useExclusionsChannels({
    category_id: watchCategory ? Number(watchCategory) : undefined,
  });
  
  // Update fixed channels when exclusion data changes or category changes
  useEffect(() => {
    console.log("Category changed or exclusion data updated:", { watchCategory, exclusionChannelsData });
    
    if (watchCategory && exclusionChannelsData?.category_channels?.length) {
      const categoryChannels = exclusionChannelsData.category_channels;
      console.log("Category exclusion channels from API:", categoryChannels);
      
      // Get existing channel IDs from defaultValues (if any)
      const existingChannelIds = defaultValues?.customer_group_selling_channel_ids || [];
      console.log("Existing channel IDs from defaultValues:", existingChannelIds);
      
      // Combine existing form values with fixed channels from API
      const combinedChannelIds = Array.from(new Set([...categoryChannels, ...existingChannelIds]));
      
      // Update fixed channel IDs for UI display
      setFixedChannelIds(categoryChannels || []);
      
      // Always update the form field with combined channels when fixed channels change
      console.log("Updating form with combined channels:", combinedChannelIds);
      setValue('customer_group_selling_channel_ids', combinedChannelIds, { 
        shouldValidate: true 
      });
      
      // Mark that we've set the fixed channels
      hasSetFixedChannels.current = true;
    } else {
      // No fixed channels for this category, clear any previously set fixed channels
      console.log("No fixed channels found for category");
      setFixedChannelIds([]);
      
      // If we have existing channels but no fixed channels, ensure they're preserved
      if (defaultValues?.customer_group_selling_channel_ids?.length) {
        setValue('customer_group_selling_channel_ids', defaultValues.customer_group_selling_channel_ids, {
          shouldValidate: true
        });
      }
    }
  }, [watchCategory, exclusionChannelsData, setValue, defaultValues]);
  
  // Monitor exclusion channels loading state for debugging
  useEffect(() => {
    console.log("Exclusion channels loading state:", { isLoadingExclusionChannels });
  }, [isLoadingExclusionChannels]);
  
  // Effect to trigger form submission when isSubmitting changes from false to true
  useEffect(() => {
    const wasSubmitting = prevIsSubmittingRef.current;
    prevIsSubmittingRef.current = isSubmitting;
    
    // Only trigger submission if isSubmitting changed from false to true
    if (isSubmitting && !wasSubmitting && !readOnly) {
      console.log('Triggering form submission from drawer save button');
      // Validate all fields and then submit the form
      trigger().then(isValid => {
        if (isValid) {
          handleSubmit(onSubmitHandler)();
        } else {
          console.error('Form validation failed');
        }
      });
    }
  }, [isSubmitting, readOnly, trigger, handleSubmit]);
  
  // Filter active categories for new subcategories, but show all for editing
  const filteredCategories = useMemo(() => {
    // Ensure categoriesData is always an array
    if (!categoriesData) return [] as Category[];
    if (!Array.isArray(categoriesData)) {
      console.error('Expected categoriesData to be an array but got:', typeof categoriesData);
      return [] as Category[];
    }
    
    const categories = categoriesData as Category[];
    console.log('Processed categories:', categories);
    
    // For editing show all categories, for new show only active ones
    if (defaultValues?.id) {
      return categories;
    } else {
      return categories.filter((cat: Category) => cat.is_active);
    }
  }, [categoriesData, defaultValues?.id]);
  
  // Track if form is being submitted to prevent double submission
  const isSubmittingRef = React.useRef(false);

  // Handle image changes
  const handleImagesChange = (newImages: ImageData[]) => {
    setImages(newImages);
    
    // Update temp_images in the form data
    // Only include temp images (those with IDs that don't start with 'existing-')
    const tempImages = newImages.filter(img => !img.id.startsWith('existing-'));
    setValue('temp_images', tempImages);
    
    console.log('Updated images:', newImages);
    console.log('Temp images for submission:', tempImages);
  };

  // Custom submit handler to remove is_active in create mode and exclude fixed channels from API payload
  const onSubmitHandler = (data: SubcategoryFormValues) => {
    console.log('Form submitted with data:', data);
    
    // Prevent double submission
    if (isSubmittingRef.current) {
      console.log('Already submitting, ignoring duplicate submission');
      return;
    }
    
    isSubmittingRef.current = true;
    
    try {
      // Clone the data to avoid mutating the original
      const submissionData = { ...data };
      
      // Ensure numeric fields are properly converted to numbers
      submissionData.category = typeof submissionData.category === 'string' 
        ? parseInt(submissionData.category, 10) 
        : submissionData.category;
      
      submissionData.sort_order = typeof submissionData.sort_order === 'string' 
        ? parseInt(submissionData.sort_order, 10) 
        : submissionData.sort_order;
      
      // Remove fixed channel IDs from the submission - these should be view only
      if (fixedChannelIds.length > 0 && Array.isArray(submissionData.customer_group_selling_channel_ids)) {
        // Only include channel IDs that are not fixed (from category)
        submissionData.customer_group_selling_channel_ids = submissionData.customer_group_selling_channel_ids
          .filter(id => !fixedChannelIds.includes(id));
        
        console.log('Filtered out fixed channel IDs for submission:', {
          original: data.customer_group_selling_channel_ids,
          fixedChannelIds,
          filtered: submissionData.customer_group_selling_channel_ids
        });
      }
      
      // Remove is_active field if not in edit mode
      if (!isEditMode) {
        const { is_active, ...dataWithoutIsActive } = submissionData;
        onSubmit(dataWithoutIsActive as SubcategoryFormValues);
      } else {
        // In edit mode, send all data including is_active
        onSubmit(submissionData);
      }
    } finally {
      // Reset submission flag after a short delay to prevent accidental double clicks
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  };
  
  // Expose submitForm method via ref
  React.useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSubmit(onSubmitHandler)();
    }
  }));


  return (
    <Box component="form" onSubmit={handleSubmit(onSubmitHandler)} noValidate>      
      <Grid container spacing={3}>
        <Grid size={12}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('name')}
                size="small"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={readOnly}
              />
            )}
          />
        </Grid>
        
        <Grid size={12}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.category} size="small">
                <Autocomplete
                  options={Array.isArray(filteredCategories) ? filteredCategories : []}
                  value={field.value && Array.isArray(filteredCategories) ? 
                    filteredCategories?.find(cat => cat && cat.id === field.value) || null : null}
                  getOptionLabel={(option) => {
                    // Handle both object and primitive value
                    if (typeof option === 'object' && option !== null) {
                      return option.name || '';
                    }
                    // If it's just an ID, find the matching category
                    if (Array.isArray(filteredCategories)) {
                      const category = filteredCategories?.find(cat => cat && cat.id === option);
                      return category ? category.name : '';
                    }
                    return '';
                  }}
                  isOptionEqualToValue={(option, value) => {
                    // Handle null or undefined values
                    if (!option || !value) return false;
                    
                    // Both are objects with id property
                    if (typeof option === 'object' && option !== null && 
                        typeof value === 'object' && value !== null) {
                      return option.id === value.id;
                    }
                    
                    // Option is object, value is number/string (ID)
                    if (typeof option === 'object' && option !== null && 
                        (typeof value === 'number' || typeof value === 'string')) {
                      return option.id === value;
                    }
                    
                    // Option is number/string (ID), value is object
                    if ((typeof option === 'number' || typeof option === 'string') && 
                        typeof value === 'object' && value !== null) {
                      return option === value.id;
                    }
                    
                    // Both are primitive values
                    return option === value;
                  }}
                  onChange={(_, newValue) => {
                    // Handle both object and primitive value safely
                    if (typeof newValue === 'object' && newValue !== null) {
                      field.onChange(newValue.id);
                    } else if (newValue === null) {
                      // Clear selection
                      field.onChange(null);
                    } else {
                      // Primitive value (likely ID)
                      field.onChange(newValue);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('category')}
                      size="small"
                      required
                      error={!!errors.category}
                      helperText={errors.category?.message}
                      disabled={readOnly}
                    />
                  )}
                  disabled={readOnly || isLoadingCategories}
                  loading={isLoadingCategories}
                  loadingText="Loading categories..."
                />
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid size={12}>
          <Autocomplete
            options={[
              { id: 1, name: 'Approval Workflow' },
              { id: 2, name: 'Review Workflow' },
              { id: 3, name: 'Publication Workflow' }
            ]}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('workflow')}
                size="small"
                fullWidth
                disabled={readOnly}
              />
            )}
            disabled={readOnly}
          />
        </Grid>
        
        {/* Selling Channels */}
        <Grid size={12}>
          <Controller
            name="customer_group_selling_channel_ids"
            control={control}
            render={({ field: { onChange, value = [] } }) => {
              // Get the currently selected values from the form
              const selectedValues = Array.isArray(value) ? value : [];
              const fixedValues = fixedChannelIds;
              
              // Combine fixed values with current values, ensuring no duplicates
              const allValues = Array.from(new Set([...fixedValues, ...selectedValues]));
              
              // Get the full option objects for the selected values
              const selectedOptions = sellingChannelOptions.filter(option => 
                allValues.includes(option.id)
              );
              
              console.log("Rendering Autocomplete with:", {
                allValues,
                fixedValues,
                selectedValues,
                selectedOptions
              });
              
              return (
                <Autocomplete
                  key={`selling-channels-${fixedValues.join(',')}`}
                  multiple
                  options={sellingChannelOptions}
                  getOptionLabel={(option) => option.name}
                  loading={isLoadingSellingChannels}
                  value={selectedOptions}
                  onChange={(_, newValue) => {
                    console.log("Autocomplete onChange:", newValue);
                    
                    // Get only the IDs that are not in fixedValues
                    const additionalValues = newValue
                      .filter(opt => !fixedValues.includes(opt.id))
                      .map(opt => opt.id);
                    
                    // Combine fixed values with newly selected values
                    const newSelected = [...fixedValues, ...additionalValues];
                    
                    console.log("New selected values:", newSelected);
                    onChange(newSelected);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("excludedSegmentName")}
                      placeholder={isLoadingSellingChannels ? "Loading selling channels..." : "Select selling channels"}
                      error={!!errors.customer_group_selling_channel_ids}
                      helperText={errors.customer_group_selling_channel_ids?.message}
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {isLoadingSellingChannels ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const isFixed = fixedValues.includes(option.id);
                      return (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={option.name}
                          onDelete={isFixed ? undefined : getTagProps({ index }).onDelete}
                          style={{
                            opacity: isFixed ? 0.7 : 1,
                          }}
                        />
                      );
                    })
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  disabled={readOnly}
                />
              );
            }}
          />
        </Grid>
        
        <Grid size={12}>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('description')}
                fullWidth
                multiline
                rows={4}
                size="small"
                error={!!errors.description}
                helperText={errors.description?.message}
                disabled={readOnly}
              />
            )}
          />
        </Grid>
        
          <Grid size={12}>
          
          
          {/* Image Manager Component */}
          <Box sx={{ mt: 2 }}>
            <ImageManager
              images={images}
              onImagesChange={handleImagesChange}
              ownerType="subcategory"
              disabled={readOnly || isSubmitting}
              maxImages={1} // Only one image allowed for subcategories
            />
          </Box>
          
          {/* Hidden fields to maintain compatibility with the form */}
          <Controller
            name="image"
            control={control}
            render={({ field }) => (
              <input 
                type="hidden" 
                name={field.name}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                value={field.value || ''} 
              />
            )}
          />
          
          <Controller
            name="image_alt_text"
            control={control}
            render={({ field }) => (
              <input 
                type="hidden" 
                name={field.name}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                value={field.value || ''} 
              />
            )}
          />
          
          {/* We don't render temp_images as a hidden input since it's an array */}
          {/* It will be handled in the form submission logic */}
        </Grid>
        
          <Grid size={12}>
          <Controller
            name="sort_order"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('sortOrder')}
                type="number"
                fullWidth
                error={!!errors.sort_order}
                helperText={errors.sort_order?.message}
                disabled={readOnly}
                size="small"
                inputProps={{ min: 0 }}
                onChange={(e) => {
                  // Convert empty string to 0
                  if (e.target.value === '') {
                    field.onChange(0);
                    return;
                  }
                  
                  // Ensure value is a number
                  const numValue = parseInt(e.target.value, 10);
                  field.onChange(numValue);
                }}
              />
            )}
          />
        </Grid>
        
        {/* Only show is_active field in edit mode */}
        {isEditMode && (
          <Grid size={12}>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label={t('active')}
                />
              )}
            />
          </Grid>
        )}
        
      </Grid>
    </Box>
  );
});

export default SubcategoryForm;
