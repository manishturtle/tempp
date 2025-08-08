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
  const { data: timeSlots, isLoading: isLoadingTimeSlots, error: timeSlotsError } = useTimeSlots();

  return (
    <>
      
      <Grid container spacing={2} sx={{mt: 0.5}}>
        {/* Date and Time Column */}
        <Grid size={{xs:12, md:6}}>
          <Stack>
            {/* Date Picker */}
            {enable_preferred_date && (
              <Box>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={preferences.preferredDate}
                    onChange={(date) => handleChange("preferredDate", date)}
                    slotProps={{
                      textField: {
                        label: t(
                          "common:store.checkout.preferredDeliveryDate",
                          "Preferred Delivery Date"
                        ),
                        fullWidth: true,
                        size: "small",
                        placeholder: "dd-mm-yyyy",
                      },
                    }}
                    disablePast
                  />
                </LocalizationProvider>
              </Box>
            )}
            
            {/* Time Slots as Chips */}
            {enable_time_slots && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("common:store.checkout.availableTimeSlots", "Available Time Slots")}
                </Typography>
                
                {isLoadingTimeSlots ? (
                  <Box display="flex" justifyContent="center" my={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : timeSlotsError ? (
                  <Typography color="error" variant="body2">
                    {t("common:store.checkout.errorLoadingTimeSlots", "Error loading time slots")}
                  </Typography>
                ) : (
                  <Paper 
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: 1,
                      borderColor: "#ccc",
                    }}
                  >
                    <Box sx={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 1,
                      width: '100%',
                      '& > *': {
                        width: '100%',
                        '& .MuiChip-root': {
                          width: '100%',
                          justifyContent: 'center'
                        }
                      }
                    }}>
                      {timeSlots?.map((slot: TimeSlot) => {
                        const isSelected = (preferences.preferredTimeSlots || []).some((s) => s.id === slot.id);
                        return (
                          <Chip
                            key={slot.id}
                            label={`${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`}
                            variant={isSelected ? "filled" : "outlined"}
                            color={isSelected ? "primary" : "default"}
                            onClick={() => handleTimeSlotToggle(slot)}
                            sx={{
                              borderColor: theme.palette.primary.main,
                              '&.MuiChip-filled': {
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                '&:hover': {
                                  bgcolor: theme.palette.primary.dark,
                                },
                              },
                              '&.MuiChip-outlined:hover': {
                                bgcolor: 'transparent',
                                borderColor: theme.palette.primary.dark,
                                color: theme.palette.primary.dark,
                              },
                            }}
                          />
                        );
                      })}
                      {(!timeSlots || timeSlots.length === 0) && (
                        <Typography variant="body2" color="textSecondary">
                          {t("common:store.checkout.noTimeSlotsAvailable", "No time slots available")}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}
          </Stack>
        </Grid>

        {/* Instructions Column */}
        <Grid size={{xs:12, md:6}}>
          <Box>
            <TextField
              multiline
              label={t(
                "common:store.checkout.deliveryInstructions",
                "Delivery Instructions"
              )}
              rows={4}
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
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default DeliveryPreferences;
