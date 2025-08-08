"use client";

import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  TextField,
  Grid,
  CircularProgress,
  Autocomplete,
  FormControl,
  Chip,
  Typography,
  Button


} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShippingAddressFormData } from "@/app/types/store/checkout";
import { useLocation } from "@/app/hooks/api/tenant-admin/useLocation";
import { useParams } from "next/navigation";
import { usePatchUpdateAddress } from "@/app/hooks/api/store/useAddresses";

interface ShippingAddressFormProps {
  defaultValues?: Partial<ShippingAddressFormData>;
  formId?: string;
  selectedAddressId?: string | number;
  onCancel?: () => void;
  onSuccess?: () => void; // Callback to refresh addresses after successful update
}

// Create Zod schema for address validation
const addressSchema = z.object({
  full_name: z
    .string()
    .min(4, { message: "Full name must be at least 4 characters long" })
    .max(30, { message: "Full name must be less than 30 characters" }),
  type: z.string().default("business"),
  business_name: z
    .string()
    .max(50, { message: "Business name must be less than 50 characters" })
    .refine(
      (val) => !val || val.length >= 2,
      { message: "Business name must be at least 2 characters long" }
    )
    .optional(),
  address_line1: z
    .string()
    .min(6, { message: "Address must be at least 6 characters long" })
    .max(50, { message: "Address must be less than 50 characters" }),
  address_line2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  postal_code: z
    .string()
    .min(1, { message: "Postal code is required" })
    .max(20, { message: "Postal code must be less than 20 characters" }),
  country: z.string().min(1, { message: "Country is required" }),
  gst_number: z
    .string()
    .max(20, { message: "GST number must be less than 20 characters" })
    .optional(),
});

export const ShippingAddressForm: FC<ShippingAddressFormProps> = ({
  defaultValues,
  formId,
  selectedAddressId,
  onCancel,
  onSuccess,
}) => {
  console.log('EditForm - Selected Address ID:', selectedAddressId);
  console.log('EditForm - Default Values:', defaultValues);
  const { t } = useTranslation();
  const params = useParams();

  // State to track selected location IDs
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
    null
  );
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const tenantId = Array.isArray(params?.tenant)
    ? params.tenant[0]
    : params?.tenant || "";

  // Initialize the patch update address mutation
  const { mutate: patchUpdateAddress, isPending: isUpdating } = usePatchUpdateAddress(tenantId);
  const userKey = tenantId ? `${tenantId}_auth_user` : " ";

  const userDataStr = localStorage.getItem(userKey);
  console.log("Auth user key being checked:", userKey);

  // Parse user data and get customer group type
  // Parse user data and get customer group type
  let customerGroupType = null;
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      console.log("Parsed user data:", userData);

      if (userData.group_type) {
        customerGroupType = userData.group_type;
        console.log("Customer Group Details:", {
          id: userData.customer_group_id,
          type: customerGroupType,
        });
      } else {
        console.log("No group type found in user data");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  } else {
    console.log("No user data found in localStorage for key:", userKey);
  }

  // Initialize location hooks
  const locationHooks = useLocation();
  const { data: countries = [], isLoading: isLoadingCountries } =
    locationHooks.useCountries();
  const { data: states = [], isLoading: isLoadingStates } =
    locationHooks.useStates(selectedCountryId || 0);

  // Form setup with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ShippingAddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: "",
      type: "residential",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      ...defaultValues,
    },
  });


  // Reset form when defaultValues change (simplified)
  useEffect(() => {
    if (defaultValues) {
      reset({
        full_name: "",
        type: "residential",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  // Watch for country changes to load states
  const selectedCountry = watch("country");

  // Update selected country ID when form country changes
  useEffect(() => {
    if (selectedCountry && countries.length > 0) {
      const country = countries.find((c) => c.code === selectedCountry);
      if (country && country.id !== selectedCountryId) {
        setSelectedCountryId(country.id);
        // Clear state when country changes (except during initial load)
        if (selectedCountryId !== null) {
          setValue("state", "");
        }
      }
    }
  }, [selectedCountry, countries, selectedCountryId, setValue]);

  // Set default country only if no country is set and no default values
  useEffect(() => {
    if (countries.length > 0 && !watch("country") && !defaultValues?.country) {
      const defaultCountry = countries.find((c) => c.code === "IN") || countries[0];
      if (defaultCountry) {
        setValue("country", defaultCountry.code);
      }
    }
  }, [countries, setValue, watch, defaultValues]);

  // Show loading indicator while countries are loading
  if (isLoadingCountries) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" color="primary">
          Edit Address
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              console.log('Cancel clicked in EditForm');
              if (typeof onCancel === 'function') {
                onCancel();
              }
            }}
            size="small"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit((data) => {
              console.log('=== SAVE CLICKED IN EDITFORM ===');
              console.log('Form Data:', data);
              console.log('Selected Address ID:', selectedAddressId);
              console.log('=== END SAVE DATA ===');
              
              if (!selectedAddressId) {
                console.error('No address ID provided for update');
                return;
              }
              
              // Call the PATCH update API
              patchUpdateAddress(
                {
                  id: selectedAddressId,
                  full_name: data.full_name,
                  business_name: data.business_name,
                  gst_number: data.gst_number,
                  address_line1: data.address_line1,
                  address_line2: data.address_line2,
                  city: data.city,
                  state: data.state,
                  postal_code: data.postal_code,
                  country: data.country,
                },
                {
                  onSuccess: () => {
                    console.log('Address updated successfully');
                    // Call the success callback to refresh addresses
                    onSuccess?.();
                    // Close the edit form
                    onCancel?.();
                  },
                  onError: (error) => {
                    console.error('Error updating address:', error);
                  },
                }
              );
            })}
            size="small"
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>
      <Grid container spacing={1}>
        {/* Full Name */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Controller
            name="full_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("common:store.checkout.addressNickname")}
                variant="outlined"
                size="small"
                fullWidth
                error={!!errors.full_name}
                helperText={errors.full_name?.message}
                required
              />
            )}
          />
        </Grid>

        {/* Address Line 1 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="address_line1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("common:store.checkout.addressLine1")}
                variant="outlined"
                size="small"
                fullWidth
                error={!!errors.address_line1}
                helperText={errors.address_line1?.message}
                required
              />
            )}
          />
        </Grid>

        {/* Address Line 2 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="address_line2"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("common:store.checkout.addressLine2")}
                variant="outlined"
                size="small"
                fullWidth
                error={!!errors.address_line2}
                helperText={errors.address_line2?.message}
              />
            )}
          />
        </Grid>

        <Grid size={{xs:12,sm:6}}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={countries}
                getOptionLabel={(option) => option.name || ""}
                loading={isLoadingCountries}
                isOptionEqualToValue={(option, value) =>
                  option.code === value.code
                }
                onChange={(_, newValue) => {
                  field.onChange(newValue ? newValue.code : "");
                }}
                value={
                  field.value
                    ? countries.find((c) => c.code === field.value) || null
                    : null
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("common:store.checkout.country")}
                    variant="outlined"
                    size="small"
                    error={!!errors.country}
                    helperText={errors.country?.message}
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingCountries ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Grid>

        {/* State */}
        <Grid size={{xs:12,sm:6}}>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={states}
                getOptionLabel={(option) => option.name || ""}
                loading={isLoadingStates}
                disabled={!watch("country")}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, newValue) => {
                  field.onChange(newValue ? newValue.name : "");
                }}
                value={
                  field.value
                    ? states.find((s) => s.name === field.value) || null
                    : null
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("common:store.checkout.state")}
                    variant="outlined"
                    size="small"
                    error={!!errors.state}
                    helperText={errors.state?.message}
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingStates ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Grid>
        {/* City */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("common:store.checkout.city")}
                variant="outlined"
                size="small"
                fullWidth
                error={!!errors.city}
                helperText={errors.city?.message}
                required
              />
            )}
          />
        </Grid>

        {/* Postal Code */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="postal_code"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("common:store.checkout.postalCode")}
                variant="outlined"
                size="small"
                fullWidth
                error={!!errors.postal_code}
                helperText={errors.postal_code?.message}
                required
              />
            )}
          />
        </Grid>

        {/* GST Number and Business Name fields - only shown when formId is billing-address-form */}
        {formId === "billing-address-form" &&
          customerGroupType === "BUSINESS" && (
            <>
              {/* GST Number */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="gst_number"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t(
                        "common:store.checkout.gstNumber",
                        "GST Number (Optional)"
                      )}
                      variant="outlined"
                      size="small"
                      error={!!errors.gst_number}
                      helperText={errors.gst_number?.message}
                      placeholder={"e.g. 22AAAAA0000A1Z5"}
                    />
                  )}
                />
              </Grid>
              {/* Business Name */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="business_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t(
                        "common:store.checkout.businessName",
                        "Business Name"
                      )}
                      variant="outlined"
                      size="small"
                      fullWidth
                      error={!!errors.business_name}
                      helperText={errors.business_name?.message}
                      required
                    />
                  )}
                />
              </Grid>
            </>
          )}
      </Grid>
    </>
  );
};
