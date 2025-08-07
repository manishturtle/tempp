"use client";

import React, { useState, useEffect } from "react";
import {
  useActiveSellingChannels,
  SellingChannel,
} from "@/app/hooks/api/useActiveGroupsSellingChannels";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL, LOCATION_ENDPOINTS } from "@/app/constant";
import { z } from "zod";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Chip,
  Grid,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Autocomplete,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useTranslation } from "react-i18next";

import {
  StorePickupPayload,
  StoreOperatingHours,
} from "@/app/types/admin/storePickup";

// Days of the week for operating hours
const daysOfWeek = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

type DayOfWeek = (typeof daysOfWeek)[number]["key"];

// Form schema for validation
const storePickupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_person: z.string().min(1, "Contact person is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().nullable().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  pincode: z.string().min(1, "Postal code is required"),
  google_place_id: z.string().nullable().optional(),
  customer_group_selling_channels: z.array(z.number()),
  is_active: z.boolean(),
  operating_hours: z.record(
    z.string(),
    z.object({
      is_open: z.boolean(),
      open: z.string().optional(),
      close: z.string().optional(),
    })
  ),
});

export type StorePickupFormValues = z.infer<typeof storePickupSchema>;

export interface StorePickupFormProps {
  defaultValues?: StorePickupFormValues;
  onSubmit: (data: StorePickupFormValues) => void;
}

export const StorePickupForm = ({
  defaultValues = {
    name: "",
    contact_person: "",
    contact_number: "",
    address_line1: "",
    address_line2: null,
    city: "",
    state: "",
    country: "",
    pincode: "",
    google_place_id: null,
    is_active: true,
    customer_group_selling_channels: [],
    operating_hours: {
      monday: { is_open: true, open: "09:00", close: "18:00" },
      tuesday: { is_open: true, open: "09:00", close: "18:00" },
      wednesday: { is_open: true, open: "09:00", close: "18:00" },
      thursday: { is_open: true, open: "09:00", close: "18:00" },
      friday: { is_open: true, open: "09:00", close: "18:00" },
      saturday: { is_open: false },
      sunday: { is_open: false },
    },
  },
  onSubmit,
}: StorePickupFormProps): React.ReactElement => {
  const { t } = useTranslation(["common"]);
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  
  // Fetch active selling channels
  const { data: sellingChannels = [] } = useActiveSellingChannels();
  
  // Handle customer group selling channel changes
  const handleCustomerGroupChange = (
    field: any,
    newValue: SellingChannel[]
  ): void => {
    field.onChange(newValue.map((channel) => channel.id));
  };

  // Fetch countries
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}${LOCATION_ENDPOINTS.COUNTRIES}`);
      return data || [];
    },
  });

  // Fetch states based on selected country
  const { data: states = [], isLoading: isLoadingStates } = useQuery({
    queryKey: ['states', selectedCountryId],
    queryFn: async () => {
      if (!selectedCountryId) return [];
      const { data } = await axios.get(`${API_BASE_URL}${LOCATION_ENDPOINTS.STATES}?countryId=${selectedCountryId}`);
      return data || [];
    },
    enabled: !!selectedCountryId,
  });

  // Initialize selectedCountryId when countries are loaded and defaultValues has country
  useEffect(() => {
    if (countries.length > 0 && defaultValues.country) {
      const countryObj = countries.find((c: any) => c.code === defaultValues.country);
      if (countryObj) {
        setSelectedCountryId(countryObj.id);
      }
    }
  }, [countries, defaultValues.country]);

  // Form setup with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    resetField,
  } = useForm<StorePickupFormValues>({
    resolver: zodResolver(storePickupSchema),
    defaultValues,
  });

  // Watch operating hours to update UI
  const operatingHours = watch("operating_hours");

  // Handle day open/close toggle
  const handleDayToggle = (day: DayOfWeek): void => {
    const currentValue = operatingHours[day].is_open;
    setValue(`operating_hours.${day}.is_open`, !currentValue);

    // Clear times if toggled off
    if (currentValue) {
      setValue(`operating_hours.${day}.open`, undefined);
      setValue(`operating_hours.${day}.close`, undefined);
    } else {
      // Set default times if toggled on
      setValue(`operating_hours.${day}.open`, "09:00");
      setValue(`operating_hours.${day}.close`, "18:00");
    }
  };

  // Format time string (HH:MM) from Date
  const formatTimeString = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    return date.toTimeString().slice(0, 5);
  };

  // Parse time string (HH:MM) to Date
  const parseTimeString = (timeString: string | undefined): Date | null => {
    if (!timeString) return null;

    const today = new Date();
    const [hours, minutes] = timeString.split(":").map(Number);

    const date = new Date(today);
    date.setHours(hours, minutes, 0, 0);

    return date;
  };

  return (
    <Box sx={{ py: 2 }}>
      <form id="store-pickup-form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          {/* Left Column (50%) */}
          <Grid size={{ xs: 12, md: 7 }}>
            {/* Store Information Section */}
            <Paper sx={{ p: 2, mb: 2 }} elevation={0} variant="outlined">
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                {t("storePickup.storeInformation")}
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.name")}
                        fullWidth
                        size="small"
                        required
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="contact_person"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.contactPerson")}
                        fullWidth
                        size="small"
                        required
                        error={!!errors.contact_person}
                        helperText={errors.contact_person?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="contact_number"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.contactNumber")}
                        fullWidth
                        required
                        size="small"
                        error={!!errors.contact_number}
                        helperText={errors.contact_number?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>{t("storePickup.active")}</InputLabel>
                        <Select
                          {...field}
                          label={t("storePickup.active")}
                          size="small"
                          value={field.value ? 'true' : 'false'}
                          onChange={(e) => field.onChange(e.target.value === 'true')}
                          error={!!errors.is_active}
                        >
                          <MenuItem value="true">{t("common.yes")}</MenuItem>
                          <MenuItem value="false">{t("common.no")}</MenuItem>
                        </Select>
                        {errors.is_active && (
                          <FormHelperText error>
                            {errors.is_active.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Customer Group Selling Channels Autocomplete */}
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
                          <TextField
                            {...params}
                            label={t("excludedSegmentName")}
                            size="small"
                            error={!!errors.customer_group_selling_channels}
                            helperText={errors.customer_group_selling_channels?.message}
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
              </Grid>
            </Paper>

            {/* Address Section */}
            <Paper sx={{ p: 2, mb: 2 }} elevation={0} variant="outlined">
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                {t("storePickup.address")}
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="address_line1"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.addressLine1")}
                        fullWidth
                        size="small"
                        required
                        error={!!errors.address_line1}
                        helperText={errors.address_line1?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="address_line2"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.addressLine2")}
                        fullWidth
                        size="small"
                        error={!!errors.address_line2}
                        helperText={errors.address_line2?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        options={countries}
                        getOptionLabel={(option) => option.name || ""}
                        loading={isLoadingCountries}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        onChange={(_, newValue) => {
                          field.onChange(newValue?.code || "");
                          setSelectedCountryId(newValue?.id || null);
                          resetField('state');
                        }}
                        value={countries.find((c: any) => c.code === field.value) || null}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t("storePickup.country")}
                            variant="outlined"
                            size="small"
                            required
                            error={!!errors.country}
                            helperText={errors.country?.message}
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        options={states}
                        getOptionLabel={(option) => option.name || ""}
                        loading={isLoadingStates}
                        disabled={!selectedCountryId}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        onChange={(_, newValue) => {
                          field.onChange(newValue?.name || "");
                        }}
                        value={states.find((s: any) => s.name === field.value) || null}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t("storePickup.state")}
                            variant="outlined"
                            size="small"
                            required
                            error={!!errors.state}
                            helperText={errors.state?.message}
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.city")}
                        fullWidth
                        size="small"
                        required
                        error={!!errors.city}
                        helperText={errors.city?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="pincode"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.postalCode")}
                        fullWidth
                        size="small"
                        required
                        error={!!errors.pincode}
                        helperText={errors.pincode?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="google_place_id"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t("storePickup.googlePlaceId")}
                        fullWidth
                        size="small"
                        error={!!errors.google_place_id}
                        helperText={errors.google_place_id?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Right Column (50%) */}
          <Grid size={{ xs: 12, md: 5 }}>
            {/* Operating Hours Section */}
            <Paper sx={{ p: 2, mb: 2 }} elevation={0} variant="outlined">
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                {t("storePickup.operatingHours")}
              </Typography>

              <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px' } }}>
                <TableHead>
                      <TableRow>
                        <TableCell>{t("storePickup.days.day")}</TableCell>
                        <TableCell>{t("storePickup.open")}</TableCell>
                        <TableCell>{t("storePickup.from")}</TableCell>
                        <TableCell>{t("storePickup.to")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        {daysOfWeek.map(({ key, label }) => (
                          <TableRow key={key}>
                            <TableCell>{t(`storePickup.days.${key}`)}</TableCell>
                            <TableCell>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                  size="small"
                                  sx={{p:0}}
                                    checked={operatingHours[key]?.is_open || false}
                                    onChange={() => handleDayToggle(key)}
                                  />
                                }
                                label=""
                              />
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`operating_hours.${key}.open`}
                                control={control}
                                render={({ field }) => (
                                  <TimePicker
                                    disabled={!operatingHours[key]?.is_open}
                                    label=""
                                    value={parseTimeString(field.value)}
                                    onChange={(newValue) => {
                                      field.onChange(formatTimeString(newValue));
                                    }}
                                    slotProps={{
                                      textField: {
                                        fullWidth: true,
                                        size: "small",
                                        error: !!errors.operating_hours?.[key]?.open,
                                        helperText:
                                          errors.operating_hours?.[key]?.open
                                            ?.message,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Controller
                                name={`operating_hours.${key}.close`}
                                control={control}
                                render={({ field }) => (
                                  <TimePicker
                                    disabled={!operatingHours[key]?.is_open}
                                    label=""
                                    value={parseTimeString(field.value)}
                                    onChange={(newValue) => {
                                      field.onChange(formatTimeString(newValue));
                                    }}
                                    slotProps={{
                                      textField: {
                                        fullWidth: true,
                                        size: "small",
                                        error: !!errors.operating_hours?.[key]?.close,
                                        helperText:
                                          errors.operating_hours?.[key]?.close
                                            ?.message,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </LocalizationProvider>
                    </TableBody>
                  </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default StorePickupForm;