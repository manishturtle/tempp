/**
 * Category Form Component
 *
 * Form for creating and editing categories in the catalogue
 */
import React, {
  useMemo,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Chip,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { categorySchema, CategoryFormValues } from "../schemas";
import { useFetchDivisionsNoPagination } from "@/app/hooks/api/catalogue";
import { useFetchTaxRateProfiles } from "@/app/hooks/api/pricing";
import { Division, Category } from "@/app/types/catalogue";
import { TaxRateProfile } from "@/app/types/pricing";
import { ImageManager } from "@/app/components/admin/products/forms/ImageManager";
import { ImageData } from "@/app/components/admin/products/forms/ImageUploader";
import { useTranslation } from "react-i18next";
import { useActiveSellingChannels } from "@/app/hooks/api/useActiveGroupsSellingChannels";

interface CategoryFormProps {
  defaultValues?: Partial<Category>;
  onSubmit: (data: CategoryFormValues) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const CategoryForm = forwardRef<{ submitForm: () => void }, CategoryFormProps>(
  (
    { defaultValues, onSubmit, isSubmitting = false, readOnly = false },
    ref
  ) => {
    // Check if we're in edit mode (has an existing id) or create mode
    const isEditMode = !!defaultValues?.id;
    const { t } = useTranslation();
    const [fixedChannelIds, setFixedChannelIds] = useState<number[]>([]);

    // Convert existing image to ImageData format if it exists
    const initialImages: ImageData[] = [];
    if (defaultValues?.image) {
      initialImages.push({
        id: "existing-image",
        alt_text: defaultValues.image_alt_text || "",
        sort_order: 0,
        is_default: true,
        image: defaultValues.image,
      });
    }
    const { data: sellingChannelsData, isLoading: isLoadingSellingChannels } =
      useActiveSellingChannels();

    // State for managing images
    const [images, setImages] = useState<ImageData[]>(initialImages);

    // Fetch divisions for the dropdown without pagination
    const { data: divisionsData, isLoading: isLoadingDivisions } =
      useFetchDivisionsNoPagination();

    // Fetch tax rate profiles for the dropdown
    const { data: taxRateProfilesData, isLoading: isLoadingTaxRateProfiles } =
      useFetchTaxRateProfiles();

    // Add debugging logs
    console.log("Raw divisions data:", divisionsData);
    console.log("Is array?", Array.isArray(divisionsData));

    // Filter active divisions for new categories, but show all for editing
    const filteredDivisions = useMemo(() => {
      if (!divisionsData || !Array.isArray(divisionsData)) {
        console.log("No divisions data or invalid format");
        return [];
      }

      // Get divisions directly from the non-paginated response
      const divisions = divisionsData;
      console.log("Filtered divisions:", divisions);

      // If editing, show all divisions, otherwise only show active ones
      if (defaultValues?.division) {
        return divisions;
      } else {
        return divisions.filter((division) => division.is_active);
      }
    }, [divisionsData, defaultValues?.division]);

    const {
      control,
      handleSubmit,
      formState: { errors },
      reset,
      setValue,
      watch,
      getValues,
    } = useForm<CategoryFormValues>({
      resolver: zodResolver(categorySchema),
      defaultValues: {
        name: defaultValues?.name || "",
        description: defaultValues?.description || "",
        is_active: defaultValues?.is_active ?? true,
        division: defaultValues?.division || 0,
        default_tax_rate_profile: defaultValues?.default_tax_rate_profile || null,
        customer_group_selling_channel_ids: defaultValues?.customer_group_selling_channel_ids || [],
        tax_inclusive: defaultValues?.tax_inclusive ?? false,
        sort_order: defaultValues?.sort_order ?? 0,
        temp_images: [],
      },
    });

    // Log errors whenever they change to help debug form validation issues
    useEffect(() => {
      if (Object.keys(errors).length > 0) {
        console.log("Form validation errors:", errors);
      }
    }, [errors]);

    // Handle image changes
    const handleImagesChange = (newImages: ImageData[]) => {
      setImages(newImages);

      // Update temp_images in the form data
      // Only include temp images (those with IDs that don't start with 'existing-')
      const tempImages = newImages.filter(
        (img) => !img.id.startsWith("existing-")
      );
      setValue("temp_images", tempImages);

      // If there's a default image, update image_alt_text
      const defaultImage = newImages.find((img) => img.is_default);
      if (defaultImage) {
        setValue("image_alt_text", defaultImage.alt_text);
      }
    };

    // Custom submit handler to include temp_images and handle form submission
    // Exclude fixed channel IDs from submission as they're view-only
    const handleFormSubmit = (data: CategoryFormValues) => {
      console.log("Form submitted with data:", data);

      // Add temp_images data from state
      const tempImages = images.filter(
        (img) => !img.id.startsWith("existing-")
      );
      console.log("Temp images to include:", tempImages);

      // Clone data to avoid mutating the original
      const processedData = { ...data };
      
      // Remove fixed channel IDs from submission - these should be view only
      if (fixedChannelIds.length > 0 && Array.isArray(processedData.customer_group_selling_channel_ids)) {
        // Only include channel IDs that are not fixed
        processedData.customer_group_selling_channel_ids = processedData.customer_group_selling_channel_ids
          .filter(id => !fixedChannelIds.includes(id));
        
        console.log('Filtered out fixed channel IDs for submission:', {
          original: data.customer_group_selling_channel_ids,
          fixedChannelIds,
          filtered: processedData.customer_group_selling_channel_ids
        });
      }

      // Prepare form data with proper types
      const formData: CategoryFormValues = {
        ...processedData,
        is_active: isEditMode ? processedData.is_active : true, // Set default true for new categories
        temp_images: tempImages,
        // Remove default_tax_rate as it's no longer part of the form values
        default_tax_rate_profile: processedData.default_tax_rate_profile || null,
      };

      console.log("Processed form data:", formData);
      onSubmit(formData);
    };

    // Helper function to find a division by ID
    const findDivisionById = (divisionId: number) => {
      if (!divisionId) {
        console.log("No division ID provided");
        return null;
      }

      if (!divisionsData || !Array.isArray(divisionsData)) {
        console.log("No divisions data available or invalid format");
        return null;
      }

      const division = divisionsData.find((div) => div.id === divisionId);
      console.log("Found division:", division || "Not found");
      return division || null;
    };

    // Get the current division value for the Autocomplete
    const currentDivision = useMemo(() => {
      const divisionId = watch("division");
      return divisionId ? findDivisionById(Number(divisionId)) : null;
    }, [watch("division"), divisionsData]);

    // Helper function to find a tax rate profile by ID
    const findTaxRateProfileById = (profileId: number) => {
      if (!profileId) {
        return null;
      }

      if (
        !taxRateProfilesData?.results ||
        !Array.isArray(taxRateProfilesData.results)
      ) {
        return null;
      }

      const profile = taxRateProfilesData.results.find(
        (profile) => profile.id === profileId
      );
      return profile || null;
    };

    // Get the current tax rate profile value for the Autocomplete
    const defaultTaxRateProfileId = watch("default_tax_rate_profile");
    const isActive = watch("is_active");

    const currentTaxRateProfile = useMemo(() => {
      console.log("Current profile ID:", defaultTaxRateProfileId);
      console.log("Available tax rate profiles:", taxRateProfilesData?.results);
      const profile = defaultTaxRateProfileId
        ? findTaxRateProfileById(Number(defaultTaxRateProfileId))
        : null;
      console.log("Found profile:", profile);
      return profile;
    }, [defaultTaxRateProfileId, taxRateProfilesData, findTaxRateProfileById]);

    // Set default tax rate profile when data loads
    useEffect(() => {
      if (
        defaultValues?.default_tax_rate_profile &&
        taxRateProfilesData?.results
      ) {
        // First, check if we already have a value set
        const currentValue = getValues("default_tax_rate_profile");
        if (!currentValue) {
          const profile = findTaxRateProfileById(
            Number(defaultValues.default_tax_rate_profile)
          );
          if (profile) {
            console.log("Setting default tax rate profile:", profile);
            setValue("default_tax_rate_profile", profile.id, {
              shouldValidate: true,
            });
          }
        }
      }
    }, [
      defaultValues?.default_tax_rate_profile,
      taxRateProfilesData,
      setValue,
      getValues,
      findTaxRateProfileById,
    ]);

    // Expose the submitForm function to parent component
    useImperativeHandle(ref, () => ({
      submitForm: handleSubmit(handleFormSubmit),
    }));

    // Use a ref to track if we've already set the fixed channels
    const hasSetFixedChannels = React.useRef(false);

    // Set fixed selling channels when component mounts in edit mode with a pre-selected division
    useEffect(() => {
      if (defaultValues?.division && !hasSetFixedChannels.current) {
        const division = findDivisionById(Number(defaultValues.division));
        if (division?.customer_group_selling_channels) {
          const fixedChannelIds = division.customer_group_selling_channels.map((channel: { id: number }) => channel.id);
          console.log("Fixed channels from division:", fixedChannelIds);
          
          // Get existing channel IDs from defaultValues (if any)
          const existingChannelIds = defaultValues.customer_group_selling_channel_ids || [];
          console.log("Existing channel IDs from defaultValues:", existingChannelIds);
          
          // Combine fixed channels with any additional channels from defaultValues
          const allChannelIds = Array.from(new Set([...fixedChannelIds, ...existingChannelIds]));
          
          // Only update if the values are different
          setFixedChannelIds(prevIds => {
            if (JSON.stringify(prevIds) !== JSON.stringify(fixedChannelIds)) {
              return fixedChannelIds;
            }
            return prevIds;
          });
          
          // Update the form field with combined channels
          if (JSON.stringify(allChannelIds) !== JSON.stringify(existingChannelIds)) {
            console.log("Updating form with combined channels:", allChannelIds);
            setValue('customer_group_selling_channel_ids', allChannelIds, { shouldValidate: true });
          }
          
          // Mark that we've set the fixed channels
          hasSetFixedChannels.current = true;
        }
      }
    }, [defaultValues?.division, defaultValues?.customer_group_selling_channel_ids, findDivisionById, setValue]);

    return (
      <Box
        component="form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
      >
        <Grid container spacing={3}>
          <Grid size={12}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("Category Name")}
                  fullWidth
                  size="small"
                  required
                  error={!readOnly && !!errors.name}
                  helperText={!readOnly && errors.name?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly,
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={12}>
            <FormControl
              fullWidth
              error={!readOnly && !!errors.division}
              size="small"
            >
              <Autocomplete
                id="division-autocomplete"
                options={filteredDivisions || []}
                getOptionLabel={(option: Division) => option.name || "Unknown"}
                loading={isLoadingDivisions}
                disabled={readOnly || isLoadingDivisions}
                value={currentDivision}
                onChange={(_, newValue: Division | null) => {
                  console.log("Selected Division:", newValue);
                
                  // Extract fixed channel IDs from the selected division
                  const channelIds = newValue?.customer_group_selling_channels?.map(
                    channel => channel.id
                  ) || [];
                  
                  console.log("Fixed Channel IDs:", channelIds);
                  setFixedChannelIds(channelIds);
                
                  // Set the initial value for customer_group_selling_channel_ids
                  setValue("customer_group_selling_channel_ids", channelIds, {
                    shouldValidate: true,
                  });
                
                  setValue("division", newValue?.id || 0, {
                    shouldValidate: true,
                  });
                }}
                isOptionEqualToValue={(option, value) =>
                  option.id === value?.id
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("division")}
                    size="small"
                    variant="outlined"
                    error={!readOnly && !!errors.division}
                    helperText={!readOnly && errors.division?.message}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {isLoadingDivisions ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
              />
              {!readOnly && errors.division && (
                <FormHelperText>
                  {errors.division.message as string}
                </FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Selling Channels Field - Fixed Options */}
          <Grid size={12}>
            <Controller
              name="customer_group_selling_channel_ids"
              control={control}
              render={({ field: { onChange, value = [] } }) => {
                
                // Map the data to the expected format
                const SELLING_CHANNELS = (sellingChannelsData || []).map(channel => ({
                  id: channel.id,
                  name: channel.segment_name // Using segment_name as the display name
                }));
              
                const FIXED_OPTIONS = SELLING_CHANNELS.filter(channel => 
                  fixedChannelIds.includes(channel.id)
                );
              
                // Rest of your component remains the same
                const selectedValues = Array.isArray(value) ? value : [];
                const fixedValues = FIXED_OPTIONS.map(opt => opt.id);
                const combinedValues = [...new Set([...fixedValues, ...selectedValues])];
              
                if (JSON.stringify(combinedValues) !== JSON.stringify(selectedValues)) {
                  onChange(combinedValues);
                }
              
                return (
                  <Autocomplete
                    multiple
                    options={SELLING_CHANNELS}
                    getOptionLabel={(option) => option.name}
                    loading={isLoadingSellingChannels}
                    value={SELLING_CHANNELS.filter(option => 
                      combinedValues.includes(option.id)
                    )}
                    onChange={(_, newValue) => {
                      // Combine fixed options with newly selected values
                      const newSelected = [
                        ...fixedChannelIds, // Always include fixed options
                        ...newValue
                          .filter(opt => !fixedChannelIds.includes(opt.id)) // Don't include fixed options again
                          .map(opt => opt.id)
                      ];
                      onChange(newSelected);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("excludedSegmentName")}
                        placeholder={
                          isLoadingSellingChannels 
                            ? "Loading selling channels..." 
                            : "Select selling channels"
                        }
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
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          {...getTagProps({ index })}
                          key={option.id}
                          size="small"
                          onDelete={
                            FIXED_OPTIONS.some(opt => opt.id === option.id)
                              ? undefined
                              : getTagProps({ index }).onDelete
                          }
                          style={{
                            opacity: FIXED_OPTIONS.some(opt => opt.id === option.id) ? 0.7 : 1,
                          }}
                        />
                      ))
                    }
                    isOptionEqualToValue={(option, value) => option.id === value.id}
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
                  label={t("description")}
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  error={!readOnly && !!errors.description}
                  helperText={!readOnly && errors.description?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly,
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={12}>
            <FormControl
              fullWidth
              error={!readOnly && !!errors.default_tax_rate_profile}
              size="small"
            >
              <Autocomplete
                id="tax-rate-profile-autocomplete"
                options={taxRateProfilesData?.results || []}
                getOptionLabel={(option: TaxRateProfile) =>
                  option.profile_name || "Unknown"
                }
                loading={isLoadingTaxRateProfiles}
                disabled={readOnly || isLoadingTaxRateProfiles}
                value={currentTaxRateProfile}
                onChange={(_, newValue: TaxRateProfile | null) => {
                  setValue("default_tax_rate_profile", newValue?.id || null, {
                    shouldValidate: true,
                  });
                }}
                isOptionEqualToValue={(option, value) =>
                  option?.id === value?.id
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("defaultTaxRateProfile")}
                    size="small"
                    required
                    error={!readOnly && !!errors.default_tax_rate_profile}
                    helperText={
                      !readOnly && errors.default_tax_rate_profile?.message
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {isLoadingTaxRateProfiles ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
              />
              {!readOnly && errors.default_tax_rate_profile && (
                <FormHelperText>
                  {errors.default_tax_rate_profile.message as string}
                </FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid size={12}>
            <Controller
              name="sort_order"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <TextField
                  {...field}
                  value={value === 0 ? "0" : value}
                  label={t("sortOrder")}
                  fullWidth
                  type="number"
                  size="small"
                  onChange={(e) => {
                    const val = e.target.value;

                    // Handle empty input
                    if (val === "") {
                      onChange(0);
                      return;
                    }

                    // Handle single zero
                    if (val === "0") {
                      onChange(0);
                      return;
                    }

                    // Remove leading zeros
                    if (val.startsWith("0")) {
                      const newVal = val.replace(/^0+/, "");
                      onChange(newVal === "" ? 0 : Number(newVal));
                      return;
                    }

                    // Regular case
                    onChange(Number(val));
                  }}
                  error={!readOnly && !!errors.sort_order}
                  helperText={!readOnly && errors.sort_order?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly,
                  }}
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
                ownerType="category"
                disabled={readOnly || isSubmitting}
                maxImages={1} // Only one image allowed for categories
              />
            </Box>

            {/* We don't render temp_images as a hidden input since it's an array */}
            {/* It will be handled in the form submission logic */}
          </Grid>

          <Grid size={12}>
            <Controller
              name="tax_inclusive"
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
                  label={t("taxInclusive")}
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
                        inputProps={{ "aria-label": "Active status" }}
                      />
                    }
                    label={t("Active")}
                  />
                )}
              />
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }
);

export default CategoryForm;
