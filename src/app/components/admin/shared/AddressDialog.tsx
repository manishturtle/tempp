"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ListItemText,
  Typography,
  TextField,
  Grid,
  Box,
  IconButton,
  Autocomplete,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { useTranslation } from "react-i18next";
import { useCreateAddress, useUpdateAddress } from "@/app/hooks/api/orders";
import {
  useLocation,
  type Country,
} from "@/app/hooks/api/tenant-admin/useLocation";

// Use the ShippingAddress interface from DeliveryDetails for now
export interface ShippingAddress {
  id?: number;
  business_name?: string | null;
  gst_number?: string | null;
  street_1: string;
  street_2?: string | null;
  full_name: string;
  phone_number: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  country_code?: string;
  address_type?: string;
  is_primary_shipping?: boolean;
  is_primary_billing?: boolean;
}

export interface AddressDialogProps {
  // Dialog state
  isOpen: boolean;
  onClose: () => void;
  dialogMode: "select" | "add" | "edit";

  // Address type configuration
  addressType: "SHIPPING" | "BILLING";

  // Addresses data
  addresses: any[];
  selectedAddress: any | null;

  // Callbacks
  onAddressSelect: (address: any) => void;
  onAddNewAddress?: (address: any) => void;
  onUpdateAddress?: (address: any) => void;

  // Form data
  newAddress: any;
  onNewAddressChange: (field: string, value: any) => void;

  // Editing state
  editingAddressId: number | null;

  // Other props
  accountId: number | null;
  showNotification?: (
    message: string,
    type: "success" | "error" | "info"
  ) => void;

  // Navigation callbacks
  onBackToSelect: () => void;
  onEditAddress: (address: any) => void;
  onAddNewAddressClick: () => void;
}

const AddressDialog: React.FC<AddressDialogProps> = ({
  isOpen,
  onClose,
  dialogMode,
  addressType,
  addresses,
  selectedAddress,
  onAddressSelect,
  onAddNewAddress,
  onUpdateAddress,
  newAddress,
  onNewAddressChange,
  editingAddressId,
  accountId,
  showNotification,
  onBackToSelect,
  onEditAddress,
  onAddNewAddressClick,
}) => {
  const { t } = useTranslation();

  // API hooks
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();

  // Location API hooks
  const { useCountries, useStates } = useLocation();
  const { data: countries = [], isLoading: countriesLoading } = useCountries();
  const [selectedCountry, setSelectedCountry] = React.useState<Country | null>(
    null
  );
  const { data: states = [], isLoading: statesLoading } = useStates(
    selectedCountry?.id || 0
  );
  const [selectedState, setSelectedState] = React.useState<any>(null);

  // Handle country/state changes
  const handleCountryChange = (newValue: any) => {
    setSelectedCountry(newValue);
    setSelectedState(null);
    onNewAddressChange("country", newValue ? newValue.code : "");
    onNewAddressChange("state_province", "");
    onNewAddressChange("city", "");
  };

  const handleStateChange = (newValue: any) => {
    setSelectedState(newValue);
    onNewAddressChange("state_province", newValue ? newValue.name : "");
    onNewAddressChange("city", "");
  };

  // Initialize country/state when editing
  useEffect(() => {
    if (dialogMode === "edit" && newAddress.country && countries.length > 0) {
      const country = countries.find((c: any) => c.code === newAddress.country);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [dialogMode, newAddress.country, countries]);

  useEffect(() => {
    if (selectedCountry && newAddress.state_province && states.length > 0) {
      const state = states.find(
        (s: any) => s.name === newAddress.state_province
      );
      if (state) {
        setSelectedState(state);
      }
    }
  }, [selectedCountry, newAddress.state_province, states]);

  // Format address for display
  const formatAddressForDisplay = (address: ShippingAddress): string => {
    const parts = [
      address.street_1,
      address.street_2,
      address.city,
      address.state_province,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  // Form validation
  const isFormValid = (): boolean => {
    return !!(
      newAddress.full_name &&
      newAddress.phone_number &&
      newAddress.street_1 &&
      newAddress.city &&
      newAddress.state_province &&
      newAddress.postal_code &&
      newAddress.country
    );
  };

  // Save address handler
  const handleSaveAddress = async () => {
    if (!isFormValid()) return;

    if (!accountId) {
      if (showNotification) {
        showNotification(t("Please select a valid account"), "error");
      }
      return;
    }

    try {
      if (dialogMode === "edit" && editingAddressId) {
        // Update existing address
        const addressData = {
          ...newAddress,
          address_type: addressType,
          is_primary_shipping:
            addressType === "SHIPPING"
              ? addresses.length === 0
                ? true
                : (newAddress as any).is_primary_shipping || false
              : false,
          is_primary_billing:
            addressType === "BILLING"
              ? addresses.length === 0
                ? true
                : (newAddress as any).is_primary_billing || false
              : false,
          account_id: accountId,
        };

        const updatedAddress = await updateAddressMutation.mutateAsync({
          id: editingAddressId,
          data: addressData,
        });

        // Call the parent callback if provided
        if (onUpdateAddress) {
          const updatedAddressWithId = {
            ...addressData,
            address_id: editingAddressId,
          };
          setTimeout(() => {
            onUpdateAddress(updatedAddressWithId);
          }, 0);
        }
      } else {
        // Create new address
        const addressData = {
          ...newAddress,
          address_type: addressType,
          is_primary_shipping:
            addressType === "SHIPPING" && addresses.length === 0,
          is_primary_billing:
            addressType === "BILLING" && addresses.length === 0,
          account_id: accountId,
        };

        const createdAddress = await createAddressMutation.mutateAsync(
          addressData
        );

        // Call the parent callback if provided
        if (onAddNewAddress && createdAddress?.id) {
          onAddNewAddress({ ...addressData, address_id: createdAddress.id });
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  // Get dialog titles based on address type
  const getDialogTitle = () => {
    const addressTypeLabel =
      addressType === "SHIPPING" ? "Shipping" : "Billing";

    switch (dialogMode) {
      case "add":
        return t("Add New Address");
      case "edit":
        return t("Edit Address");
      case "select":
        return t(`Select ${addressTypeLabel} Address`);
      default:
        return "";
    }
  };

  // Get no addresses message
  const getNoAddressesMessage = () => {
    const addressTypeLabel =
      addressType === "SHIPPING" ? "shipping" : "billing";
    return t(`No ${addressTypeLabel} addresses available`);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={dialogMode === "select" ? "sm" : "md"}
      fullWidth
    >
      {dialogMode === "edit" ? (
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
            <IconButton onClick={onBackToSelect} size="small">
              <ArrowBackIcon />
            </IconButton>
            {getDialogTitle()}
          </Box>
        </DialogTitle>
      ) : (
        <DialogTitle>{getDialogTitle()}</DialogTitle>
      )}

      <DialogContent dividers>
        {dialogMode === "select" && (
          <>
            {addresses.length > 0 ? (
              <Box>
                {addresses.map((address) => (
                  <Card
                    key={address.address_id}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      boxShadow: "none",
                      "&:hover": { boxShadow: "none" },
                    }}
                  >
                    <CardContent
                      sx={{
                        cursor: "pointer",
                        backgroundColor:
                          selectedAddress?.address_id === address.address_id
                            ? "#f5f5f5"
                            : "inherit",
                        py: 1.5,
                        "&:last-child": { pb: 1.5 },
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onClick={() => onAddressSelect(address)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <ListItemText
                          primary={address.full_name}
                          secondary={formatAddressForDisplay(address)}
                        />
                        <Tooltip title={t("Edit Address")}>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAddress(address);
                            }}
                            size="small"
                          >
                            <EditIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body1">{getNoAddressesMessage()}</Typography>
            )}
          </>
        )}

        {(dialogMode === "add" || dialogMode === "edit") && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t("Full Name")}
                value={newAddress.full_name}
                onChange={(e) =>
                  onNewAddressChange("full_name", e.target.value)
                }
                size="small"
                required
                sx={{ mb: "0px" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ width: "100%" }}>
                <PhoneInput
                  country={"in"}
                  value={newAddress.phone_number}
                  onChange={(value: string) =>
                    onNewAddressChange("phone_number", value)
                  }
                  inputStyle={{
                    width: "100%",
                    height: "40px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  }}
                  containerStyle={{
                    width: "100%",
                  }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t("Business Name")}
                value={newAddress.business_name || ""}
                onChange={(e) =>
                  onNewAddressChange("business_name", e.target.value)
                }
                size="small"
                sx={{ mb: "0px" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t("GST Number")}
                value={newAddress.gst_number || ""}
                onChange={(e) =>
                  onNewAddressChange("gst_number", e.target.value)
                }
                size="small"
                sx={{ mb: "0px" }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t("Street Address Line 1")}
                value={newAddress.street_1}
                onChange={(e) => onNewAddressChange("street_1", e.target.value)}
                size="small"
                required
                sx={{ mb: "0px" }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t("Street Address Line 2")}
                value={newAddress.street_2 || ""}
                onChange={(e) => onNewAddressChange("street_2", e.target.value)}
                size="small"
                sx={{ mb: "0px" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={countries}
                getOptionLabel={(option) => option.name}
                value={selectedCountry}
                onChange={(_, newValue) => handleCountryChange(newValue)}
                loading={countriesLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("Country")}
                    size="small"
                    required
                    sx={{ mb: "0px" }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={states}
                getOptionLabel={(option) => option.name}
                value={selectedState}
                onChange={(_, newValue) => handleStateChange(newValue)}
                loading={statesLoading}
                disabled={!selectedCountry}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("State/Province")}
                    size="small"
                    required
                    helperText={
                      !selectedCountry ? t("Please select a country first") : ""
                    }
                    sx={{ mb: "0px" }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t("City")}
                name="city"
                size="small"
                required
                disabled={!selectedState}
                value={newAddress.city || ""}
                onChange={(e) => onNewAddressChange("city", e.target.value)}
                helperText={
                  !selectedState ? t("Please select a state first") : ""
                }
                sx={{ mb: "0px" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={t("Postal Code")}
                value={newAddress.postal_code}
                onChange={(e) =>
                  onNewAddressChange("postal_code", e.target.value)
                }
                size="small"
                required
                sx={{ mb: "0px" }}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>

        {dialogMode === "select" && (
          <Button
            variant="contained"
            color="primary"
            onClick={onAddNewAddressClick}
            startIcon={<AddIcon />}
          >
            {t("Add New Address")}
          </Button>
        )}

        {(dialogMode === "add" || dialogMode === "edit") && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAddress}
            disabled={
              !isFormValid() ||
              createAddressMutation.isPending ||
              updateAddressMutation.isPending
            }
          >
            {createAddressMutation.isPending || updateAddressMutation.isPending
              ? t("Saving...")
              : dialogMode === "edit"
              ? t("Update Address")
              : t("Save Address")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddressDialog;
