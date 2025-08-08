"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  useTheme,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  Chip,
  Stack,
} from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { Address } from "@/app/types/store/addressTypes";
import { useGetAddresses } from "@/app/hooks/api/store/useAddresses";
import { ShippingAddressForm } from "./EditForm";
import { ShippingAddressFormData } from "@/app/types/store/checkout";

/**
 * Props for the BillingAddressSelector component
 */
interface BillingAddressSelectorProps {
  onAddressSelected: (address: Address, isFormSubmission?: boolean) => void;
  selectedAddressId?: string | number;
  shippingAddress?: Address;
  isAuthenticated?: boolean;
  onFormVisibilityChange?: (isVisible: boolean) => void;
  selectedFulfillmentMethod?: string;
}

/**
 * Component for selecting a billing address during checkout
 */
export const BillingAddressSelector: React.FC<BillingAddressSelectorProps> = ({
  onAddressSelected,
  selectedAddressId,
  shippingAddress,
  isAuthenticated = true,
  onFormVisibilityChange,
  selectedFulfillmentMethod,
}) => {
  // If useSameAsShipping is true, we use the shipping address
  const [useSameAsShipping, setUseSameAsShipping] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<string | number>(
    selectedAddressId || ""
  );
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [justAddedAddress, setJustAddedAddress] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Addresses per page
  const ADDRESSES_PER_PAGE = 6;
  const {
    data: allAddresses = [],
    isLoading,
    error,
    refetch: refreshAddresses,
  } = useGetAddresses();
  const theme = useTheme();

  // Filter addresses by address_type = BILLING
  // We now keep the address_type field from the API
  const billingAddresses = allAddresses.filter((addr) => {
    return addr.address_type === "BILLING";
  });

  console.log("Filtered billing addresses:", billingAddresses);

  // Get default billing address by checking both snake_case and camelCase properties
  const defaultAddress = billingAddresses.find(
    (addr) => addr.is_default === true || addr.isDefaultBilling === true
  );

  // Sort all addresses: default address first, then by name
  const sortedAddresses = [...billingAddresses].sort((a, b) => {
    // Default address always comes first
    if (
      (a.is_default || a.isDefaultBilling) &&
      !(b.is_default || b.isDefaultBilling)
    ) {
      return -1;
    }
    if (
      !(a.is_default || a.isDefaultBilling) &&
      (b.is_default || b.isDefaultBilling)
    ) {
      return 1;
    }

    // Otherwise sort by name alphabetically
    const nameA = (a.full_name || a.fullName || "").toLowerCase();
    const nameB = (b.full_name || b.fullName || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  console.log("All sorted addresses:", sortedAddresses);

  // Set default address when addresses are loaded and no selection exists
  useEffect(() => {
    // If we just added a new address, don't override the selection
    if (justAddedAddress) {
      setJustAddedAddress(false); // Reset the flag
      return;
    }

    if (useSameAsShipping && shippingAddress) {
      setSelectedAddress("");
      onAddressSelected(shippingAddress);
      return;
    }

    if (billingAddresses.length > 0 && selectedAddress === "") {
      const defaultAddr = billingAddresses.find(
        (addr: Address) =>
          addr.is_default === true || addr.isDefaultBilling === true
      );
      if (defaultAddr) {
        console.log("Setting default billing address:", defaultAddr.id);
        setSelectedAddress(defaultAddr.id);
        onAddressSelected(defaultAddr);
      } else if (billingAddresses[0]) {
        console.log(
          "Setting first address as default billing:",
          billingAddresses[0].id
        );
        setSelectedAddress(billingAddresses[0].id);
        onAddressSelected(billingAddresses[0]);
      }
    }
  }, [
    billingAddresses,
    onAddressSelected,
    selectedAddress,
    useSameAsShipping,
    shippingAddress,
  ]);



  // Edit handlers
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    console.log("🔥 BillingAddressSelector - handleEditAddress called with:", address);
    setIsEditMode(true);
  };

  // Convert Address to ShippingAddressFormData for prefilling
  const getFormDataFromAddress = (
    address: Address
  ): Partial<ShippingAddressFormData> => {
    console.log("🔥 BillingAddressSelector - getFormDataFromAddress called with:", address);
    
    const formData = {
      full_name: address.full_name || address.fullName || "",
      address_line1: address.address_line1 || address.addressLine1 || "",
      address_line2: address.address_line2 || address.addressLine2 || "",
      city: address.city || "",
      state: address.state || "",
      postal_code: address.postal_code || address.postalCode || "",
      country: address.country || "",
      type: "business",
      business_name: address.business_name || "",
      gst_number: address.gst_number || "",
    };

    console.log("🔥 BillingAddressSelector - returning form data:", formData);
    return formData;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
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

  // Render billing addresses with option to use same as shipping
  return (
    <Box>
      {isEditMode && editingAddress && (
        <Box sx={{ mt: 2 }}>
          <ShippingAddressForm
            key={`billing-edit-${editingAddress.id}`}
            defaultValues={getFormDataFromAddress(editingAddress)}
            formId="billing-address-form"
            selectedAddressId={editingAddress?.id}
            onCancel={() => {
              setIsEditMode(false);
              setEditingAddress(null);
              if (onFormVisibilityChange) {
                onFormVisibilityChange(false);
              }
            }}
            onSuccess={() => {
              setIsEditMode(false);
              setEditingAddress(null);
              refreshAddresses();
              if (onFormVisibilityChange) {
                onFormVisibilityChange(false);
              }
            }}
          />
        </Box>
      )}
      {!isEditMode && (
        <>
          {shippingAddress &&
            selectedFulfillmentMethod !== "in_store_pickup" && (
              <Box mb={2}>
                <FormControlLabel
                  value="same"
                  control={
                    <Radio
                      checked={useSameAsShipping}
                      onChange={() => {
                        setUseSameAsShipping(true);
                        if (shippingAddress) {
                          onAddressSelected(shippingAddress);
                        }
                      }}
                      color="primary"
                    />
                  }
                  label="Same as shipping address"
                  sx={{
                    width: "100%",
                    m: 0,
                    p: 1,
                    border: "1px solid",
                    borderColor: useSameAsShipping ? "#1976d2" : "#e0e0e0",
                    borderRadius: "4px",
                    backgroundColor: useSameAsShipping
                      ? "#F5F9FF"
                      : "background.paper",
                    "&:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.04)",
                    },
                  }}
                />
              </Box>
            )}

          {/* Always show billing addresses */}
          <Box sx={{ width: "100%" }}>
            <Box
              mt={2}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr",
                },
                gap: 2,
              }}
            >
              {sortedAddresses
                .slice(
                  currentPage * ADDRESSES_PER_PAGE,
                  (currentPage + 1) * ADDRESSES_PER_PAGE
                )
                .map((address) => (
                  <Box key={address.id}>
                    <Paper
                      elevation={0}
                      onClick={(e) => {
                        // Prevent default for action buttons
                        if ((e.target as HTMLElement).closest("button")) {
                          e.stopPropagation();
                          return;
                        }

                        // Otherwise select this address
                        setUseSameAsShipping(false);
                        setSelectedAddress(address.id);
                        const selected = allAddresses.find(
                          (addr) => addr.id === address.id
                        );
                        if (selected) {
                          onAddressSelected(selected);
                        }
                      }}
                      sx={{
                        p: 1,
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
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box display="flex" gap={1} width="100%">
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
                              {(address.is_default ||
                                address.isDefaultBilling) && (
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
                                mt: 0.5,
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
                            <Typography
                              color="text.secondary"
                              sx={{
                                fontSize: "0.8rem",
                                mt: 0.5,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                lineHeight: "1.2em",
                                maxHeight: "2.4em",
                              }}
                            >
                              Business Name: {address.business_name} <br />
                              GST Number: {address.gst_number}
                            </Typography>

                            {/* Default chip below address */}
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
                    </Paper>
                  </Box>
                ))}
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                mt: 3,
              }}
            >
              <Button
                variant="text"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  console.log("Add new address button clicked");
                  if (onFormVisibilityChange) {
                    onFormVisibilityChange(true);
                  }
                }}
              >
                Add a new address
              </Button>

              {billingAddresses.length > ADDRESSES_PER_PAGE && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="text"
                    color="primary"
                    startIcon={<NavigateBeforeIcon />}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentPage === 0}
                    size="small"
                  >
                    Previous
                  </Button>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mx: 2 }}
                  >
                    Page {currentPage + 1} of{" "}
                    {Math.max(
                      1,
                      Math.ceil(billingAddresses.length / ADDRESSES_PER_PAGE)
                    )}
                  </Typography>

                  <Button
                    variant="text"
                    color="primary"
                    endIcon={<NavigateNextIcon />}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={
                      currentPage >=
                      Math.ceil(billingAddresses.length / ADDRESSES_PER_PAGE) -
                        1
                    }
                    size="small"
                  >
                    Next
                  </Button>
                </Stack>
              )}
            </Box>
          </Box>

          {/* Continue button removed - now handled in Layout1 */}
        </>
      )}
    </Box>
  );
};

export default BillingAddressSelector;
