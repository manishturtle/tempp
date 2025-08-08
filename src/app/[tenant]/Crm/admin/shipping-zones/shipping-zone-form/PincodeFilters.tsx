"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Box, Typography, Autocomplete, TextField, Button, Grid } from "@mui/material";
import { 
  usePincodes, 
  usePincodeUniqueValues, 
  Pincode,
  extractStatesFromHierarchy,
  extractDistrictsFromHierarchy 
} from "@/app/hooks/api/admin/usePincodes";
import { useTranslation } from "react-i18next";

interface PincodeFiltersProps {
  disabled?: boolean;
  readOnly?: boolean;
  onPincodesSelected?: (pincodes: Pincode[]) => void;
}


export const PincodeFilters: React.FC<PincodeFiltersProps> = ({
  disabled = false,
  readOnly = false,
  onPincodesSelected,
}) => {
  const { t } = useTranslation();
  // India is hardcoded as the country
  const selectedCountry = "IN";
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<Pincode[]>([]);
  
  // Fetch unique values from the backend using the hierarchical API
  const { data: uniqueValuesData, isLoading: isLoadingUniqueValues } = usePincodeUniqueValues({
    country_code: selectedCountry
  });
  
  // Extract states for the selected country (India)
  const states = useMemo(() => {
    return extractStatesFromHierarchy(uniqueValuesData, selectedCountry);
  }, [uniqueValuesData, selectedCountry]);
  
  // Extract districts for the selected country and states
  const districts = useMemo(() => {
    if (selectedStates.length === 0) {
      // If no states selected, show no districts
      return [];
    }
    
    // If only one state is selected, show districts for that state
    if (selectedStates.length === 1) {
      return extractDistrictsFromHierarchy(uniqueValuesData, selectedCountry, selectedStates[0]);
    }
    
    // If multiple states selected, concatenate all districts from those states
    const allDistricts: string[] = [];
    selectedStates.forEach(state => {
      const stateDistricts = extractDistrictsFromHierarchy(uniqueValuesData, selectedCountry, state);
      allDistricts.push(...stateDistricts);
    });
    
    // Return unique districts (using Array filter instead of Set to avoid TypeScript iteration issues)
    return allDistricts.filter((district, index) => allDistricts.indexOf(district) === index);
  }, [uniqueValuesData, selectedCountry, selectedStates]);
  
  // Fetch filtered pincodes based on selections - only when state or district is selected
  const { data: pincodesData, isLoading: isLoadingPincodes } = usePincodes({
    country_code: selectedCountry,
    state: selectedStates.length > 0 ? selectedStates.join(',') : undefined,
    district: selectedDistricts.length > 0 ? selectedDistricts.join(',') : undefined
  });
  
  // Only console log when state or district filters are applied
  useEffect(() => {
    if (selectedStates.length > 0 || selectedDistricts.length > 0) {
      console.log("Filtered pincodes based on selections:", pincodesData);
    }
  }, [pincodesData, selectedStates, selectedDistricts]);
  
  // Log the hierarchical structure for debugging
  useEffect(() => {
    if (uniqueValuesData) {
      console.log("Hierarchical structure:", uniqueValuesData);
    }
  }, [uniqueValuesData]);

  // Handle filter changes
  const handleStatesChange = (event: any, values: string[]) => {
    setSelectedStates(values);
    setSelectedDistricts([]);
    // When state selection changes, reset selected pincodes
    setSelectedPincodes([]);
    if (onPincodesSelected) {
      onPincodesSelected([]);
    }
  };

  const handleDistrictsChange = (event: any, values: string[]) => {
    setSelectedDistricts(values);
    // When district selection changes, reset selected pincodes
    setSelectedPincodes([]);
    if (onPincodesSelected) {
      onPincodesSelected([]);
    }
  };

  // Handle pincode selection
  const handlePincodeToggle = (pincode: Pincode) => {
    const isSelected = selectedPincodes.some(p => p.id === pincode.id);
    let updatedPincodes: Pincode[];
    
    if (isSelected) {
      updatedPincodes = selectedPincodes.filter(p => p.id !== pincode.id);
    } else {
      updatedPincodes = [...selectedPincodes, pincode];
    }
    
    setSelectedPincodes(updatedPincodes);
    
    if (onPincodesSelected) {
      onPincodesSelected(updatedPincodes);
    }
  };

  // Handle Add to Selection button click
  const handleAddToSelection = () => {
    if (!pincodesData || pincodesData.length === 0) return;
    
    // Create a map of existing pincode IDs for quick lookup
    const existingPincodeIds = new Set(selectedPincodes.map(p => p.id));
    
    // Add only new pincodes that aren't already selected
    const newPincodes = [
      ...selectedPincodes,
      ...pincodesData.filter(pincode => !existingPincodeIds.has(pincode.id))
    ];
    
    setSelectedPincodes(newPincodes);
    
    // Notify parent component about the updated selection
    if (onPincodesSelected) {
      onPincodesSelected(newPincodes);
    }
    
    console.log("Added pincodes to selection:", pincodesData);
  };

  useEffect(() => {
    console.log("Selected States:", selectedStates);
  }, [selectedStates]);
  
  useEffect(() => {
    console.log("Selected Districts:", selectedDistricts);
  }, [selectedDistricts]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
        {t("shippingZones.filterPincodes")}
      </Typography>
      
      <Grid container spacing={2}>
        {/* Country Field - Hardcoded to India */}
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            disabled
            label={t("shippingZones.country")}
            value="India (IN)"
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>
        
        {/* State Selector */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            multiple
            options={states}
            value={selectedStates}
            onChange={handleStatesChange}
            disabled={disabled || readOnly || isLoadingUniqueValues}
            getOptionLabel={(option) => option}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("shippingZones.state")}
                placeholder={selectedStates.length === 0 ? t("shippingZones.selectState") : ""}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            )}
          />
        </Grid>
        
        {/* District Selector */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            multiple
            options={districts}
            value={selectedDistricts}
            onChange={handleDistrictsChange}
            disabled={disabled || readOnly || isLoadingUniqueValues || selectedStates.length === 0}
            getOptionLabel={(option) => option}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("shippingZones.district")}
                placeholder={selectedDistricts.length === 0 ? t("shippingZones.selectDistrict") : ""}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            )}
          />
        </Grid>
      </Grid>
      
      {/* Add to Selection Button */}
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleAddToSelection}
          disabled={disabled || readOnly || isLoadingPincodes || !pincodesData || pincodesData.length === 0}
        >
          {t("shippingZones.addToSelection")}
        </Button>
      </Box>

    </Box>
  );
};