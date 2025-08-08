"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  TextField,
  Tooltip,
  Link,
  Autocomplete,
  TextField as MuiTextField,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useFormState, Control, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  useActiveSellingChannels,
  SellingChannel,
} from "@/app/hooks/api/useActiveGroupsSellingChannels";
// Interface to define props for ConfigRow, fixing the implicit 'any' type.
interface ConfigRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

// A reusable component for each configuration row to keep the code clean

const ConfigRow = ({ label, description, children }: ConfigRowProps) => (
  <Grid container alignItems="center" spacing={2} sx={{ py: 1 }}>
    <Grid
      size={{ xs: 6 }}
      sx={{ display: "flex", alignItems: "center", gap: 1 }}
    >
      <Typography component="div" fontSize={16} fontWeight={500}>
        {label}
      </Typography>
      <Tooltip title={description} arrow>
        <InfoOutlinedIcon
          fontSize="small"
          color="action"
          sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
        />
      </Tooltip>
    </Grid>
    <Grid size={{ xs: 6 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
      {children}
    </Grid>
  </Grid>
);

interface CheckoutTabProps {
  control: Control<any>;
  watch: any;
  setValue: any;
}

export const CheckoutTab = ({ control, watch, setValue }: CheckoutTabProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  // Get form errors with proper typing for nested fields
  const { errors } = useFormState({ control });
  const checkoutErrors = errors.checkout as Record<string, any> | undefined;

  const { data: sellingChannels = [] } = useActiveSellingChannels();

  // Not needed anymore since we're using Controller

  return (
    <>
      <Grid container>
        <Grid size={{ xs: 6 }}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Controller
              name="checkout.selling_channel_id"
              control={control}
              rules={{ required: "Selling channel is required" }}
              render={({ field, fieldState }) => (
                <Autocomplete
                  options={sellingChannels}
                  value={
                    sellingChannels.find(
                      (option) => option.id === field.value
                    ) || null
                  }
                  onChange={(event, newValue: SellingChannel | null) => {
                    field.onChange(newValue?.id || null);
                  }}
                  getOptionLabel={(option: SellingChannel) =>
                    option.segment_name
                  }
                  renderInput={(params) => (
                    <MuiTextField
                      {...params}
                      label="Select Segment Name"
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                  renderOption={(props, option: SellingChannel) => (
                    <li {...props} key={option.id}>
                      {option.segment_name}
                    </li>
                  )}
                />
              )}
            />
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }} />
        <Grid size={{ xs: 12, md: 6 }}>
          {/* --- General Store Rules --- */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary">
              General Store Rules
            </Typography>
            <ConfigRow
              label="Allow Guest Checkout"
              description="Let customers checkout without creating an account"
            >
              <Controller
                name="checkout.allowGuestCheckout"
                control={control}
                render={({ field }) => (
                  <Switch
                    size="medium"
                    checked={field.value === undefined ? true : field.value}
                    defaultChecked={true}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </ConfigRow>
            <ConfigRow
              label="Minimum Order Value"
              description="Set the minimum amount required for checkout"
            >
              {" "}
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <FormControl fullWidth>
                  <InputLabel htmlFor="outlined-adornment-min-order-value">
                    {t(
                      "admin.configuration.minOrderValue",
                      "Minimum Order Value"
                    )}
                  </InputLabel>
                  <Controller
                    name="checkout.minOrderValue"
                    control={control}
                    render={({ field }) => (
                      <OutlinedInput
                        {...field}
                        id="outlined-adornment-min-order-value"
                        startAdornment={
                          <InputAdornment position="start">₹</InputAdornment>
                        }
                        label={t(
                          "admin.configuration.minOrderValue",
                          "Minimum Order Value"
                        )}
                        size="small"
                        sx={{ width: "200px", mb: 0 }}
                        type="number"
                      />
                    )}
                  />
                </FormControl>
              </Box>
            </ConfigRow>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {/* --- Shipping Method Rules --- */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary">
              Shipping Method Rules
            </Typography>
            <ConfigRow
              label="Allow User to Select Shipping Method"
              description="Let customers choose their preferred shipping option"
            >
              <Controller
                name="checkout.allowUserSelectShipping"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value === undefined ? true : field.value}
                    defaultChecked={true}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </ConfigRow>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary">
              Logistic Settings
            </Typography>

            <ConfigRow
              label={t(
                "configuration.checkoutConfigs.fulfillmentType",
                "Logistic Options"
              )}
              description={t(
                "configuration.checkoutConfigs.fulfillmentTypeDescription",
                "Select how customers can receive their orders"
              )}
            >
              <Controller
                name="checkout.fulfillment_type"
                control={control}
                defaultValue="both"
                render={({ field }) => (
                  <RadioGroup
                    row
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <FormControlLabel
                      value="delivery"
                      control={<Radio size="small" sx={{ p: 0, mr: 0.5 }} />}
                      label={t("common.delivery", "Delivery")}
                    />
                    <FormControlLabel
                      value="store_pickup"
                      control={<Radio size="small" sx={{ p: 0, mr: 0.5 }} />}
                      label={t("common.storePickup", "Pickup")}
                    />
                    <FormControlLabel
                      value="both"
                      control={<Radio size="small" sx={{ p: 0, mr: 0.5 }} />}
                      label={t("common.Both", "Both")}
                    />
                    <FormControlLabel
                      value="none"
                      control={<Radio size="small" sx={{ p: 0, mr: 0.5 }} />}
                      label={t("common.none", "None")}
                    />
                  </RadioGroup>
                )}
              />
            </ConfigRow>
            {watch("checkout.fulfillment_type") !== "none" && (
          <ConfigRow
            label="Pickup Method Label"
            description="Label shown to customers during checkout"
          >
            <Controller
              name="checkout.pickupMethodLabel"
              control={control}
                render={({ field }) => {
                  const fulfillmentType = watch("checkout.fulfillment_type");
                  const isNone = fulfillmentType === "none";
                  
                  // If fulfillment type is none, clear the field
                  React.useEffect(() => {
                    if (isNone && field.value !== "") {
                      field.onChange("");
                    }
                  }, [isNone, field]);
                  
                  return (
                <TextField
                  {...field}
                  size="small"
                  sx={{ width: "200px", mb: 0 }}
                      disabled={isNone}
                      error={isNone && field.value !== ""}
                      helperText={isNone && field.value !== "" ? "Must be empty when fulfillment type is None" : ""}
                />
                  );
                }}
            />
          </ConfigRow>
        )}
          </Paper>
        </Grid>
        {/* --- Delivery Options & Preferences --- */}
        <Grid size={{ xs: 6 }}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary">
              Delivery Options & Preferences
            </Typography>
            <ConfigRow
              label="Enable Delivery Preferences"
              description="Master switch to enable all delivery preference options"
            >
              <Controller
                name="checkout.enableDeliveryPrefs"
                control={control}
                render={({ field }) => {
                  const fulfillmentType = watch("checkout.fulfillment_type");
                  const isNone = fulfillmentType === "none";
                  
                  // If fulfillment type is none, force this to false
                  React.useEffect(() => {
                    if (isNone && field.value !== false) {
                      field.onChange(false);
                    }
                  }, [isNone, field]);
                  
                  return (
                    <Switch
                      checked={isNone ? false : (field.value === undefined ? true : field.value)}
                      defaultChecked={true}
                      disabled={isNone}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  );
                }}
              />
            </ConfigRow>
            <ConfigRow
              label="Enable Preferred Delivery Date"
              description="Allow customers to select their preferred delivery date"
            >
              <Controller
                name="checkout.enablePreferredDate"
                control={control}
                render={({ field }) => {
                  const deliveryPrefsEnabled = watch(
                    "checkout.enableDeliveryPrefs"
                  );
                  const isDisabled = deliveryPrefsEnabled === false;

                  React.useEffect(() => {
                    if (isDisabled && field.value !== false) {
                      field.onChange(false);
                    }
                  }, [isDisabled, field]);

                  return (
                    <Switch
                      checked={
                        isDisabled
                          ? false
                          : field.value === undefined
                          ? true
                          : field.value
                      }
                      defaultChecked={true}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (!isDisabled) {
                          field.onChange(e.target.checked);
                        }
                      }}
                    />
                  );
                }}
              />
            </ConfigRow>
            <ConfigRow
              label="Enable Delivery Time Slots"
              description="Allow customers to select delivery time windows"
            >
              <Controller
                name="checkout.enableTimeSlots"
                control={control}
                render={({ field }) => {
                  const deliveryPrefsEnabled = watch(
                    "checkout.enableDeliveryPrefs"
                  );
                  const isDisabled = deliveryPrefsEnabled === false;

                  React.useEffect(() => {
                    if (isDisabled && field.value !== false) {
                      field.onChange(false);
                    }
                  }, [isDisabled, field]);

                  return (
                    <Switch
                      checked={
                        isDisabled
                          ? false
                          : field.value === undefined
                          ? true
                          : field.value
                      }
                      defaultChecked={true}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (!isDisabled) {
                          field.onChange(e.target.checked);
                        }
                      }}
                    />
                  );
                }}
              />
            </ConfigRow>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

// --- Utility functions for data transformation ---

/**
 * Transforms form data to the required flat snake_case API payload for save.
 */
export function transformCheckoutForm(formData: any): any {
  const checkout = formData.checkout || {};
  return {
    allow_guest_checkout: !!checkout.allowGuestCheckout,
    min_order_value: Number(checkout.minOrderValue),
    allow_user_select_shipping: !!checkout.allowUserSelectShipping,
    fulfillment_type: checkout.fulfillment_type || "delivery",
    pickup_method_label: checkout.pickupMethodLabel,
    enable_delivery_prefs: !!checkout.enableDeliveryPrefs,
    enable_preferred_date: !!checkout.enablePreferredDate,
    enable_time_slots: !!checkout.enableTimeSlots,
    currency: checkout.currency?.code || "INR",
    customer_group_selling_channel: checkout.selling_channel_id,
    is_active:
      typeof checkout.is_active === "boolean" ? checkout.is_active : true,
  };
}

/**
 * Maps API response for edit to the form structure.
 * Expects a single config object (not an array).
 */
export function mapCheckoutApiToForm(apiData: any): any {
  return {
    checkout: {
      allowGuestCheckout: !!apiData.allow_guest_checkout,
      minOrderValue: apiData.min_order_value
        ? Number(apiData.min_order_value)
        : 0,
      allowUserSelectShipping: !!apiData.allow_user_select_shipping,
      fulfillment_type: apiData.fulfillment_type || "delivery",
      pickupMethodLabel: apiData.pickup_method_label || "",
      enableDeliveryPrefs: !!apiData.enable_delivery_prefs,
      enablePreferredDate: !!apiData.enable_preferred_date,
      enableTimeSlots: !!apiData.enable_time_slots,
      selling_channel_id: apiData.customer_group_selling_channel || null,
      is_active:
        typeof apiData.is_active === "boolean" ? apiData.is_active : true,
      currency: {
        code: apiData.currency || "INR",
        name: "", // Optionally populate if you have currency data
      },
    },
  };
}

export default CheckoutTab;
