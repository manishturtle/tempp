// Create this file at: src/app/[tenant]/store/checkout/layouts/components/PickupDetailsForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Stack,
  useTheme,
  Grid,
  Tooltip,
  IconButton,
} from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import SearchIcon from '@mui/icons-material/Search';
import {
  useStorePickupLocations,
  useTimeSlots,
  StorePickupLocation,
} from "@/app/hooks/api/store/useShippingMethods";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Types for pickup details
export interface PickupDetails {
  pickupPerson: "myself" | "someone_else";
  name?: string;
  contact?: string;
  storeData?: StorePickupLocation; // Include full store data
}

interface PickupDetailsFormProps {
  onSubmit: (pickupDetails: PickupDetails) => void;
  pickupDetails?: PickupDetails;
  formId?: string;
}

// Helper function to format operating hours for display
const formatOperatingHours = (
  operatingHours: Record<
    string,
    { is_open: boolean; open?: string; close?: string }
  >
): string => {
  const daysOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const daysMap: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  // Process all days, including closed ones
  const allDays = daysOrder.map((day) => {
    const value = operatingHours[day];
    const isOpen = Boolean(value?.is_open && value?.open && value?.close);
    return {
      day,
      label: daysMap[day],
      isOpen,
      time: isOpen ? `${value.open} - ${value.close}` : 'Closed'
    };
  });

  // Group consecutive days with the same status
  const groups: { from: number; to: number; time: string; isOpen: boolean }[] = [];
  let i = 0;
  
  while (i < allDays.length) {
    const current = allDays[i];
    let j = i;
    
    while (
      j + 1 < allDays.length &&
      allDays[j + 1].isOpen === current.isOpen &&
      allDays[j + 1].time === current.time &&
      daysOrder.indexOf(allDays[j + 1].day) === daysOrder.indexOf(allDays[j].day) + 1
    ) {
      j++;
    }
    
    groups.push({
      from: i,
      to: j,
      time: current.time,
      isOpen: current.isOpen
    });
    
    i = j + 1;
  }

  // If all days have the same status
  if (groups.length === 1) {
    const group = groups[0];
    return group.isOpen 
      ? `Mon-Sun: ${group.time}`
      : 'Closed all week';
  }

  // Build the display string
  return groups.map((g) => {
    const fromLabel = allDays[g.from].label;
    const toLabel = allDays[g.to].label;
    const dayRange = g.from === g.to ? fromLabel : `${fromLabel}-${toLabel}`;
    return `${dayRange}: ${g.time}`;
  }).join(', ');
};

// Helper function to format address
const formatAddress = (location: {
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
}) => {
  const addressLine2 = location.address_line2
    ? `${location.address_line2}, `
    : "";
  return `${location.address_line1}, ${addressLine2}${location.city}, ${location.state} - ${location.pincode}`;
};

export const PickupDetailsForm: React.FC<PickupDetailsFormProps> = ({
  onSubmit,
  pickupDetails,
  formId = "pickup-details-form",
}) => {
  // Ensure stores is always defined for search box and filtering logic
  const { data: stores = [] } = useStorePickupLocations();
  const { t } = useTranslation(["checkout", "common", "validation", "store"]);
  const theme = useTheme();

  // Pagination constants
  const STORES_PER_PAGE = 6;

  const [selectedStore, setSelectedStore] = useState<string>(
    pickupDetails?.storeData?.id?.toString() || ""
  );
  const [pickupPerson, setPickupPerson] = useState<"myself" | "someone_else">(
    pickupDetails?.pickupPerson || "myself"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredStores, setFilteredStores] = useState<StorePickupLocation[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Fetch store pickup locations and time slots from API
  const {
    data: storeLocations,
    isLoading: isLoadingStores,
    error: storeError,
  } = useStorePickupLocations();
  const {
    data: timeSlots,
    isLoading: isLoadingTimeSlots,
    error: timeSlotError,
  } = useTimeSlots();

  // Set initial filtered stores and handle default selection
  useEffect(() => {
    if (storeLocations) {
      setFilteredStores(storeLocations);

      // If we have stores but no selected store yet, or the selected store doesn't exist in the fetched locations
      if (
        storeLocations.length > 0 &&
        (!selectedStore ||
          !storeLocations.some((s) => String(s.id) === selectedStore))
      ) {
        // If there's a store ID in pickupDetails, try to use that
        if (pickupDetails?.storeData?.id) {
          const matchingStore = storeLocations.find(
            (store) => String(store.id) === String(pickupDetails.storeData?.id)
          );
          if (matchingStore) {
            setSelectedStore(String(matchingStore.id));
          } else {
            // Fall back to the first store if the saved one isn't found
            setSelectedStore(String(storeLocations[0].id));
          }
        } else {
          // No store in pickupDetails, use the first one
          setSelectedStore(String(storeLocations[0].id));
        }
      }
    }
  }, [storeLocations, pickupDetails]);

  // Filter stores based on search query
  useEffect(() => {
    if (!storeLocations) return;
    if (!searchQuery) {
      setFilteredStores(storeLocations);
      return;
    }

    const filtered = storeLocations.filter((store) => {
      const address = formatAddress(store).toLowerCase();
      return (
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        address.includes(searchQuery.toLowerCase()) ||
        store.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.pincode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredStores(filtered);
    setCurrentPage(0); // Reset to first page when searching
  }, [searchQuery, storeLocations]);

  const handleStoreSelect = (storeId: string) => {
    setSelectedStore(storeId);
  };

  const [name, setName] = useState<string>(pickupDetails?.name || "");
  const [contact, setContact] = useState<string>(pickupDetails?.contact || "");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const errors: Record<string, string> = {};

    if (!selectedStore) {
      errors.store = t("validation:required", "Please select a store");
    }

    if (pickupPerson === "someone_else") {
      if (!name) {
        errors.name = t("validation:required", "Name is required");
      }

      if (!contact) {
        errors.contact = t("validation:required", "Contact is required");
      } else if (contact.length < 10) {
        errors.contact = t(
          "validation:invalidPhone",
          "Please enter a valid phone number"
        );
      }
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Find the complete store data for the selected store
    const selectedStoreData = stores.find(store => String(store.id) === selectedStore);

    onSubmit({
      pickupPerson,
      storeData: selectedStoreData, // Include full store data
      ...(pickupPerson === "someone_else" && {
        name,
        contact,
      }),
    });
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: 2,
          mb: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          PICKUP STORE LOCATIONS
        </Typography>
        {(() => {
          // Ensure stores is defined using useStorePickupLocations
          // If already defined above, this will not shadow
          // Otherwise, define here for the search input condition
          // (If you already have this line at the top, you can remove this IIFE)
          // const { data: stores = [] } = useStorePickupLocations(...);
          return stores && stores.length >= 7 ? (
            <Box
            sx={{
              width: "25%",
              position: "relative",
              display: "flex",
              alignItems: "center"
            }}
          >
            <SearchIcon 
              sx={{ 
                position: "absolute", 
                left: "10px", 
                color: "text.secondary",
                fontSize: "20px"
              }} 
            />
            <Box
              component="input"
              type="text"
              placeholder="Search...."
              value={searchQuery}
              onChange={(e: any) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              sx={{
                width: "100%",
                padding: "8px 12px 8px 40px", // Added left padding for the icon
                borderRadius: "4px",
                borderColor: theme.palette.primary.main,
                border: `1px solid`,
                fontSize: "14px",
                transition: theme.transitions.create([
                  "border-color",
                  "box-shadow",
                ]),
                "&:focus": {
                  outline: "none",
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
                },
              }}
            />
          </Box>
          ) : null;
        })()}
      </Box>
      <Box component="form" id={formId} onSubmit={handleSubmit}>
        {/* Store Selection with Grid Layout */}
        {(() => {
          // Calculate pagination
          const totalPages = Math.ceil(filteredStores.length / STORES_PER_PAGE);
          const startIndex = currentPage * STORES_PER_PAGE;
          const endIndex = startIndex + STORES_PER_PAGE;
          const paginatedStores = filteredStores.slice(startIndex, endIndex);

          return (
            <>
              {paginatedStores.length === 0 ? (
                <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    {searchQuery
                      ? t(
                          "store:noStoresMatchSearch",
                          "No stores match your search"
                        )
                      : t("store:noStoresFound", "No stores found")}
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {paginatedStores.map((store) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={store.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          backgroundColor:
                            selectedStore === String(store.id)
                              ? "action.hover"
                              : "background.paper",
                          border: `1px solid ${theme.palette.primary.main}`,
                          borderRadius: 1,
                          cursor: "pointer",
                          height: "100%",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                        onClick={() => handleStoreSelect(String(store.id))}
                      >
                        <Box sx={{ p: 1 }}>
                          <Box display="flex" flexDirection="column">
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.95rem",
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {store.name}
                              </Typography>
                              <Tooltip
                                title={formatOperatingHours(store.operating_hours)}
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      backgroundColor: 'primary.main',
                                      color: 'primary.contrastText',
                                      '& .MuiTooltip-arrow': {
                                        color: 'primary.main',
                                      },
                                    },
                                  },
                                }}
                              >
                                <IconButton
                                  aria-label={t(
                                    "store:pickup.info_button_aria_label"
                                  )}
                                  size="small"
                                  sx={{ ml: 1 }}
                                >
                                  <InfoOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Typography
                              color="text.secondary"
                              sx={{
                                fontSize: "0.8rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                lineHeight: "1.2em",
                                maxHeight: "2.4em",
                              }}
                            >
                              {formatAddress(store)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Pagination Controls */}
              <Grid container sx={{ mt: 2 }}>
                <Grid
                  size={{ xs: 12 }}
                  sx={{ display: "flex", justifyContent: "flex-end" }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="text"
                      color="primary"
                      startIcon={<NavigateBeforeIcon />}
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(0, prev - 1))
                      }
                      disabled={
                        currentPage === 0 || filteredStores.length === 0
                      }
                      size="small"
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {filteredStores.length > 0
                        ? `Page ${currentPage + 1} of ${Math.ceil(
                            filteredStores.length / STORES_PER_PAGE
                          )}`
                        : "No results"}
                    </Typography>
                    <Button
                      variant="text"
                      color="primary"
                      endIcon={<NavigateNextIcon />}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={
                        currentPage >=
                          Math.ceil(filteredStores.length / STORES_PER_PAGE) -
                            1 || filteredStores.length === 0
                      }
                      size="small"
                    >
                      Next
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </>
          );
        })()}
        {/* Pickup Person Section */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("checkout:pickupPerson", "Pickup Person")}
          </Typography>
          <RadioGroup
            value={pickupPerson}
            onChange={(e) =>
              setPickupPerson(e.target.value as "myself" | "someone_else")
            }
            sx={{ flexDirection: "row", mb: 1 }}
          >
            <FormControlLabel
              value="myself"
              control={<Radio />}
              label={t("checkout:myself", "Myself")}
            />
            <FormControlLabel
              value="someone_else"
              control={<Radio />}
              label={t("checkout:someoneElse", "Someone else")}
            />
          </RadioGroup>

          {pickupPerson === "someone_else" && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t("checkout:Name", "Name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={!!formErrors.name}
                  size="small"
                  helperText={formErrors.name}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    "& .react-tel-input": {
                      width: "100%",
                      "& .form-control": {
                        width: "100%",
                        height: "38px",
                        fontSize: "0.875rem",
                        borderRadius: "4px",
                        borderColor: formErrors.contact
                          ? theme.palette.error.main
                          : "rgba(0, 0, 0, 0.23)",
                        paddingTop: "8px",
                        paddingBottom: "8px",
                        "&:hover": {
                          borderColor: "rgba(0, 0, 0, 0.87)",
                        },
                        "&:focus": {
                          borderColor: formErrors.contact
                            ? theme.palette.error.main
                            : theme.palette.primary.main,
                          boxShadow: `0 0 0 1px ${
                            formErrors.contact
                              ? theme.palette.error.main
                              : theme.palette.primary.main
                          }`,
                        },
                      },
                      "& .flag-dropdown": {
                        borderColor: formErrors.contact
                          ? theme.palette.error.main
                          : "rgba(0, 0, 0, 0.23)",
                        "&:hover, &:focus-within": {
                          borderColor: "rgba(0, 0, 0, 0.87)",
                          backgroundColor: "transparent",
                        },
                      },
                      "& .selected-flag": {
                        padding: "0 8px 0 12px",
                      },
                      "& .country-list": {
                        fontSize: "0.75rem",
                      },
                      "& .special-label": {
                        position: "absolute",
                        zIndex: 1,
                        top: "-9px",
                        left: "11px",
                        display: "block",
                        color: "rgba(0,0,0,0.7)",
                        padding: "0 5px",
                        fontSize: "0.7rem",
                        whiteSpace: "nowrap",
                      },
                    },
                  }}
                >
                  <PhoneInput
                    country={"in"} // Default to India
                    value={contact}
                    onChange={(phone) => setContact(phone)}
                    placeholder={t("checkout:Contact", "Contact")}
                    inputProps={{
                      required: true,
                      name: "contact",
                      style: {
                        width: "100%",
                        height: "38px",
                        fontSize: "0.875rem",
                      },
                    }}
                    inputStyle={{
                      paddingLeft: "46px",
                      width: "100%",
                      height: "40px",
                      fontSize: "0.875rem",
                    }}
                    containerStyle={{
                      width: "100%",
                    }}
                    enableSearch={true}
                    disableSearchIcon={false}
                    countryCodeEditable={false}
                  />
                  {formErrors.contact && (
                    <Typography color="error" variant="caption">
                      {formErrors.contact}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>
    </>
  );
};
