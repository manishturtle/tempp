"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  useTheme,
  Chip,
  Stack,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useTimeSlots } from "@/app/hooks/api/store/useShippingMethods";

/**
 * Delivery preferences interface
 */
export interface TimeSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  // Add any other properties as needed
}

export interface DeliveryPreferences {
  preferredDate: Date | null;
  preferredTimeSlots?: TimeSlot[];
  deliveryInstructions: string;
}

/**
 * Props for the DeliveryPreferences component
 */
interface DeliveryPreferencesProps {
  preferences: DeliveryPreferences;
  enable_preferred_date?: boolean;
  enable_time_slots?: boolean;
  onChange: (preferences: DeliveryPreferences) => void;
}

/**
 * Component for selecting delivery preferences during checkout
 */
export const DeliveryPreferences: React.FC<DeliveryPreferencesProps> = ({
  preferences,
  enable_preferred_date = false,
  enable_time_slots = false,
  onChange,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  // Create a handler for updating any field
  const handleTimeSlotToggle = (slot: TimeSlot): void => {
    const currentSlots = preferences.preferredTimeSlots || [];
    const exists = currentSlots.some((s) => s.id === slot.id);
    const newSlots = exists
      ? currentSlots.filter((s) => s.id !== slot.id)
      : [...currentSlots, slot];
    onChange({
      ...preferences,
      preferredTimeSlots: newSlots,
    });
  };

  const handleChange = (field: keyof DeliveryPreferences, value: any): void => {
    onChange({
      ...preferences,
      [field]: value,
    });
  };

  // Fetch time slots from API
  const {
    data: timeSlots,
    isLoading: isLoadingTimeSlots,
    error: timeSlotsError,
  } = useTimeSlots();

  return (
    <>
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {/* Date and Time Column */}
        {enable_preferred_date && (
          <Grid size={{xs:12, md:3}}>
            {/* Date Picker */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={preferences.preferredDate}
                onChange={(date) => handleChange("preferredDate", date)}
                slotProps={{
                  textField: {
                    label: t(
                      "common:store.checkout.preferredDeliveryDate",
                      "Preferred Date"
                    ),
                    fullWidth: true,
                    size: "small",
                    placeholder: "dd-mm-yyyy",
                  },
                }}
                disablePast
              />
            </LocalizationProvider>
          </Grid>
        )}
        {/* Time Slots as Chips */}
        {enable_time_slots && (
          <Grid size={{xs:12, md:4.5}}>
           
              {isLoadingTimeSlots ? (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : timeSlotsError ? (
                <Typography color="error" variant="body2">
                  {t(
                    "common:store.checkout.errorLoadingTimeSlots",
                    "Error loading time slots"
                  )}
                </Typography>
              ) : (
                <Autocomplete
                  multiple
                  id="time-slots-autocomplete"
                  options={timeSlots || []}
                  value={preferences.preferredTimeSlots || []}
                  getOptionLabel={(option) => `${option.start_time.substring(0, 5)} - ${option.end_time.substring(0, 5)}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, newValue) => {
                    handleChange("preferredTimeSlots", newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label={t("common:store.checkout.selectTimeSlots", "Select Time Slots")}
                      placeholder={t("common:store.checkout.selectTimeSlotsPlaceholder", "Choose preferred times")}
                      size="small"
                      fullWidth
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={`${option.start_time.substring(0, 5)} - ${option.end_time.substring(0, 5)}`}
                        color="primary"
                        size="small"
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                          },
                        }}
                      />
                    ))
                  }
                  noOptionsText={
                    <Typography variant="body2" color="textSecondary">
                      {t("common:store.checkout.noTimeSlotsAvailable", "No time slots available")}
                    </Typography>
                  }
                  sx={{
                    width: '100%',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#ccc',
                      },
                      '&:hover fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                />                
              )}
            
          </Grid>
        )}

        {/* Instructions Column */}
        <Grid size={{xs:12, md:4.5}}>
        <TextField
            label={t(
              "common:store.checkout.deliveryInstructions",
              "Instructions"
            )}
            fullWidth
            size="small"
            value={preferences.deliveryInstructions}
            onChange={(e) =>
              handleChange("deliveryInstructions", e.target.value)
            }
            placeholder={t(
              "common:store.checkout.specialInstructionsPlaceholder",
              "Special delivery instructions, preferred location, etc."
            )}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default DeliveryPreferences;
