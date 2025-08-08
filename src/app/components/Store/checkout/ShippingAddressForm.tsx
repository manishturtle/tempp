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
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShippingAddressFormData } from "@/app/types/store/checkout";
import { useLocation } from "@/app/hooks/api/tenant-admin/useLocation";
import { useParams } from "next/navigation";

interface ShippingAddressFormProps {
  defaultValues?: Partial<ShippingAddressFormData>;
  isAuthenticated: boolean;
  onSubmit: (data: ShippingAddressFormData) => void;
  isSubmitting?: boolean;
  formId?: string;
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
    .min(2, { message: "Business name must be at least 2 characters long" })
    .max(50, { message: "Business name must be less than 50 characters" })
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
  onSubmit,
  formId,
}) => {
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
  const userKey = tenantId ? `${tenantId}_auth_user` : " ";

  const userDataStr = localStorage.getItem(userKey);
  console.log("Auth user key being checked:", userKey);
  
  // Parse user data and get customer group type
  let customerGroupType = null;
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      console.log("Parsed user data:", userData);
      
      if (userData.customer_group) {
        customerGroupType = userData.customer_group.type;
        console.log("Customer Group Details:", {
          id: userData.customer_group.id,
          name: userData.customer_group.name,
          type: customerGroupType
        });
      } else {
        console.log("No customer group found in user data");
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

  // Watch for country and state changes
  const selectedCountry = watch("country");
  const selectedState = watch("state");

  // Update selected IDs when form values change
  useEffect(() => {
    // Find country ID from selected country code
    if (selectedCountry) {
      const country = countries.find((c) => c.code === selectedCountry);
      if (country && country.id !== selectedCountryId) {
        setSelectedCountryId(country.id);
        // Reset state and city when country changes
        setValue("state", "");
        setValue("city", "");
        setSelectedStateId(null);
      }
    }
  }, [selectedCountry, countries, setValue, selectedCountryId]);

  useEffect(() => {
    // Find state ID from selected state name
    if (selectedState) {
      const state = states.find((s) => s.name === selectedState);
      if (state && state.id !== selectedStateId) {
        setSelectedStateId(state.id);
        // Reset city when state changes
        setValue("city", "");
      }
    }
  }, [selectedState, states, setValue, selectedStateId]);

  useEffect(() => {
    if (countries.length > 0 && !watch("country")) {
      const defaultCountry =
        countries.find((c) => c.code === "IN") || countries[0];
      if (defaultCountry) {
        setValue("country", defaultCountry.code);
      }
    }
  }, [countries, setValue, watch]);

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
    <Box
      component="form"
      id={formId || "shipping-address-form"}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Grid container spacing={1}>
        {/* Address Type
        <Grid item xs={12}>
          <FormControl component="fieldset" fullWidth>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Box display="flex" gap={1} flexWrap="wrap">
                  {[
                    { value: 'residential', label: t('common:store.checkout.residentialAddress', 'Residential') },
                    { value: 'business', label: t('common:store.checkout.businessAddress', 'Business') },
                    { value: 'other', label: t('common:store.checkout.otherAddress', 'Other') },
                  ].map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      onClick={() => field.onChange(option.value)}
                      variant={field.value === option.value ? 'filled' : 'outlined'}
                      color={field.value === option.value ? 'primary' : 'default'}
                      sx={{
                        borderRadius: 1,
                        fontWeight: field.value === option.value ? 600 : 400,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    />
                  ))}
                </Box>
              )}
            />
          </FormControl>
        </Grid>
         */}

        {/* Full Name */}
        <Grid size={{xs:12}} sx={{ mt: 1 }}>
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
        <Grid size={{xs:12,md:6}}>
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
        <Grid size={{xs:12,md:6}}>
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

        {/* Country */}
        <Grid size={{xs:12,sm:6}}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
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
                {...field}
                options={states}
                getOptionLabel={(option) => option.name || ""}
                loading={isLoadingStates}
                disabled={!selectedCountry}
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
        <Grid size={{xs:12,sm:6}}>
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
        <Grid size={{xs:12,sm:6}}>
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
        {formId === "billing-address-form" && customerGroupType === "BUSINESS" && (
          <>
            {/* GST Number */}
            <Grid size={{xs:12,md:6}}>
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
            <Grid size={{xs:12,md:6}}>
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
    </Box>
  );
};
