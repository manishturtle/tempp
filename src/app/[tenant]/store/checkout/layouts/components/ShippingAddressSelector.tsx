"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Radio,
  Button,
  CircularProgress,
  IconButton,
  useTheme,
  Chip,
  Grid,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import EditIcon from "@mui/icons-material/Edit";
import { useGetAddresses } from "@/app/hooks/api/store/useAddresses";
import { Address, AddressType } from "@/app/types/store/addressTypes";
import { ShippingAddressForm } from "./EditForm";
import { ShippingAddressFormData } from "@/app/types/store/checkout";

/**
 * Props for the ShippingAddressSelector component
 */
interface ShippingAddressSelectorProps {
  onAddressSelected: (address: Address, isFormSubmission?: boolean) => void;
  selectedAddressId?: string | number;
  isAuthenticated?: boolean;
  showSelectedOnly?: boolean;
  onFormVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * Component for selecting a shipping address during checkout
 */
export const ShippingAddressSelector: React.FC<
  ShippingAddressSelectorProps
> = ({
  onAddressSelected,
  selectedAddressId,
  showSelectedOnly = false,
  onFormVisibilityChange,
}) => {
  const [selectedAddress, setSelectedAddress] = useState<string | number>(
    selectedAddressId || ""
  );
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // Notify parent when form visibility changes
  // Addresses per page
  const ADDRESSES_PER_PAGE = 6;
  const {
    data: allAddresses = [],
    isLoading,
    error,
    refetch: refreshAddresses,
  } = useGetAddresses();

  console.log("All addresses received:", allAddresses);

  // First separate into four categories:
  // 1. Default SHIPPING addresses
  const defaultShippingAddresses = allAddresses.filter(
    (addr) =>
      addr.address_type === "SHIPPING" &&
      (addr.is_default === true || addr.isDefaultShipping === true)
  );

  // 2. Non-default SHIPPING addresses
  const nonDefaultShippingAddresses = allAddresses.filter(
    (addr) =>
      addr.address_type === "SHIPPING" &&
      !addr.is_default &&
      !addr.isDefaultShipping
  );

  // 3. Default addresses of other types
  const defaultOtherAddresses = allAddresses.filter(
    (addr) => addr.address_type !== "SHIPPING" && addr.is_default === true
  );

  // 4. All other addresses
  const remainingAddresses = allAddresses.filter(
    (addr) => addr.address_type !== "SHIPPING" && !addr.is_default
  );

  // Combine all categories in priority order
  const sortedAddresses = [
    ...defaultShippingAddresses,
    ...nonDefaultShippingAddresses,
    ...defaultOtherAddresses,
    ...remainingAddresses,
  ];

  console.log("Sorted all addresses (SHIPPING first):", sortedAddresses);

  // Get default address (always show this if available)
  const defaultAddress = sortedAddresses.find(
    (addr) => addr.is_default === true
  );

  // We'll keep the displayAddresses fixed based on the first two addresses (if enough exist)
  // This way the position of addresses won't change when different ones are selected
  const displayAddresses: Address[] = [];

  // First, always include default address if available
  if (defaultAddress) {
    displayAddresses.push(defaultAddress);
  }

  // Second, add the first non-default address (regardless of selection state)
  // This ensures the addresses in the top section remain stable and don't move around
  if (displayAddresses.length < 2 && sortedAddresses.length > 1) {
    const otherAddress = sortedAddresses.find(
      (addr) => addr.id !== (defaultAddress?.id || "")
    );

    if (otherAddress) {
      displayAddresses.push(otherAddress);
    }
  }

  // Set selected address from prop if provided
  useEffect(() => {
    if (selectedAddressId && selectedAddress !== selectedAddressId) {
      console.log("Setting address from props:", selectedAddressId);
      setSelectedAddress(selectedAddressId);
    }

    // Auto-show form only if API has completed loading and no addresses were found OR there was an API error
    if (
      !isLoading &&
      onFormVisibilityChange &&
      (sortedAddresses.length === 0 || error)
    ) {
      console.log(
        "API completed loading: No addresses found or error occurred, showing form"
      );
      onFormVisibilityChange(true);
      return;
    }

    // Auto-select default address and notify parent component
    if (sortedAddresses.length > 0 && selectedAddress === "") {
      console.log(
        "Looking for default shipping address among",
        sortedAddresses.length,
        "addresses"
      );
      // First try to find an address marked as default
      const defaultAddr = sortedAddresses.find(
        (addr: Address) =>
          addr.is_default === true || addr.isDefaultShipping === true
      );
      if (defaultAddr) {
        console.log("Setting default address:", defaultAddr.id);
        setSelectedAddress(defaultAddr.id);
        // Notify parent about the selected default address
        onAddressSelected(defaultAddr);
      } else if (sortedAddresses[0]) {
        console.log(
          "No default found. Setting first address as default:",
          sortedAddresses[0].id
        );
        setSelectedAddress(sortedAddresses[0].id);
        // Notify parent about the selected first address
        onAddressSelected(sortedAddresses[0]);
      }
    }
  }, [
    sortedAddresses,
    selectedAddressId,
    selectedAddress,
    onAddressSelected,
    isLoading,
    error,
    onFormVisibilityChange,
  ]);
  // Filter addresses based on search term
  const filteredAddresses = sortedAddresses.filter((address: Address) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const searchFields = [
      address.full_name || "",
      address.fullName || "",
      address.address_line1 || "",
      address.addressLine1 || "",
      address.address_line2 || "",
      address.addressLine2 || "",
      address.city || "",
      address.state || "",
      address.country || "",
      address.postal_code || "",
      address.postalCode || "",
    ];

    return searchFields.some((field) =>
      field.toLowerCase().includes(searchLower)
    );
  });

  // Handle address selection change
  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const addressId = event.target.value;
    setSelectedAddress(addressId);

    const selected = sortedAddresses.find(
      (addr: Address) => addr.id === addressId
    );
    if (selected) {
      onAddressSelected(selected);
    }
  };

  // Handle adding new address by notifying the parent component
  const handleAddNewAddress = () => {
    console.log("Add new address button clicked");
    // Signal to the parent component that the address form should be shown
    // This will be handled in Layout1.tsx with the showNewAddressForm state
    if (onFormVisibilityChange) {
      onFormVisibilityChange(true);
    }
  };

  // Edit handlers
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsEditMode(true);
  };

  // Convert Address to ShippingAddressFormData for prefilling
  const getFormDataFromAddress = (
    address: Address
  ): Partial<ShippingAddressFormData> => {
    console.log("Converting address to form data:", address);

    const formData = {
      full_name: address.full_name || address.fullName || "",
      address_line1: address.address_line1 || address.addressLine1 || "",
      address_line2: address.address_line2 || address.addressLine2 || "",
      city: address.city || "",
      state: address.state || "",
      postal_code: address.postal_code || address.postalCode || "",
      // Keep country as code since form expects country codes
      country: address.country || "",
      type: address.type || "residential",
      business_name: address.business_name || "",
      gst_number: address.gst_number || "",
    };

    console.log("Converted form data:", formData);
    return formData;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={2}>
        <Typography variant="body1" color="error">
          Error loading addresses.
        </Typography>
      </Box>
    );
  }

  // Format address as a single line string - support both snake_case and camelCase properties
  const formatAddressLine = (address: Address): string => {
    const line1 = address.address_line1 || address.addressLine1 || "";
    const line2 = address.address_line2 || address.addressLine2 || "";
    const city = address.city || "";
    const state = address.state || "";
    const country = address.country || "";
    const postalCode = address.postal_code || address.postalCode || "";

    return `${line1}${
      line2 ? ", " + line2 : ""
    }, ${city}, ${state}, ${country} - ${postalCode}`;
  };

  // Show compact view if showSelectedOnly is true and we have a selected address
  if (showSelectedOnly && selectedAddress) {
    const selected = sortedAddresses.find(
      (addr: Address) => addr.id === selectedAddress
    );
    if (selected) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {selected.full_name || selected.fullName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatAddressLine(selected)}
            </Typography>
          </Box>
          <Button
            color="primary"
            variant="text"
            onClick={() => {
              // When Change is clicked, the parent should remove the showSelectedOnly flag
              // Pass the same address back to indicate we want to edit this one
              onAddressSelected(selected);
            }}
          >
            Change
          </Button>
        </Box>
      );
    }
  }

  // Show full selector if not in compact mode
  return (
    <>
      {/* Main view with addresses in a grid */}
      {!isEditMode && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            SHIPPING ADDRESS
          </Typography>
          {sortedAddresses.length >= 7 && (
            <Box
              component="input"
              type="text"
              placeholder="Search...."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0); // Reset to first page when searching
              }}
              sx={{
                width: "25%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: `1px solid ${theme.palette.divider}`,
                fontSize: "14px",
                transition: theme.transitions.create([
                  "border-color",
                  "box-shadow",
                ]),
                "&:focus": {
                  outline: "none",
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 2px ${theme.palette.primary.light}40`,
                },
                "&::placeholder": {
                  color: "text.secondary",
                  opacity: 0.7,
                },
              }}
            />
          )}
        </Box>
      )}
      {/* Show edit form if in edit mode, otherwise show address grid */}
      {isEditMode && editingAddress ? (
        <Box sx={{ mt: 2 }}>
          <ShippingAddressForm
            defaultValues={getFormDataFromAddress(editingAddress)}
            formId="edit-address-form"
            selectedAddressId={editingAddress?.id}
            onCancel={() => setIsEditMode(false)}
            onSuccess={() => {
              // Refresh the addresses list after successful update
              refreshAddresses();
            }}
          />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {filteredAddresses.length === 0 ? (
            <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                {searchTerm
                  ? "No addresses match your search"
                  : "No shipping addresses found"}
              </Typography>
            </Box>
          ) : (
            filteredAddresses
              // No filtering by address_type - we want to show all addresses
              // in the order they were sorted (SHIPPING first, then others)
              // Add pagination - slice the array to show only current page addresses
              .slice(
                currentPage * ADDRESSES_PER_PAGE,
                (currentPage + 1) * ADDRESSES_PER_PAGE
              )
              .map((address) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={address.id}>
                  <Paper
                    elevation={0}
                    onClick={(e) => {
                      // Prevent default to avoid any unexpected behavior
                      e.stopPropagation();
                      // Only handle click if it's not on the action buttons
                      if (!(e.target as HTMLElement).closest("button")) {
                        handleAddressChange({
                          target: { value: address.id },
                        } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    sx={{
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 1,
                      backgroundColor:
                        address.id === selectedAddress
                          ? "action.hover"
                          : "background.paper",
                      cursor: "pointer",
                      height: "100%",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <Box sx={{ p: 1 }}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box display="flex" gap={1}>
                          <Box>
                            {/* First line - Full name and phone number */}
                            <Typography
                              sx={{
                                fontSize: "0.95rem",
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {address.full_name || address.fullName}
                              {/* Default chip below address */}
                              {(address.is_default ||
                                address.isDefaultShipping) && (
                                <Chip
                                  label="Default"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    ml: 1,
                                    fontSize: "0.7rem",
                                    borderRadius: 1,
                                    borderColor: "grey.500",
                                    color: "text.secondary",
                                    backgroundColor: "grey.300",
                                    "& .MuiChip-label": {
                                      px: 1,
                                      py: 0.25,
                                    },
                                  }}
                                />
                              )}
                            </Typography>

                            {/* Second line - Address details with ellipsis for overflow */}
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
                              {address.address_line1 || address.addressLine1}
                              {address.address_line2
                                ? `, ${address.address_line2}`
                                : ""}
                              , {address.city}, {address.state},{" "}
                              {address.postal_code || address.postalCode},{" "}
                              {address.country}
                            </Typography>
                          </Box>
                        </Box>

                        <Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddress(address);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))
          )}
        </Grid>
      )}

      {/* Action buttons with pagination - only show when not in edit mode */}
      {!isEditMode && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Button
            variant="text"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddNewAddress}
          >
            Add a new address
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="text"
              color="primary"
              startIcon={<NavigateBeforeIcon />}
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || filteredAddresses.length === 0}
              size="small"
            >
              Previous
            </Button>

            <Typography variant="body2" color="text.secondary">
              {filteredAddresses.length > 0
                ? `Page ${currentPage + 1} of ${Math.ceil(
                    filteredAddresses.filter(
                      (addr) =>
                        addr.address_type === AddressType.SHIPPING ||
                        addr.isDefaultShipping === true ||
                        addr.is_default === true
                    ).length / ADDRESSES_PER_PAGE
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
                  Math.ceil(
                    filteredAddresses.filter(
                      (addr) =>
                        addr.address_type === AddressType.SHIPPING ||
                        addr.isDefaultShipping === true ||
                        addr.is_default === true
                    ).length / ADDRESSES_PER_PAGE
                  ) -
                    1 || filteredAddresses.length === 0
              }
              size="small"
            >
              Next
            </Button>
          </Stack>
        </Box>
      )}
    </>
  );
};

export default ShippingAddressSelector;
