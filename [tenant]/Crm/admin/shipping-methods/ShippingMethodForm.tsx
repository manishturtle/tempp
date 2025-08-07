"use client";

import React, { forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  Grid,
  Switch,
  Autocomplete,
  Chip,
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useActiveSellingChannels,
  SellingChannel,
} from "@/app/hooks/api/useActiveGroupsSellingChannels";
import { useShippingZones, ShippingZone } from "@/app/hooks/api/admin/useShippingZones";
import { MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { TextField as MuiTextField } from "@mui/material";

// Define the form values schema using zod
const shippingMethodSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    min_delivery_days: z.number().min(0, "Must be 0 or greater"),
    max_delivery_days: z.number().min(0, "Must be 0 or greater"),
    is_active: z.boolean().default(true),
    customer_group_selling_channels: z.array(z.number()),
    zone_restrictions: z
      .array(
        z.object({
          zone: z.number(),
          restriction_mode: z.enum(["INCLUDE", "EXCLUDE"]),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.max_delivery_days <= data.min_delivery_days) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["max_delivery_days"],
        message: "Maximum delivery days must be greater than minimum delivery days",
      });
    }
  });

// Form values type from the schema
/**
 * Shipping method form values
 */
export interface ShippingZoneRestriction {
  zone: number;
  restriction_mode: "INCLUDE" | "EXCLUDE";
}

export type ShippingMethodFormValues = z.infer<typeof shippingMethodSchema>;


// Form props interface
interface ShippingMethodFormProps {
  defaultValues?: Partial<ShippingMethodFormValues>;
  onSubmit: (data: ShippingMethodFormValues) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  isViewMode?: boolean;
}

// Export the type for the ref to be used in parent components
export interface ShippingMethodFormRef {
  submitForm: () => void;
}

const ShippingMethodForm = forwardRef<
  ShippingMethodFormRef,
  ShippingMethodFormProps
>(
  ({
    defaultValues = {
      name: "",
      min_delivery_days: 0,
      max_delivery_days: 0,
      is_active: true,
      customer_group_selling_channels: [] as number[],
    },
      onSubmit,
      isSubmitting = false,
      isEditMode = false,
      isViewMode = false,
    },
    ref
  ) => {
    const { t } = useTranslation();

    const {
      control,
      handleSubmit,
      formState: { errors },
      watch,
      reset,
      setValue, // <-- add setValue here
    } = useForm<ShippingMethodFormValues>({
      resolver: zodResolver(shippingMethodSchema),
      defaultValues: defaultValues as ShippingMethodFormValues,
    });

    // Update form values when defaultValues change (for edit mode)
    useEffect(() => {
      if (defaultValues) {
        reset(defaultValues as ShippingMethodFormValues);
      }
    }, [JSON.stringify(defaultValues), reset]);

    // Watch min_delivery_days value for max_delivery_days validation
    // Using useMemo to optimize and prevent unnecessary rerenders
    const minDeliveryDays = watch("min_delivery_days");

    // Custom submit handler
    const handleFormSubmit = (data: ShippingMethodFormValues) => {
      onSubmit(data);
    };

    // Expose the submitForm method to the parent component through the ref
    useImperativeHandle(ref, () => ({
      submitForm: () => {
        handleSubmit(handleFormSubmit)();
      },
    }));

    const { data: sellingChannels = [] } = useActiveSellingChannels();

    const handleCustomerGroupChange = (field: any, value: SellingChannel[]) => {
      field.onChange(value.map((option) => option.id));
    };

    // Shipping Zones logic
    const { data: shippingZonesData } = useShippingZones({ is_active: true });
    const shippingZones: ShippingZone[] = shippingZonesData?.results || [];

    // Watch and handle zone_restrictions
    const zoneRestrictions: ShippingZoneRestriction[] = watch("zone_restrictions") || [];

    /**
     * Handle zone selection change (all are INCLUDE)
     */
    function handleZonesChange(selectedZones: ShippingZone[]) {
      const updated = selectedZones.map((zone) => ({
        zone: zone.id,
        restriction_mode: "INCLUDE" as const,
      }));
      setValue("zone_restrictions", updated, { shouldValidate: true });
    }

    return (
      <Box
        component="form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label={t("Name")}
                  variant="outlined"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          {/* Shipping Zone Restrictions Autocomplete */}
          <Grid size={{ xs: 12 }}>
            <Controller
              name="zone_restrictions"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={shippingZones}
                  getOptionLabel={(option: ShippingZone) => option.zone_name}
                  value={shippingZones.filter((zone) =>
                    (zoneRestrictions || []).some((z) => z.zone === zone.id)
                  )}
                  onChange={(_, selected: ShippingZone[]) => handleZonesChange(selected)}
                  disabled={isViewMode}
                  renderInput={(params) => (
                    <MuiTextField
                      {...params}
                      label={t("Shipping Zones")}
                      placeholder={t("Select shipping zones")}
                      size="small"
                      error={!!errors.zone_restrictions}
                      helperText={
                        Array.isArray(errors.zone_restrictions)
                          ? errors.zone_restrictions.map((err, idx) => err?.message).filter(Boolean).join(", ")
                          : (errors.zone_restrictions?.message as string)
                      }
                      disabled={isViewMode}
                    />
                  )}
                  renderTags={(selected, getTagProps) =>
                    selected.map((zone, idx) => (
                      <Chip
                        {...getTagProps({ index: idx })}
                        key={zone.id}
                        label={zone.zone_name}
                        size="small"
                        onDelete={isViewMode ? undefined : () => {
                          handleZonesChange(selected.filter((z) => z.id !== zone.id));
                        }}
                      />
                    ))
                  }
                />
              )}
            />
          </Grid>
          <Grid size={{xs:12 , sm:6}}>
            <Controller
              name="min_delivery_days"
              control={control}
              rules={{
                required: "Minimum delivery days is required",
                min: { value: 0, message: "Must be 0 or greater" },
                validate: (value) =>
                  !isNaN(Number(value)) || "Must be a number",
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  size="small"
                  label={t("Min Delivery Days")}
                  variant="outlined"
                  error={!!errors.min_delivery_days}
                  helperText={errors.min_delivery_days?.message}
                  inputProps={{ min: 0 }}
                  disabled={isViewMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : Number(value));
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{xs:12 , sm:6}}>
            <Controller
              name="max_delivery_days"
              control={control}
              rules={{
                required: "Maximum delivery days is required",
                min: {
                  value: minDeliveryDays || 0,
                  message: `Must be greater than or equal to ${minDeliveryDays}`,
                },
                validate: (value) =>
                  !isNaN(Number(value)) || "Must be a number",
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  size="small"
                  label={t("Max Delivery Days")}
                  variant="outlined"
                  error={!!errors.max_delivery_days}
                  helperText={errors.max_delivery_days?.message}
                  inputProps={{ min: minDeliveryDays || 0 }}
                  disabled={isViewMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : Number(value));
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Controller
              name="customer_group_selling_channels"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={sellingChannels}
                  value={sellingChannels.filter((channel) =>
                    field.value.some((id) => id === channel.id)
                  )}
                  onChange={(event, newValue: SellingChannel[]) =>
                    handleCustomerGroupChange(field, newValue)
                  }
                  getOptionLabel={(option: SellingChannel) =>
                    option.segment_name
                  }
                  renderInput={(params) => (
                    <MuiTextField
                      {...params}
                      label={t("excludedSegmentName")}
                      placeholder={t(
                        "Select customer groups and selling channels"
                      )}
                      size="small"
                      error={!!errors.customer_group_selling_channels}
                      helperText={
                        errors.customer_group_selling_channels?.message
                      }
                      disabled={isViewMode}
                    />
                  )}
                  renderOption={(props, option: SellingChannel) => (
                    <li {...props}>{option.segment_name}</li>
                  )}
                  renderTags={(value: SellingChannel[], getTagProps) =>
                    value.map((option: SellingChannel, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.segment_name}
                        size="small"
                        onDelete={isViewMode ? undefined : () => {}}
                      />
                    ))
                  }
                  disabled={isViewMode}
                />
              )}
            />
          </Grid>

          <Grid size={{xs:12}}>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={isViewMode}
                    />
                  }
                  label={t("Status")}
                />
              )}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }
);

// Add display name for better debugging
ShippingMethodForm.displayName = "ShippingMethodForm";

export default ShippingMethodForm;
