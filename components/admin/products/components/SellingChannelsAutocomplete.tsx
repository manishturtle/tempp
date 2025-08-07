import { Controller, Control } from 'react-hook-form';
import { Autocomplete, Chip, FormControl, FormHelperText, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useActiveSellingChannels } from '@/app/hooks/api/useActiveGroupsSellingChannels';
import { useExclusionsChannels } from '@/app/hooks/api/store/useExclusionsChannels';

interface SellingChannelsAutocompleteProps {
  name: string;
  control: Control<any>;
  label: string;
  disabled?: boolean;
  selectedCategory?: { id: number } | null;
  selectedSubcategory?: { id: number } | null;
  productId?: number;
}

/**
 * Component for selecting selling channels with fixed options support.
 * Fixed options are determined by category, subcategory, or product exclusions.
 */
export const SellingChannelsAutocomplete = ({
  name,
  control,
  label,
  disabled = false,
  selectedCategory,
  selectedSubcategory,
  productId
}: SellingChannelsAutocompleteProps) => {
  const { t } = useTranslation();
  
  // Fetch all active selling channels
  const { data: allChannels, isLoading } = useActiveSellingChannels();
  
  // Prepare query parameters for exclusions channels based on hierarchy priority
  const exclusionsParams = (() => {
    // Helper function to extract ID from category/subcategory regardless of format
    const getCategoryId = (category: any): number | undefined => {
      if (!category) return undefined;
      if (typeof category === 'object' && category !== null) return category.id;
      if (typeof category === 'number') return category;
      return undefined;
    };
    
    // Get IDs regardless of whether they are direct IDs or objects with IDs
    const categoryId = getCategoryId(selectedCategory);
    const subcategoryId = getCategoryId(selectedSubcategory);
    
    // If we have product ID, we need either category or subcategory with it
    if (productId) {
      // If we have subcategory, use that with product (preferred)
      if (subcategoryId) {
        return { subcategory_id: subcategoryId, product_id: productId };
      }
      if (categoryId) {
        return { category_id: categoryId, product_id: productId };
      }
      return { product_id: productId };
    }
    
    // If we have subcategory, use that (without category)
    if (subcategoryId) {
      return { subcategory_id: subcategoryId };
    }
    
    // Fall back to category if available
    if (categoryId) {
      return { category_id: categoryId };
    }
    
    // Return empty object if nothing is selected
    return {};
  })();
  
  // Log the IDs for debugging
  useEffect(() => {
    console.log('SellingChannelsAutocomplete - IDs:', {
      productId,
      selectedCategory: typeof selectedCategory === 'object' ? selectedCategory?.id : selectedCategory,
      selectedSubcategory: typeof selectedSubcategory === 'object' ? selectedSubcategory?.id : selectedSubcategory,
      exclusionsParams // This shows what's actually being sent to the API
    });
  }, [productId, selectedCategory, selectedSubcategory, exclusionsParams]);
  
  // Only fetch if we have either a category or subcategory
  const shouldFetchChannels = Boolean(selectedCategory || selectedSubcategory);
  
  // Create an empty params object when we shouldn't fetch
  // This will be caught by the 'enabled: hasValidParams' check in the hook
  const safeParams = shouldFetchChannels ? exclusionsParams : {};
  
  // Fetch exclusions channels based on constructed params
  const { data: exclusionsData } = useExclusionsChannels(safeParams);

  // Extract fixed channel IDs from category_channels or subcategory_channels
  const fixedChannelIds = [
    ...(exclusionsData?.category_channels || []),
    ...(exclusionsData?.subcategory_channels || [])
  ];
  
  // Get ALL selected channel IDs from product_channels
  const allSelectedIds = exclusionsData?.product_channels || [];
  
  // Get only the editable channel IDs (those in product_channels but NOT in fixed channels)
  const editableChannelIds = allSelectedIds.filter(id => !fixedChannelIds.includes(id));
  
  // For debugging
  console.log('Fixed channel IDs:', fixedChannelIds);
  console.log('All selected IDs:', allSelectedIds);
  console.log('Editable channel IDs:', editableChannelIds);
  
  // Create full channel objects for fixed options
  const fixedOptions = (allChannels || []).filter(channel => 
    fixedChannelIds.includes(channel.id)
  );
  
  // Create full channel objects for editable options (the ones that can be removed)
  const editableOptions = (allChannels || []).filter(channel => 
    editableChannelIds.includes(channel.id)
  );
  
  // We'll handle fixed options directly in the component render
  
  return (
    <FormControl fullWidth error={false}>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value = [] }, fieldState: { error } }) => {
          // Convert value to array if it's not already
          const currentValue = Array.isArray(value) ? value : [];
          
          // Find the corresponding channel objects for the selected IDs
          let selectedChannels = (allChannels || []).filter(
            channel => currentValue.includes(channel.id)
          );
          
          // Start with currently selected channels from form value
          // Then ensure all fixed options are included
          const combinedOptions = [
            ...selectedChannels, // User's current selections from form
            ...fixedOptions.filter(option => !selectedChannels.some(sc => sc.id === option.id)) // Add any missing fixed options
          ];
          
          // This is what we'll show in the Autocomplete
          const initialValue = combinedOptions;
          
          // When loading a new product, we need to initialize the form with all channels from API response
          if (exclusionsData && currentValue.length === 0) {
            // Get all IDs that should be selected (both fixed and from product_channels)
            const allChannelIds = allSelectedIds; // From API response
            
            // Update the form value
            if (allChannelIds.length > 0) {
              // Use a setTimeout to avoid React state update conflicts
              setTimeout(() => {
                onChange(allChannelIds);
              }, 0);
            }
          }
          
          return (
            <>
              <Autocomplete
                multiple
                id={`${name}-autocomplete`}
                options={allChannels || []}
                loading={isLoading}
                size='small'
                disabled={disabled}
                getOptionLabel={(option) => option.segment_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={initialValue}
                onChange={(_, newValue) => {
                  // Get all user-selected channels that aren't fixed
                  const userSelectedOptions = newValue.filter(option => !fixedChannelIds.includes(option.id));
                  
                  // Display both fixed and user-selected channels in the UI
                  const displayValue = [
                    ...fixedOptions, // Fixed options from category/subcategory always included
                    ...userSelectedOptions // User's editable selections
                  ];
                  
                  // But only send user-selected channels to the form/API payload
                  // This ensures fixed channels from category/subcategory aren't included in API requests
                  onChange(userSelectedOptions.map(channel => channel.id));
                  
                  // This is a hack to update the displayed values while maintaining
                  // separate form values. We need to use setTimeout to avoid React batching
                  setTimeout(() => {
                    // Force the Autocomplete to re-render with our custom display value
                    const autocompleteEl = document.getElementById(`${name}-autocomplete`);
                    if (autocompleteEl) {
                      const event = new Event('change', { bubbles: true });
                      autocompleteEl.dispatchEvent(event);
                    }
                  }, 0);
                }}
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <Chip
                      label={option.segment_name}
                      {...getTagProps({ index })}
                      key={option.id}
                      disabled={fixedChannelIds.includes(option.id)}
                      sx={{
                        backgroundColor: fixedChannelIds.includes(option.id) ? 'grey.300' : undefined,
                        color: fixedChannelIds.includes(option.id) ? undefined : undefined,
                        fontWeight: fixedChannelIds.includes(option.id) ? 500 : undefined,
                        '& .MuiChip-deleteIcon': {
                          // Only show delete icon when not fixed AND not disabled
                          display: (fixedChannelIds.includes(option.id) || disabled) ? 'none !important' : undefined,
                          visibility: (fixedChannelIds.includes(option.id) || disabled) ? 'hidden' : 'visible',
                          opacity: (fixedChannelIds.includes(option.id) || disabled) ? 0 : 1
                        }
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={label}
                    error={!!error}
                    size="small"
                    placeholder={t('selectChannels')}
                  />
                )}
              />
              {error && (
                <FormHelperText>{error.message}</FormHelperText>
              )}
            </>
          );
        }}
      />
    </FormControl>
  );
};

export default SellingChannelsAutocomplete;
