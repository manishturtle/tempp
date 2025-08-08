"use client";

/**
 * Customer Group Form Component
 *
 * Form for creating and editing customer groups
 */
import React, { forwardRef, useImperativeHandle } from "react";
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  FormHelperText,
  CircularProgress,
  Typography,
  Chip,
  Autocomplete,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerGroup, SellingChannel } from "@/app/types/customers";
import {
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
} from "@/app/hooks/api/customers";
import { useFetchSellingChannels } from "@/app/hooks/api/pricing";

// Define the form schema using zod
const customerGroupSchema = z.object({
  group_name: z.string().min(1, { message: "Group name is required" }),
  group_type: z.enum(["BUSINESS", "INDIVIDUAL", "GOVERNMENT"]),
  is_active: z.boolean().default(true),
  display_name: z.string().optional(),
  description: z.string().optional(),
  selling_channel_ids: z
    .array(z.number())
    .min(1, { message: "Please select at least one selling channel" })
    .default([]),
});

// Define the form data type
type CustomerGroupFormData = z.infer<typeof customerGroupSchema>;

interface CustomerGroupFormProps {
  initialData: CustomerGroup | null;
  onSubmit: () => void;
  isViewMode?: boolean;
  isSubmitting?: boolean;
}

/**
 * CustomerGroupForm component with ref forwarding
 */
const CustomerGroupForm = forwardRef<
  { submitForm: () => void },
  CustomerGroupFormProps
>(
  (
    {
      initialData,
      onSubmit,
      isViewMode = false,
      isSubmitting: externalIsSubmitting,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    // Initialize form with react-hook-form and zod validation
    const {
      control,
      handleSubmit,
      formState: { errors, isSubmitting },
      watch,
      setValue,
    } = useForm<CustomerGroupFormData>({
      resolver: zodResolver(customerGroupSchema),
      defaultValues: initialData
        ? {
            group_name: initialData.group_name,
            group_type: initialData.group_type as
              | "BUSINESS"
              | "INDIVIDUAL"
              | "GOVERNMENT",
            is_active: initialData.is_active,
            display_name: initialData.display_name || "",
            description: initialData.description || "",
            selling_channel_ids:
              (initialData.selling_channels as SellingChannel[] | undefined)
                ?.filter((sc: SellingChannel) => sc.status === "ACTIVE")
                .map((sc: SellingChannel) => sc.selling_channel_id) || [],
          }
        : {
            group_name: "",
            group_type: "BUSINESS",
            is_active: true,
            display_name: "",
            description: "",
            selling_channel_ids: [],
          },
    });

    // Create mutation for creating a new customer group
    const createMutation = useCreateCustomerGroup();

    // Update mutation for editing an existing customer group
    const updateMutation = useUpdateCustomerGroup();

    // Form submission handler
    const handleFormSubmit = async (data: CustomerGroupFormData) => {
      if (initialData) {
        // Update existing customer group
        await updateMutation.mutateAsync({
          id: initialData.id,
          data,
        });
        onSubmit();
      } else {
        // Create new customer group
        await createMutation.mutateAsync(data);
        onSubmit();
      }
    };

    // Expose submitForm method to parent component via ref
    useImperativeHandle(ref, () => ({
      submitForm: handleSubmit(handleFormSubmit),
    }));

    // Determine if form is in submitting state from either internal or external source
    const isFormSubmitting = isSubmitting || externalIsSubmitting;

    // Fetch only active selling channels
    const {
      data: sellingChannelsResponse,
      isLoading: isLoadingSellingChannels,
    } = useFetchSellingChannels({
      paginated: false,
      is_active: true, // Only fetch active selling channels
    });
    const sellingChannels = Array.isArray(sellingChannelsResponse)
      ? sellingChannelsResponse
      : [];

    // Watch selling_channel_ids to update UI when it changes
    const selectedChannelIds = watch("selling_channel_ids") || [];

    return (
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
        <Stack spacing={3}>
          {/* Group Name */}
          <Controller
            name="group_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("customerGroupFields.groupName")}
                fullWidth
                size="small"
                error={!!errors.group_name}
                helperText={errors.group_name?.message}
                disabled={isFormSubmitting || isViewMode}
                required
              />
            )}
          />

          {/* Group Type */}
          <Controller
            name="group_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="small" error={!!errors.group_type}>
                <InputLabel id="group-type-label">
                  {t("customerGroupFields.groupType")}
                </InputLabel>
                <Select
                  {...field}
                  labelId="group-type-label"
                  label={t("customerGroupFields.groupType")}
                  disabled={isFormSubmitting || isViewMode}
                  sx={{
                    height: "38px",
                    "& .MuiSelect-select": {
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 200,
                      },
                    },
                  }}
                >
                  <MenuItem value="BUSINESS">
                    {t("customerGroupTypes.BUSINESS")}
                  </MenuItem>
                  <MenuItem value="INDIVIDUAL">
                    {t("customerGroupTypes.INDIVIDUAL")}
                  </MenuItem>
                  <MenuItem value="GOVERNMENT">
                    {t("customerGroupTypes.GOVERNMENT")}
                  </MenuItem>
                </Select>
                {errors.group_type && (
                  <FormHelperText>{errors.group_type.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />

          {/* Is Active */}
          <Controller
            name="is_active"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <FormControlLabel
                control={
                  <Switch
                    {...field}
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isFormSubmitting || isViewMode}
                  />
                }
                label={t("customerGroupFields.isActive")}
              />
            )}
          />

          {/* Selling Channels */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Select Selling Channels <span style={{ color: "red" }}>*</span>
            </Typography>
            {errors.selling_channel_ids && (
              <Typography
                color="error"
                variant="caption"
                display="block"
                sx={{ mb: 1 }}
              >
                {errors.selling_channel_ids.message as string}
              </Typography>
            )}
            <Controller
              name="selling_channel_ids"
              control={control}
              render={({ field: { onChange, value = [] } }) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {isLoadingSellingChannels ? (
                    <CircularProgress size={24} />
                  ) : (
                    sellingChannels?.map((channel) => {
                      const isSelected = selectedChannelIds.includes(
                        channel.id
                      );
                      return (
                        <Chip
                          key={channel.id}
                          label={channel.name}
                          onClick={() => {
                            if (isFormSubmitting || isViewMode) return;

                            const newValue = isSelected
                              ? selectedChannelIds.filter(
                                  (id: number) => id !== channel.id
                                )
                              : [...selectedChannelIds, channel.id];

                            setValue("selling_channel_ids", newValue, {
                              shouldValidate: true,
                            });
                          }}
                          color="primary"
                          variant={isSelected ? "filled" : "outlined"}
                          disabled={isFormSubmitting || isViewMode}
                          sx={{
                            bgcolor: isSelected
                              ? "primary.main"
                              : "transparent",
                            color: isSelected
                              ? "primary.contrastText"
                              : "text.primary",
                            borderColor: "divider",
                            "&:hover": {
                              bgcolor: isSelected
                                ? "primary.dark"
                                : "action.hover",
                            },
                            "&.Mui-disabled": {
                              opacity: 0.7,
                              pointerEvents: "none",
                            },
                          }}
                        />
                      );
                    })
                  )}
                </Box>
              )}
            />
          </Box>
          {/* Display Name & Description: Only show if channel id 3 or 4 is selected */}
          {(selectedChannelIds.includes(3) || selectedChannelIds.includes(4)) && (
            <>
              {/* Display Name */}
              <Controller
                name="display_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t("customerGroupFields.displayName", "Display Name")}
                    fullWidth
                    size="small"
                    error={!!errors.display_name}
                    helperText={errors.display_name?.message}
                    disabled={isFormSubmitting || isViewMode}
                  />
                )}
              />

              {/* Description */}
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t("customerGroupFields.description", "Description")}
                    fullWidth
                    size="small"
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    disabled={isFormSubmitting || isViewMode}
                  />
                )}
              />
            </>
          )}
        </Stack>
      </Box>
    );
  }
);

export default CustomerGroupForm;
