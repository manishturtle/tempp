import { FC, useState, useCallback, useMemo, useEffect } from "react";
import StatesVirtualList from "./StatesVirtualList";
import DistrictsVirtualList from "./DistrictsVirtualList";
import PincodesVirtualList from "./PincodesVirtualList";
import { useTranslation } from "react-i18next";
import { usePincodes } from "@/app/hooks/api/admin/usePincodes";
import {
  useCreateShippingZone,
  useUpdateShippingZone,
} from "@/app/hooks/api/admin/useShippingZones";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
  TextField,
  Autocomplete,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
  usePincodeUniqueValues,
  extractCountriesFromHierarchy,
} from "@/app/hooks/api/admin/usePincodes";

interface ShippingZoneFormProps {
  onClose: () => void;
  onSave: (data: {
    zoneName: string;
    country: string;
    selectedStates?: string[];
    selectedDistricts?: string[];
    selectedPincodes?: string[];
  }) => void;
  zone?: {
    id: number;
    zone_name: string;
    pincodes?: Array<{
      id: number;
      pincode: string;
      city?: string | null;
      district?: string;
      state?: string;
      country_code?: string;
    }>;
  };
  isEdit?: boolean;
}

const ShippingZoneForm: FC<ShippingZoneFormProps> = ({
  onClose,
  onSave,
  zone,
  isEdit = false,
}) => {
  const { t } = useTranslation();
  const [zoneName, setZoneName] = useState(zone?.zone_name || "");
  // If editing an existing zone, set the default country from the first pincode
  const defaultCountry =
    zone?.pincodes && zone.pincodes.length > 0
      ? zone.pincodes[0].country_code || null
      : null;
  const [selectedCountry, setSelectedCountry] = useState<string | null>(
    defaultCountry
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedStates, setSelectedStates] = useState<Record<string, boolean>>(
    {}
  );
  const [selectedDistricts, setSelectedDistricts] = useState<
    Record<string, boolean>
  >({});
  const [selectedPincodes, setSelectedPincodes] = useState<
    Record<string, boolean>
  >({});

  // Search states for each tab
  const [statesSearch, setStatesSearch] = useState("");
  const [districtsSearch, setDistrictsSearch] = useState("");
  const [pincodesSearch, setPincodesSearch] = useState("");

  // Base hook call to get all countries
  const { data: uniqueValues, isLoading: isLoadingCountries } =
    usePincodeUniqueValues();
  const countries = useMemo(
    () => extractCountriesFromHierarchy(uniqueValues),
    [uniqueValues]
  );

  // Use the usePincodes hook to fetch pincodes when country is selected
  // Include zone_id when in edit mode to properly mark assigned pincodes
  const { data: pincodes, isLoading: isLoadingPincodes } = usePincodes(
    selectedCountry
      ? {
          country_code: selectedCountry,
          ...(isEdit && zone?.id ? { zone_id: zone.id } : {}),
        }
      : undefined
  );

  // When country changes and pincodes are loaded, select appropriate pincodes
  useEffect(() => {
    if (pincodes && pincodes.length > 0) {
      // In edit mode, only select pincodes with 'auto-selected' status
      // In create mode, select all by default
      const selectAll = !isEdit;

      // Prepare selected states
      const newSelectedStates: Record<string, boolean> = {};
      const uniqueStates = Array.from(new Set(pincodes.map((p) => p.state)));

      // Prepare selected districts
      const newSelectedDistricts: Record<string, boolean> = {};
      const uniqueDistricts = Array.from(
        new Set(pincodes.map((p) => p.district))
      );

      // Prepare selected pincodes
      const newSelectedPincodes: Record<string, boolean> = {};

      if (selectAll) {
        // For new zones: Select all states, districts, and pincodes
        uniqueStates.forEach((state) => {
          if (state) newSelectedStates[state] = true;
        });

        uniqueDistricts.forEach((district) => {
          if (district) newSelectedDistricts[district] = true;
        });

        const uniquePincodes = Array.from(
          new Set(pincodes.map((p) => p.pincode))
        );
        uniquePincodes.forEach((pincode) => {
          if (pincode) newSelectedPincodes[pincode] = true;
        });
      } else {
        // For editing: Only select auto-selected pincodes
        // First, collect all auto-selected pincodes
        const autoSelectedPincodes = pincodes.filter(
          (p) => p.is_assigned === "auto-selected"
        );

        // Select their states
        const autoSelectedStates = new Set(
          autoSelectedPincodes.map((p) => p.state).filter(Boolean)
        );
        autoSelectedStates.forEach((state) => {
          if (state) newSelectedStates[state] = true;
        });

        // Select their districts
        const autoSelectedDistricts = new Set(
          autoSelectedPincodes.map((p) => p.district).filter(Boolean)
        );
        autoSelectedDistricts.forEach((district) => {
          if (district) newSelectedDistricts[district] = true;
        });

        // Select only the auto-selected pincodes
        autoSelectedPincodes.forEach((p) => {
          if (p.pincode) newSelectedPincodes[p.pincode] = true;
        });
      }

      setSelectedStates(newSelectedStates);
      setSelectedDistricts(newSelectedDistricts);
      setSelectedPincodes(newSelectedPincodes);
    }
  }, [pincodes, isEdit]);

  /**
   * Track disabled pincodes based on is_assigned status
   * If is_assigned is 'disable', the pincode cannot be selected
   */
  useEffect(() => {
    if (pincodes && pincodes.length > 0) {
      const newDisabledPincodes: Record<string, boolean> = {};
      pincodes.forEach((pincode) => {
        // Mark pincodes as disabled if they have 'disable' status
        if (pincode.pincode && pincode.is_assigned === "disable") {
          newDisabledPincodes[pincode.pincode] = true;
        }
      });
      setDisabledPincodes(newDisabledPincodes);
    }
  }, [pincodes]);

  // Track disabled pincodes
  const [disabledPincodes, setDisabledPincodes] = useState<
    Record<string, boolean>
  >({});

  // Track disabled districts (districts where all pincodes are disabled)
  const [disabledDistricts, setDisabledDistricts] = useState<
    Record<string, boolean>
  >({});

  // Track disabled states (states where all districts are disabled)
  const [disabledStates, setDisabledStates] = useState<Record<string, boolean>>(
    {}
  );

  // Extract unique states, districts, and pincodes
  const uniqueData = useMemo(() => {
    if (!pincodes)
      return {
        states: [],
        districts: [],
        pincodes: [],
        stateDistrictsMap: {},
        districtPincodesMap: {},
      };

    const states = Array.from(new Set(pincodes.map((p) => p.state)));
    const districts = Array.from(new Set(pincodes.map((p) => p.district)));
    const pincodesArray = Array.from(new Set(pincodes.map((p) => p.pincode)));

    // Create mapping of states to districts
    const stateDistrictsMap: Record<string, string[]> = {};
    // Create mapping of districts to pincodes
    const districtPincodesMap: Record<string, string[]> = {};
    // Track disabled pincodes
    const newDisabledPincodes: Record<string, boolean> = {};

    pincodes.forEach((p) => {
      // Map states to districts
      if (p.state && p.district) {
        if (!stateDistrictsMap[p.state]) {
          stateDistrictsMap[p.state] = [];
        }
        if (!stateDistrictsMap[p.state].includes(p.district)) {
          stateDistrictsMap[p.state].push(p.district);
        }
      }

      // Map districts to pincodes
      if (p.district && p.pincode) {
        if (!districtPincodesMap[p.district]) {
          districtPincodesMap[p.district] = [];
        }
        if (!districtPincodesMap[p.district].includes(p.pincode)) {
          districtPincodesMap[p.district].push(p.pincode);
        }
      }

      // Track disabled pincodes based on is_assigned status
      if (p.pincode && p.is_assigned === "disable") {
        newDisabledPincodes[p.pincode] = true;
      }
    });

    // Calculate which districts should be disabled (where all pincodes are disabled)
    const newDisabledDistricts: Record<string, boolean> = {};
    Object.entries(districtPincodesMap).forEach(
      ([district, districtPincodes]) => {
        const allDisabled = districtPincodes.every(
          (pincode) => newDisabledPincodes[pincode]
        );
        if (allDisabled && districtPincodes.length > 0) {
          newDisabledDistricts[district] = true;
        }
      }
    );

    // Calculate which states should be disabled (where all districts are disabled)
    const newDisabledStates: Record<string, boolean> = {};
    Object.entries(stateDistrictsMap).forEach(([state, stateDistricts]) => {
      const allDisabled = stateDistricts.every(
        (district) => newDisabledDistricts[district]
      );
      if (allDisabled && stateDistricts.length > 0) {
        newDisabledStates[state] = true;
      }
    });

    // Update the state with the calculated disabled items
    setDisabledPincodes(newDisabledPincodes);
    setDisabledDistricts(newDisabledDistricts);
    setDisabledStates(newDisabledStates);

    return {
      states: states.filter(Boolean),
      districts: districts.filter(Boolean),
      pincodes: pincodesArray.filter(Boolean),
      stateDistrictsMap,
      districtPincodesMap,
    };
  }, [pincodes]);

  // Helper functions for select all/deselect all functionality
  const handleSelectAllStates = useCallback(() => {
    const newSelectedStates: Record<string, boolean> = {};
    uniqueData.states.forEach((state) => {
      newSelectedStates[state] = true;
    });
    setSelectedStates(newSelectedStates);
  }, [uniqueData.states]);

  const handleDeselectAllStates = useCallback(() => {
    // Deselect all states
    setSelectedStates({});
    // Cascading: Deselect all districts
    setSelectedDistricts({});
    // Cascading: Deselect all pincodes
    setSelectedPincodes({});
  }, []);

  const handleSelectAllDistricts = useCallback(() => {
    // Select all districts
    const newSelectedDistricts: Record<string, boolean> = {};
    uniqueData.districts.forEach((district) => {
      newSelectedDistricts[district] = true;
    });
    setSelectedDistricts(newSelectedDistricts);

    // Select all states
    const newSelectedStates: Record<string, boolean> = {};
    uniqueData.states.forEach((state) => {
      newSelectedStates[state] = true;
    });
    setSelectedStates(newSelectedStates);

    // Select all pincodes
    const newSelectedPincodes: Record<string, boolean> = {};
    uniqueData.pincodes.forEach((pincode) => {
      newSelectedPincodes[pincode] = true;
    });
    setSelectedPincodes(newSelectedPincodes);
  }, [uniqueData.districts, uniqueData.states, uniqueData.pincodes]);

  const handleDeselectAllDistricts = useCallback(() => {
    // Deselect all districts
    setSelectedDistricts({});
    // Cascading: Deselect all pincodes
    setSelectedPincodes({});
    // Cascading: Deselect all states (since no districts are selected)
    setSelectedStates({});
  }, []);

  const handleSelectAllPincodes = useCallback(() => {
    // Select all pincodes
    const newSelectedPincodes: Record<string, boolean> = {};
    uniqueData.pincodes.forEach((pincode) => {
      newSelectedPincodes[pincode] = true;
    });
    setSelectedPincodes(newSelectedPincodes);

    // Select all districts
    const newSelectedDistricts: Record<string, boolean> = {};
    uniqueData.districts.forEach((district) => {
      newSelectedDistricts[district] = true;
    });
    setSelectedDistricts(newSelectedDistricts);

    // Select all states
    const newSelectedStates: Record<string, boolean> = {};
    uniqueData.states.forEach((state) => {
      newSelectedStates[state] = true;
    });
    setSelectedStates(newSelectedStates);
  }, [uniqueData.pincodes, uniqueData.districts, uniqueData.states]);

  const handleDeselectAllPincodes = useCallback(() => {
    // Deselect all pincodes
    setSelectedPincodes({});
    // Cascading: Deselect all districts (since no pincodes are selected)
    setSelectedDistricts({});
    // Cascading: Deselect all states (since no districts are selected)
    setSelectedStates({});
  }, []);

  // Filter data based on search terms
  const filteredStates = useMemo(() => {
    if (!statesSearch.trim()) return uniqueData.states;
    return uniqueData.states.filter((state) =>
      state.toLowerCase().includes(statesSearch.toLowerCase())
    );
  }, [uniqueData.states, statesSearch]);

  const filteredDistricts = useMemo(() => {
    if (!districtsSearch.trim()) return uniqueData.districts;

    // Find states that match the search query
    const matchingStates = uniqueData.states.filter((state) =>
      state.toLowerCase().includes(districtsSearch.toLowerCase())
    );

    // Get all districts that belong to matching states
    const districtsFromMatchingStates = matchingStates.flatMap(
      (state) => uniqueData.stateDistrictsMap[state] || []
    );

    // Also include districts that directly match the search query
    const directMatchDistricts = uniqueData.districts.filter((district) =>
      district.toLowerCase().includes(districtsSearch.toLowerCase())
    );

    // Combine both lists and remove duplicates
    return Array.from(
      new Set([...directMatchDistricts, ...districtsFromMatchingStates])
    );
  }, [
    uniqueData.districts,
    uniqueData.states,
    uniqueData.stateDistrictsMap,
    districtsSearch,
  ]);

  const filteredPincodes = useMemo(() => {
    if (!pincodesSearch.trim()) return uniqueData.pincodes;

    // Find districts that match the search query
    const matchingDistricts = uniqueData.districts.filter((district) =>
      district.toLowerCase().includes(pincodesSearch.toLowerCase())
    );

    // Get all pincodes that belong to matching districts
    const pincodesFromMatchingDistricts = matchingDistricts.flatMap(
      (district) => uniqueData.districtPincodesMap[district] || []
    );

    // Also include pincodes that directly match the search query
    const directMatchPincodes = uniqueData.pincodes.filter((pincode) =>
      pincode.toLowerCase().includes(pincodesSearch.toLowerCase())
    );

    // Combine both lists and remove duplicates
    return Array.from(
      new Set([...directMatchPincodes, ...pincodesFromMatchingDistricts])
    );
  }, [
    uniqueData.pincodes,
    uniqueData.districts,
    uniqueData.districtPincodesMap,
    pincodesSearch,
  ]);

  // Filter maps for districts and pincodes
  const filteredStateDistrictsMap = useMemo(() => {
    if (!districtsSearch.trim()) return uniqueData.stateDistrictsMap;

    const searchTerm = districtsSearch.toLowerCase();
    const newMap: Record<string, string[]> = {};

    // Process all state entries
    Object.entries(uniqueData.stateDistrictsMap).forEach(
      ([state, districts]) => {
        // If state matches search term, include all its districts
        if (state.toLowerCase().includes(searchTerm)) {
          newMap[state] = [...districts]; // Include all districts of this state
        } else {
          // Otherwise, filter districts by name
          const filteredDistricts = districts.filter((district) =>
            district.toLowerCase().includes(searchTerm)
          );
          if (filteredDistricts.length > 0) {
            newMap[state] = filteredDistricts;
          }
        }
      }
    );

    return newMap;
  }, [uniqueData.stateDistrictsMap, districtsSearch]);

  const filteredDistrictPincodesMap = useMemo(() => {
    if (!pincodesSearch.trim()) return uniqueData.districtPincodesMap;

    const searchTerm = pincodesSearch.toLowerCase();
    const newMap: Record<string, string[]> = {};

    // Process all district entries
    Object.entries(uniqueData.districtPincodesMap).forEach(
      ([district, pincodes]) => {
        // If district matches search term, include all its pincodes
        if (district.toLowerCase().includes(searchTerm)) {
          newMap[district] = [...pincodes]; // Include all pincodes of this district
        } else {
          // Otherwise, filter pincodes by value
          const filteredPincodes = pincodes.filter((pincode) =>
            pincode.toLowerCase().includes(searchTerm)
          );
          if (filteredPincodes.length > 0) {
            newMap[district] = filteredPincodes;
          }
        }
      }
    );

    return newMap;
  }, [uniqueData.districtPincodesMap, pincodesSearch]);

  // Get pincodes data at component level, not inside a function
  const { data: pincodesData } = usePincodes({
    country_code: selectedCountry || "",
    is_active: true,
  });

  // Get the mutation function for creating shipping zones
  const { mutate: createShippingZone, isPending: isCreating } =
    useCreateShippingZone();
  const { mutate: updateShippingZone, isPending: isUpdating } =
    useUpdateShippingZone();
  const isPending = isCreating || isUpdating;

  // Common payload creation logic
  const createZonePayload = (type: "include" | "exclude") => {
    const selectedPincodeData = uniqueData.pincodes
      .filter(
        (pincode) => selectedPincodes[pincode] && !disabledPincodes[pincode]
      )
      .map((pincode) => {
        const pincodeData = pincodesData?.find((p) => p.pincode === pincode);
        return pincodeData
          ? {
              id: pincodeData.id,
              pincode: pincodeData.pincode,
              city: pincodeData.city,
              district: pincodeData.district,
              state: pincodeData.state,
              country_code: pincodeData.country_code,
            }
          : null;
      })
      .filter(Boolean as any); // Remove any null entries

    const payload = {
      zone_name: zoneName.trim(),
      pincodes: selectedPincodeData,
    };

    // Get total pincode count
    const totalPincodes = uniqueData.pincodes.length;

    // Different logging based on type
    if (type === "include") {
      console.log("Selected pincodes count:", selectedPincodeData.length);
      console.log("Total pincodes:", totalPincodes);
    } else {
      // For exclude, show non-selected count
      const nonSelectedCount = totalPincodes - selectedPincodeData.length;
      console.log("Non-selected pincodes count:", nonSelectedCount);
      console.log("Total pincodes:", totalPincodes);
    }

    console.log("Payload:", JSON.stringify(payload, null, 2));

    return payload;
  };
  return (
    <Card
      sx={{
        width: "100%",
        mb: 3,
        border: (theme) => `1px solid ${theme.palette.primary.main}`,
        boxShadow: (theme) => theme.shadows[3],
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          p: 2,
        }}
      >
        <Typography variant="h6">
          {isEdit
            ? t("shippingZones.edittitle", { name: zoneName })
            : t("shippingZones.addNew")}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "primary.contrastText" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label={t("shippingZones.zoneName")}
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              required
              disabled={isSubmitting}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              fullWidth
              options={countries}
              value={selectedCountry}
              onChange={(_, newValue) => {
                setSelectedCountry(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("shippingZones.country")}
                  required
                  size="small"
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
              disabled={isSubmitting || isLoadingCountries || isLoadingPincodes}
              loading={isLoadingCountries}
            />
          </Grid>
        </Grid>

        {selectedCountry && pincodes && pincodes.length > 0 && (
          <Box sx={{ width: "100%", mt: 3 }}>
            <Tabs
              value={tabIndex}
              onChange={(_, newValue) => setTabIndex(newValue)}
              aria-label="pincode data tabs"
              variant="fullWidth"
              sx={{
                mb: 2,
                "& .MuiTab-root": {
                  fontWeight: (theme) => theme.typography.fontWeightMedium,
                },
                "& .Mui-selected": {
                  fontWeight: (theme) => theme.typography.fontWeightBold,
                },
              }}
            >
              <Tab label={t("shippingZones.states")} />
              <Tab label={t("shippingZones.districts")} />
              <Tab label={t("shippingZones.pincodes")} />
            </Tabs>

            {/* States Tab */}
            {tabIndex === 0 && (
              <>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    justifyContent: "space-between",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder={t("common.search")}
                    value={statesSearch}
                    onChange={(e) => setStatesSearch(e.target.value)}
                    sx={{
                      width: "200px",
                      "& .MuiInputBase-root": {
                        height: "36px",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <Box
                          component="span"
                          sx={{ color: "text.secondary", mr: 0.5 }}
                        >
                          <SearchIcon fontSize="small" />
                        </Box>
                      ),
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      justifyContent: "flex-start",
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleSelectAllStates}
                      sx={{
                        px: 2,
                        minWidth: "110px",
                        fontWeight: (theme) =>
                          theme.typography.fontWeightMedium,
                      }}
                    >
                      {t("common.selectAll")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={handleDeselectAllStates}
                      sx={{
                        px: 2,
                        minWidth: "110px",
                        fontWeight: (theme) =>
                          theme.typography.fontWeightMedium,
                      }}
                    >
                      {t("common.deselectAll")}
                    </Button>
                  </Box>
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    // overflow: "auto",
                    p: 0,
                    maxHeight: "600px",
                  }}
                >
                  <StatesVirtualList
                    states={filteredStates}
                    selectedStates={selectedStates}
                    disabledStates={disabledStates}
                    setSelectedStates={(newValue) => {
                      // Handle both function and direct value updates
                      if (typeof newValue === "function") {
                        const updater = newValue;
                        const prevState = selectedStates;
                        const nextState = updater(prevState);

                        // Find which state changed by comparing the objects
                        Object.entries(nextState).forEach(
                          ([state, isSelected]) => {
                            if (prevState[state] !== isSelected) {
                              // If state is deselected, cascade the deselection
                              if (
                                !isSelected &&
                                uniqueData.stateDistrictsMap[state]
                              ) {
                                const districtsInState =
                                  uniqueData.stateDistrictsMap[state] || [];
                                const newSelectedDistricts = {
                                  ...selectedDistricts,
                                };
                                const newSelectedPincodes = {
                                  ...selectedPincodes,
                                };

                                // Deselect all districts in this state
                                districtsInState.forEach((district) => {
                                  newSelectedDistricts[district] = false;

                                  // Deselect all pincodes in this district
                                  const pincodesInDistrict =
                                    uniqueData.districtPincodesMap[district] ||
                                    [];
                                  pincodesInDistrict.forEach((pincode) => {
                                    newSelectedPincodes[pincode] = false;
                                  });
                                });

                                setSelectedDistricts(newSelectedDistricts);
                                setSelectedPincodes(newSelectedPincodes);
                              }
                              // If state is selected, cascade the selection
                              else if (
                                isSelected &&
                                uniqueData.stateDistrictsMap[state]
                              ) {
                                const districtsInState =
                                  uniqueData.stateDistrictsMap[state] || [];
                                const newSelectedDistricts = {
                                  ...selectedDistricts,
                                };
                                const newSelectedPincodes = {
                                  ...selectedPincodes,
                                };

                                // Select all districts in this state
                                districtsInState.forEach((district) => {
                                  newSelectedDistricts[district] = true;

                                  // Select all pincodes in this district
                                  const pincodesInDistrict =
                                    uniqueData.districtPincodesMap[district] ||
                                    [];
                                  pincodesInDistrict.forEach((pincode) => {
                                    newSelectedPincodes[pincode] = true;
                                  });
                                });

                                setSelectedDistricts(newSelectedDistricts);
                                setSelectedPincodes(newSelectedPincodes);
                              }
                            }
                          }
                        );
                      }

                      // Update state selection
                      setSelectedStates(newValue);
                    }}
                  />
                </Paper>
              </>
            )}

            {/* Districts Tab */}
            {tabIndex === 1 && (
              <>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    justifyContent: "space-between",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder={t("common.search")}
                    value={districtsSearch}
                    onChange={(e) => setDistrictsSearch(e.target.value)}
                    sx={{
                      width: "200px",
                      "& .MuiInputBase-root": {
                        height: "36px",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <Box
                          component="span"
                          sx={{ color: "text.secondary", mr: 0.5 }}
                        >
                          <SearchIcon fontSize="small" />
                        </Box>
                      ),
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      justifyContent: "flex-start",
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleSelectAllDistricts}
                      sx={{
                        px: 2,
                        minWidth: "110px",
                        fontWeight: (theme) =>
                          theme.typography.fontWeightMedium,
                      }}
                    >
                      {t("common.selectAll")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={handleDeselectAllDistricts}
                      sx={{
                        px: 2,
                        minWidth: "110px",
                        fontWeight: (theme) =>
                          theme.typography.fontWeightMedium,
                      }}
                    >
                      {t("common.deselectAll")}
                    </Button>
                  </Box>
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    // overflow: "auto",
                    p: 0,
                    maxHeight: "600px",
                  }}
                >
                  <DistrictsVirtualList
                    districts={filteredDistricts}
                    stateDistrictsMap={filteredStateDistrictsMap}
                    selectedDistricts={selectedDistricts}
                    disabledDistricts={disabledDistricts}
                    setSelectedDistricts={(newValue) => {
                      // Handle both function and direct value updates
                      if (typeof newValue === "function") {
                        const updater = newValue;
                        const prevState = selectedDistricts;
                        const nextState = updater(prevState);

                        // Find which district changed by comparing the objects
                        Object.entries(nextState).forEach(
                          ([district, isSelected]) => {
                            if (prevState[district] !== isSelected) {
                              // If district is deselected, cascade the deselection to pincodes
                              if (
                                !isSelected &&
                                uniqueData.districtPincodesMap[district]
                              ) {
                                const pincodesInDistrict =
                                  uniqueData.districtPincodesMap[district] ||
                                  [];
                                const newSelectedPincodes = {
                                  ...selectedPincodes,
                                };

                                // Deselect all pincodes in this district
                                pincodesInDistrict.forEach((pincode) => {
                                  newSelectedPincodes[pincode] = false;
                                });

                                setSelectedPincodes(newSelectedPincodes);
                              }
                              // If district is selected, cascade the selection to pincodes
                              else if (
                                isSelected &&
                                uniqueData.districtPincodesMap[district]
                              ) {
                                const pincodesInDistrict =
                                  uniqueData.districtPincodesMap[district] ||
                                  [];
                                const newSelectedPincodes = {
                                  ...selectedPincodes,
                                };

                                // Select all pincodes in this district
                                pincodesInDistrict.forEach((pincode) => {
                                  newSelectedPincodes[pincode] = true;
                                });

                                setSelectedPincodes(newSelectedPincodes);
                              }

                              // Find which state this district belongs to
                              Object.entries(
                                uniqueData.stateDistrictsMap
                              ).forEach(([state, districts]) => {
                                if (districts.includes(district)) {
                                  // If selecting a district, make sure its state is selected
                                  if (isSelected && !selectedStates[state]) {
                                    setSelectedStates((prev) => ({
                                      ...prev,
                                      [state]: true,
                                    }));
                                  }
                                  // If deselecting, check if all districts in state are deselected
                                  else if (!isSelected) {
                                    const allDistrictsDeselected =
                                      districts.every((d) =>
                                        d === district ? false : !nextState[d]
                                      );

                                    if (allDistrictsDeselected) {
                                      setSelectedStates((prev) => ({
                                        ...prev,
                                        [state]: false,
                                      }));
                                    }
                                  }
                                }
                              });
                            }
                          }
                        );
                      }

                      // Update district selection
                      setSelectedDistricts(newValue);
                    }}
                  />
                </Paper>
              </>
            )}

            {/* Pincodes Tab */}
            {tabIndex === 2 && (
              <>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    justifyContent: "space-between",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder={t("common.search")}
                    value={pincodesSearch}
                    onChange={(e) => setPincodesSearch(e.target.value)}
                    sx={{
                      width: "200px",
                      "& .MuiInputBase-root": {
                        height: "36px",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <Box
                          component="span"
                          sx={{ color: "text.secondary", mr: 0.5 }}
                        >
                          <SearchIcon fontSize="small" />
                        </Box>
                      ),
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      justifyContent: "flex-start",
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleSelectAllPincodes}
                      sx={{
                        px: 2,
                        minWidth: "110px",
                        fontWeight: (theme) =>
                          theme.typography.fontWeightMedium,
                      }}
                    >
                      {t("common.selectAll")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={handleDeselectAllPincodes}
                      sx={{
                        px: 2,
                        minWidth: "110px",
                        fontWeight: (theme) =>
                          theme.typography.fontWeightMedium,
                      }}
                    >
                      {t("common.deselectAll")}
                    </Button>
                  </Box>
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    // overflow: "auto",
                    p: 0,
                    maxHeight: "600px",
                  }}
                >
                  <PincodesVirtualList
                    pincodes={filteredPincodes}
                    districtPincodesMap={filteredDistrictPincodesMap}
                    selectedPincodes={selectedPincodes}
                    disabledPincodes={disabledPincodes}
                    setSelectedPincodes={(newValue) => {
                      // Handle both function and direct value updates
                      if (typeof newValue === "function") {
                        const updater = newValue;
                        const prevState = selectedPincodes;
                        const nextState = updater(prevState);

                        // Find which pincode changed by comparing the objects
                        Object.entries(nextState).forEach(
                          ([pincode, isSelected]) => {
                            if (prevState[pincode] !== isSelected) {
                              // If pincode is deselected
                              if (!isSelected) {
                                // Find which district this pincode belongs to
                                Object.entries(
                                  uniqueData.districtPincodesMap
                                ).forEach(([district, pincodes]) => {
                                  if (pincodes.includes(pincode)) {
                                    // Check if all pincodes in this district are now deselected
                                    const allPincodesDeselected =
                                      pincodes.every((p) =>
                                        p === pincode ? false : !nextState[p]
                                      );

                                    // If all pincodes are deselected, deselect the district
                                    if (
                                      allPincodesDeselected &&
                                      selectedDistricts[district]
                                    ) {
                                      const newSelectedDistricts = {
                                        ...selectedDistricts,
                                        [district]: false,
                                      };
                                      setSelectedDistricts(
                                        newSelectedDistricts
                                      );

                                      // Check if all districts of related state should be deselected
                                      Object.entries(
                                        uniqueData.stateDistrictsMap
                                      ).forEach(([state, districts]) => {
                                        if (districts.includes(district)) {
                                          const allDistrictsDeselected =
                                            districts.every((d) =>
                                              d === district
                                                ? false
                                                : !newSelectedDistricts[d]
                                            );

                                          // If all districts of state are deselected, deselect the state
                                          if (
                                            allDistrictsDeselected &&
                                            selectedStates[state]
                                          ) {
                                            setSelectedStates((prev) => ({
                                              ...prev,
                                              [state]: false,
                                            }));
                                          }
                                        }
                                      });
                                    }
                                  }
                                });
                              }
                              // If pincode is selected, ensure its district and state are also selected
                              else {
                                // Find which district this pincode belongs to
                                Object.entries(
                                  uniqueData.districtPincodesMap
                                ).forEach(([district, pincodes]) => {
                                  if (pincodes.includes(pincode)) {
                                    // Select the district if it's not already selected
                                    if (!selectedDistricts[district]) {
                                      setSelectedDistricts((prev) => ({
                                        ...prev,
                                        [district]: true,
                                      }));
                                    }

                                    // Find and select the state this district belongs to
                                    Object.entries(
                                      uniqueData.stateDistrictsMap
                                    ).forEach(([state, districts]) => {
                                      if (
                                        districts.includes(district) &&
                                        !selectedStates[state]
                                      ) {
                                        setSelectedStates((prev) => ({
                                          ...prev,
                                          [state]: true,
                                        }));
                                      }
                                    });
                                  }
                                });
                              }
                            }
                          }
                        );
                      }

                      // Update pincode selection
                      setSelectedPincodes(newValue);
                    }}
                  />
                </Paper>
              </>
            )}
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
        <Button
          variant="contained"
          color="success"
          onClick={() => {
            const payload = createZonePayload("include");
            if (isEdit && zone?.id) {
              updateShippingZone(
                { id: zone.id, ...payload },
                { onSuccess: () => onClose() }
              );
            } else {
              createShippingZone(payload, { onSuccess: () => onClose() });
            }
          }}
          disabled={
            !zoneName.trim() || !selectedCountry || isPending || isSubmitting
          }
          startIcon={
            isPending || isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : undefined
          }
          sx={{ mr: 1 }}
        >
          {t("common.include", "Include")}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            const payload = createZonePayload("exclude");
            if (isEdit && zone?.id) {
              updateShippingZone(
                { id: zone.id, ...payload },
                { onSuccess: () => onClose() }
              );
            } else {
              createShippingZone(payload, { onSuccess: () => onClose() });
            }
          }}
          disabled={
            !zoneName.trim() || !selectedCountry || isPending || isSubmitting
          }
          sx={{ mr: 1 }}
        >
          {t("common.exclude", "Exclude")}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </CardActions>
    </Card>
  );
};

// Virtualized list components now imported from separate files

export default ShippingZoneForm;
