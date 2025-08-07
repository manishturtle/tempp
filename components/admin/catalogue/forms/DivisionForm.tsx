/**
 * Division Form Component
 *
 * Form for creating and editing divisions in the catalogue
 */
import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  TextField,
  Autocomplete,
  Chip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { divisionSchema, DivisionFormValues } from "../schemas";
import Grid from "@mui/material/Grid";
import {  Division } from "@/app/types/catalogue";
import { ImageManager } from "@/app/components/admin/products/forms/ImageManager";
import { ImageData } from "@/app/components/admin/products/forms/ImageUploader";
import { useTranslation } from "react-i18next";
import { useActiveSellingChannels } from "@/app/hooks/api/useActiveGroupsSellingChannels";
import { TextField as MuiTextField } from "@mui/material";

interface DivisionFormProps {
  defaultValues?: Partial<Division>;
  onSubmit: (data: DivisionFormValues) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
  apiErrors?: Record<string, string[]>;
}

const DivisionForm = forwardRef<{ submitForm: () => void }, DivisionFormProps>(
  (
    {
      defaultValues,
      onSubmit,
      isSubmitting = false,
      readOnly = false,
      apiErrors = {},
    },
    ref
  ) => {
    // Check if we're in edit mode (has an existing id) or create mode
    const isEditMode = !!defaultValues?.id;

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

    // Get default selling channel IDs
    const defaultSellingChannelIds = defaultValues?.customer_group_selling_channel_ids || [];

    // Log defaultValues when they change
    useEffect(() => {
      console.log('Form defaultValues:', defaultValues);
      console.log('Selling channel IDs:', defaultValues?.customer_group_selling_channel_ids);
    }, [defaultValues]);

    // State for managing images
    const [images, setImages] = useState<ImageData[]>(initialImages);

    // Reference to the current image URL to check if it's been deleted
    const imageUrlRef = useRef(defaultValues?.image || "");

    // Effect to listen for image deletion events
    useEffect(() => {
      const handleImageDeleted = (event: CustomEvent) => {
        // Check if this is a division image deletion event
        if (event.detail?.ownerType === "division" && event.detail?.success) {
          console.log("Division image deleted event received");

          // Clear the imageUrlRef so it doesn't get included in form submission
          imageUrlRef.current = "";

          // Also ensure the form setValue is updated to clear the image field
          setValue("image", "");
        }
      };

      // Add event listener as a custom event
      document.addEventListener(
        "image-deleted" as any,
        handleImageDeleted as EventListener
      );

      // Cleanup function
      return () => {
        document.removeEventListener(
          "image-deleted" as any,
          handleImageDeleted as EventListener
        );
      };
    }, []);

    const {
      control,
      handleSubmit,
      setValue,
      formState: { errors },
    } = useForm<DivisionFormValues>({
      resolver: zodResolver(divisionSchema),
      defaultValues: {
        name: defaultValues?.name || "",
        description: defaultValues?.description || "",
        is_active: defaultValues?.is_active ?? true,
        image: defaultValues?.image || "",
        image_alt_text: defaultValues?.image_alt_text || "",
        customer_group_selling_channel_ids: defaultSellingChannelIds,
        temp_images: [],
      },
    });
    const { t } = useTranslation();

    // Log errors whenever they change to help debug form validation issues
    useEffect(() => {
      if (Object.keys(errors).length > 0) {
        console.log("Form validation errors:", errors);
      }
    }, [errors]);

    // Expose submitForm method to parent component via ref
    useImperativeHandle(ref, () => ({
      submitForm: () => handleSubmit(onFormSubmit)(),
    }));

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
      } else if (newImages.length === 0) {
        // If no images, keep the alt text field editable but don't clear it
        // The user may want to enter alt text before uploading an image
      }
    };

    // Custom submit handler to remove is_active in create mode and include temp_images
    const onFormSubmit = (data: DivisionFormValues) => {
      console.log("Form submitted with data:", data);

      // Add temp_images data from state
      const tempImages = images.filter(
        (img) => !img.id.startsWith("existing-")
      );
      console.log("Temp images to include:", tempImages);

      // Ensure image_alt_text is never null - use empty string as fallback
      // This prevents the backend validation error for null image_alt_text
      data.image_alt_text = data.image_alt_text || "";

      // Prepare the base form data
      const formData = {
        ...data,
        temp_images: tempImages,
      };

      // Use the selling channel IDs directly
      const customer_group_selling_channel_ids = data.customer_group_selling_channel_ids;

      if (!isEditMode) {
        // In create mode, remove is_active from the data being sent
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { is_active, ...submitData } = formData;
        console.log("Submitting create form data:", submitData);
        onSubmit(submitData as DivisionFormValues);
      } else {
        // In edit mode, send all data including is_active
        console.log("Submitting update form data:", formData);
        onSubmit(formData as DivisionFormValues);
      }
    };

    return (
      <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
        <Grid container spacing={3}>
          <Grid size={12}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("divisionName")}
                  fullWidth
                  required
                  size="small"
                  error={!readOnly && (!!errors.name || !!apiErrors?.name)}
                  helperText={
                    !readOnly && (errors.name?.message || apiErrors?.name?.[0])
                  }
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly,
                  }}
                />
              )}
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
                  multiline
                  size="small"
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
            <Controller
              name="customer_group_selling_channel_ids"
              control={control}
              render={({
                field: { onChange, value = [] },
                fieldState: { error },
              }) => {
                const { data: sellingChannels = [], isLoading } =
                  useActiveSellingChannels();

                return (
                  <Autocomplete
                    multiple
                    id="selling-channels"
                    options={sellingChannels || []}
                    getOptionLabel={(option) => option.segment_name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    value={
                      sellingChannels?.filter((channel: { id: number }) => 
                        Array.isArray(value) && value.includes(channel.id)
                      ) || []
                    }
                    onChange={(_, newValue) => {
                      onChange(newValue.map((item) => item.id));
                    }}
                    renderInput={(params) => (
                      <MuiTextField
                        {...params}
                        variant="outlined"
                        label={t("excludedSegmentName")}
                        required
                        error={!!error}
                        helperText={error?.message}
                        size="small"
                        disabled={readOnly || isLoading}
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={option.segment_name}
                          size="small"
                        />
                      ))
                    }
                    disabled={readOnly}
                    loading={isLoading}
                  />
                );
              }}
            />
          </Grid>

          <Grid size={12}>
            {/* Image Manager Component */}
            <Box sx={{ mt: 2 }}>
              <ImageManager
                images={images}
                onImagesChange={handleImagesChange}
                ownerType="division"
                disabled={readOnly || isSubmitting}
                maxImages={1} // Only one image allowed for divisions
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
                  value={field.value || ""}
                />
              )}
            />

            <Controller
              name="image_alt_text"
              control={control}
              render={({ field }) => (
                <Box sx={{ mt: 2 }}>
                  {/* Show visible text field when no image is uploaded */}
                  <TextField
                    {...field}
                    label={t("imageAltText")}
                    fullWidth
                    size="small"
                    required
                    error={!!apiErrors?.image_alt_text}
                    helperText={t("imageAltTextHelper")}
                    disabled={readOnly}
                    InputProps={{
                      readOnly: readOnly,
                    }}
                    // Ensure the value is never null
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                    }}
                  />
                </Box>
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
                    label={t("is_active")}
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

export default DivisionForm;
