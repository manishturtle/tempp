"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Chip,
  Typography,
  Grid,
  Paper,
  Button,
} from "@mui/material";
import { 
  ShippingZoneFormSchema, 
  ShippingZoneFormData, 
  Pincode 
} from "./ShippingZoneForm.types";
import { useTranslation } from "react-i18next";
import { PincodeFilters } from "./PincodeFilters";
import { RefineSelectionDialog } from "./RefineSelectionDialog";

interface ShippingZoneFormProps {
  initialValues?: ShippingZoneFormData;
  onSubmit: (data: ShippingZoneFormData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export const ShippingZoneForm: React.FC<ShippingZoneFormProps> = ({
  initialValues,
  onSubmit,
  disabled = false,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShippingZoneFormData>({
    resolver: zodResolver(ShippingZoneFormSchema),
    defaultValues: initialValues || {
      zone_name: "",
      description: "",
      is_active: true,
      pincodes: [],
    },
  });

  // State for refine dialog
  const [refineDialogOpen, setRefineDialogOpen] = useState<boolean>(false);
  const [currentState, setCurrentState] = useState<string>("");

  // Handle district selection in refine dialog
  const handleRefineConfirm = (selectedDistricts: string[]): void => {
    // Filter pincodes based on selected districts
    const currentPincodes = watch('pincodes');
    const refinedPincodes = currentPincodes.filter((pincode: Pincode) => 
      pincode.state === currentState && selectedDistricts.includes(pincode.district)
    );
    
    // Keep pincodes from other states and add filtered ones
    const otherPincodes = currentPincodes.filter((pincode: Pincode) => 
      pincode.state !== currentState
    );
    
    setValue('pincodes', [...otherPincodes, ...refinedPincodes]);
  };

  // Handle direct pincode filtering from the refine dialog
  const handlePincodeFilter = (filteredPincodes: Pincode[]): void => {
    console.log(`Received ${filteredPincodes.length} filtered pincodes for state ${currentState}`);
    
    // Keep pincodes from other states
    const currentPincodes = watch('pincodes');
    const otherPincodes = currentPincodes.filter((pincode: Pincode) => 
      pincode.state !== currentState
    );
    
    // Update form with filtered pincodes
    console.log(`Updating pincodes: ${otherPincodes.length} from other states + ${filteredPincodes.length} filtered = ${otherPincodes.length + filteredPincodes.length} total`);
    setValue('pincodes', [...otherPincodes, ...filteredPincodes]);
  };

  return (
    <Box
      component="form"
      id="shipping-zone-form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: "flex", flexDirection: "column", gap: 3 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          {t("shippingZones.zoneDetails")}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="zone_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("shippingZones.zoneName")}
                  required
                  disabled={disabled}
                  inputProps={{ readOnly }}
                  size="small"
                  error={!!errors.zone_name}
                  helperText={errors.zone_name?.message}
                  fullWidth
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth disabled={disabled || readOnly}>
                  <InputLabel size="small" id="is-active-label">
                    {t("shippingZones.status")}
                  </InputLabel>
                  <Select
                    {...field}
                    size="small"
                    labelId="is-active-label"
                    label={t("shippingZones.status")}
                    value={field.value ? "true" : "false"}
                    onChange={(e) => field.onChange(e.target.value === "true")}
                    sx={{
                      height: "38px",
                      "& .MuiSelect-select": {
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                      },
                    }}
                  >
                    <MenuItem value="true">
                      {t("shippingZones.active")}
                    </MenuItem>
                    <MenuItem value="false">
                      {t("shippingZones.inactive")}
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("shippingZones.description")}
                  disabled={disabled}
                  inputProps={{ readOnly }}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  fullWidth
                  multiline
                  minRows={2}
                />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Pincode Selection Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          {t("shippingZones.pincodesSelection")}
        </Typography>
        
        {/* Pincode Filters */}
        <PincodeFilters
          disabled={disabled}
          readOnly={readOnly}
          onPincodesSelected={(selectedPincodes) => {
            // Update the form's pincodes field with the complete pincode objects
            setValue('pincodes', selectedPincodes);
            // Log selected pincodes for verification
            console.log("Selected pincodes in form:", selectedPincodes);
          }}
        />
        
      </Paper>

      {/* Selected Pincodes Display */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Your Selection (Items to be Added)
        </Typography>
        {/* Remove the subtitle as it's not needed */}
        
        {watch('pincodes')?.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Group pincodes by district and state */}
            {Object.entries(watch('pincodes')?.reduce((acc: Record<string, Pincode[]>, pincode: Pincode) => {
              const key = pincode.state;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(pincode);
              return acc;
            }, {})).map(([key, pincodes]) => {
              // Get state from first pincode in group
              const state = pincodes[0].state;
              
              return (
                <Paper
                  key={key}
                  elevation={0}
                  sx={{
                    p: 2,
                    py: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        mr: 2
                      }}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '18px' }}>place</span>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        Region: All of {state}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (approx. {pincodes.length.toLocaleString()} pincodes)
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="text"
                      color="primary"
                      onClick={() => {
                        // Open refine dialog for this state
                        setCurrentState(state);
                        setRefineDialogOpen(true);
                      }}
                      sx={{ fontWeight: 500 }}
                    >
                      Refine
                    </Button>
                    <Button 
                      size="small" 
                      variant="text"
                      color="error"
                      onClick={() => {
                        // Remove all pincodes from this state
                        console.log(`Removing state: ${state}`);
                        console.log('Current pincodes before removal:', watch('pincodes'));
                        
                        // Count pincodes by state before removal
                        const pincodesByState = watch('pincodes').reduce((acc: Record<string, number>, p: Pincode) => {
                          acc[p.state] = (acc[p.state] || 0) + 1;
                          return acc;
                        }, {});
                        console.log('Pincode counts by state before removal:', pincodesByState);
                        
                        // Filter out pincodes for this state
                        const updatedPincodes = watch('pincodes').filter(
                          (p: Pincode) => p.state !== state
                        );
                        
                        console.log(`Removed ${watch('pincodes').length - updatedPincodes.length} pincodes for state ${state}`);
                        console.log('Remaining pincodes after removal:', updatedPincodes);
                        
                        // Update the form value
                        setValue('pincodes', updatedPincodes);
                      }}
                      sx={{ fontWeight: 500 }}
                    >
                      Remove ×
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 6,
              px: 4, 
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                bgcolor: 'action.hover',
                borderRadius: '50%',
                mb: 2
              }}
            >
              <span className="material-icons-outlined" style={{ fontSize: '24px', color: '#666' }}>place</span>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Your selection cart is empty
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select regions, pincodes, or patterns to add to your shipping zone
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Refine Selection Dialog */}
      <RefineSelectionDialog
        open={refineDialogOpen}
        onClose={() => setRefineDialogOpen(false)}
        state={currentState}
        pincodes={watch('pincodes').filter((p: Pincode) => p.state === currentState)}
        onConfirm={handleRefineConfirm}
        onPincodeFilter={handlePincodeFilter}
      />
    </Box>
  );
};
