import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Popover,
  TextField,
  Autocomplete,
  Grid,
  InputAdornment,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import api from '@/lib/storeapi';

interface CountryOption {
  code: string;
  label: string;
  flag: React.ReactNode;
}

interface Country {
  id: number;
  name: string;
  iso_code: string;
  flag_url: string;
}

// Fetch countries for current tenant
async function fetchCountries(): Promise<Country[]> {
  const response = await api.get('/shared/country-list-raw/');
  return response.data;
}

interface LocationPopoverProps {
  tenantSlug: string;
  open: boolean;
  onClose: () => void;
  initialPincode?: string;
  initialCountry?: CountryOption;
  onSave?: (data: { country: CountryOption | null; pincode: string }) => void;
}

/**
 * LocationPopover - Popover for selecting delivery location (country, pincode)
 * @param {LocationPopoverProps} props
 * @returns {React.ReactElement}
 */
export function LocationPopover({
  tenantSlug,
  open,
  onClose,
  initialPincode = "",
  initialCountry,
  onSave,
}: LocationPopoverProps): React.ReactElement {
  // Fetch countries using React Query
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
  });

 
  const COUNTRY_OPTIONS: CountryOption[] = React.useMemo(
    () =>
      countries.map((country: Country) => ({
        code: country.iso_code,
        label: country.name,
        flag: (
          <img
            loading="lazy"
            width="20"
            srcSet={`https://flagcdn.com/w40/${country.iso_code.toLowerCase()}.png 2x`}
            src={`https://flagcdn.com/w20/${country.iso_code.toLowerCase()}.png`}
            alt={country.iso_code}
          />
        ),
      })),
    [countries]
  );

  const [country, setCountry] = React.useState<CountryOption | null>(null);

  // Helper: find country by label or code
  function findCountry(value: string): CountryOption | undefined {
    if (!value) return undefined;
    // Try case-insensitive code match, then label match
    return COUNTRY_OPTIONS.find(
      (c) => c.code.toLowerCase() === value.toLowerCase() || c.label === value
    );
  }

  // Initialize with saved location if available
  React.useEffect(() => {
    if (COUNTRY_OPTIONS.length > 0 && tenantSlug && !country) {
      // First try tenant-specific location
      const locationKey = `${tenantSlug}_location`;
      const savedLocation = localStorage.getItem(locationKey);
      console.log('[LocationPopover] Raw tenant localStorage:', savedLocation);
      
      // Then try generic location (from geolocation)
      const genericLocation = localStorage.getItem("location");
      console.log('[LocationPopover] Raw generic localStorage:', genericLocation);
      
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          console.log('[LocationPopover] Parsed tenant localStorage:', parsed);
          const { country: countryName, pincode: savedPincode } = parsed;
          if (countryName) {
            console.log('[LocationPopover] Loaded country from local storage:', countryName);
            const savedCountry = findCountry(countryName);
            if (savedCountry) {
              console.log('[LocationPopover] Matched country object from options (by label or code):', savedCountry);
            } else {
              console.warn('[LocationPopover] No match for country in options:', countryName);
            }
            if (savedCountry) {
              console.log('Setting country from savedLocation:', savedCountry);
              // Use the exact reference returned by findCountry (already from COUNTRY_OPTIONS)
              setCountry(savedCountry);
              if (savedPincode) setPincode(savedPincode);
              
              return; // Exit early if found
            }
          }
        } catch (e) {
          console.error("Error parsing saved location", e);
        }
      }
      
      if (genericLocation) {
        try {
          const parsed = JSON.parse(genericLocation);
          console.log('[LocationPopover] Parsed generic localStorage:', parsed);
          const { country: countryName, pincode: savedPincode } = parsed;
          if (countryName) {
            console.log('[LocationPopover] Loaded country from local storage (generic):', countryName);
            const savedCountry = findCountry(countryName);
            if (savedCountry) {
              console.log('[LocationPopover] Matched country object from options (generic, by label or code):', savedCountry);
            } else {
              console.warn('[LocationPopover] No match for country in options (generic):', countryName);
            }
            if (savedCountry) {
              // Use the exact reference returned by findCountry (already from COUNTRY_OPTIONS)
              setCountry(savedCountry);
              if (savedPincode) setPincode(savedPincode);
              return; // Exit early if found
            }
          }
        } catch (e) {
          console.error("Error parsing generic location", e);
        }
      }
      
      // Default fallback
      if (COUNTRY_OPTIONS.length > 0) {
        setCountry(COUNTRY_OPTIONS[0]);
      }
    }
  }, [COUNTRY_OPTIONS, tenantSlug, country]);
  
  const [pincode, setPincode] = useState<string>(initialPincode);
  
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug: log whenever country value changes and its mapping in COUNTRY_OPTIONS
  React.useEffect(() => {
    if (country) {
      const foundInOptions = COUNTRY_OPTIONS.find(opt => opt.label === country.label);
      console.log('[LocationPopover] Autocomplete value (country):', country);
      console.log('[LocationPopover] Country found in options:', foundInOptions);
      console.log('[LocationPopover] Is same reference as Autocomplete value?', foundInOptions === country);
    } else {
      console.log('[LocationPopover] Autocomplete value (country) is undefined');
    }
  }, [country, COUNTRY_OPTIONS]);

  function handleSave() {
    if (!pincode || !country) return;
    setSaving(true);
    
    const locationKey = `${tenantSlug}_location`;
    localStorage.setItem(
      locationKey,
      JSON.stringify({
        country: country.label,
        pincode,
        
      })
    );
    
    // Also update the generic location for consistency
    localStorage.setItem(
      "location",
      JSON.stringify({
        country: country.label,
        pincode,
      })
    );
    
    setSaving(false);
    if (onSave) onSave({ country, pincode });
    onClose();
  }

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 3,
        minWidth: 340,
        maxWidth: 380,
        bgcolor: "background.paper",
        boxShadow: 24,
      }}
    >
      <Grid container alignItems="center">
        <Grid size={{ xs: 12 }}>
          <Autocomplete
            autoHighlight
            options={COUNTRY_OPTIONS}
            value={country}

            {...(() => { 
              console.log('Autocomplete render - country:', country);
              if (country) {
                const foundInOptions = COUNTRY_OPTIONS.find(opt => opt.label === country.label);
                console.log('Country found in options:', foundInOptions);
                console.log('Are they the same reference?', foundInOptions === country);
              }
              return {}; 
            })()}
            onChange={(_, value) => setCountry(value)}
            disableClearable
            loading={isLoading}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.label === value.label}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Box
                  key={key}
                  component="li"
                  sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                  {...optionProps}
                >
                  {option.flag}
                  {option.label} ({option.code})
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: country ? (
                    <InputAdornment position="start">
                      {country.flag}
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            inputRef={inputRef}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            variant="outlined"
            size="small"
            placeholder="Pincode"
            fullWidth
            inputProps={{ maxLength: 10 }}
          />
        </Grid>
        
        <Grid container spacing={2} size={{ xs: 12 }}>
        <Grid size={{ xs: 6 }}>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={onClose}
            sx={{ fontWeight: 700, mr: 1 }}
          >
            Cancel
          </Button>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={!pincode || saving}
            onClick={handleSave}
            sx={{ fontWeight: 700 }}
          >
            Save
          </Button>
        </Grid>
        </Grid>
       
      </Grid>
    </Box>
  );
}
