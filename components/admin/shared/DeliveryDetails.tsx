"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Button,
  Stack,
  TextField,
  Chip,
  Autocomplete,
  Tooltip,
  IconButton,
} from "@mui/material";
import EditSquareIcon from "@mui/icons-material/EditSquare";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useTranslation } from "react-i18next";
import AddressDialog from "./AddressDialog";
import { OrderMode } from "@/app/types/order";

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
  address_id?: number;
}

interface Address extends ShippingAddress {
  // Keep the optionality consistent with ShippingAddress interface
  // This fixes the type compatibility issues with callbacks
  address_type?: string;
  is_primary_shipping?: boolean;
}

export interface StorePickup {
  id: number;
  name: string;
  contact_person: string;
  contact_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  google_place_id?: string;
  operating_hours: {
    [key: string]: {
      open?: string;
      close?: string;
      is_open: boolean;
    };
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  customer_group_selling_channels: number[];
}

interface DeliveryDetailsProps {
  mode?: OrderMode;
  orderData: any;
  setOrderData: (data: any) => void;
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
  accounts: any[];
  setAccounts: (accounts: any[]) => void;
  storePickups: any[];
  type?: "order" | "invoice";
  showNotification?: (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => void;
}

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  mode,
  orderData,
  setOrderData,
  addresses,
  setAddresses,
  accounts,
  setAccounts,
  storePickups,
  type = "order",
  showNotification,
}) => {
  const { t } = useTranslation();
  const [selectedAddress, setSelectedAddress] =
    useState<ShippingAddress | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] =
    useState<boolean>(false);

  const [dialogMode, setDialogMode] = useState<"select" | "add" | "edit">(
    "select"
  );
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [selectedStorePickup, setSelectedStorePickup] =
    useState<StorePickup | null>(null);

  // New address form state
  const [newAddress, setNewAddress] = useState<any>({
    full_name: "",
    phone_number: "",
    business_name: "",
    gst_number: "",
    street_1: "",
    street_2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    address_type: "SHIPPING",
    is_primary_shipping: false,
  });

  // Filter only shipping addresses
  const shippingAddresses = addresses.filter(
    (address) => address.address_type === "SHIPPING"
  );

  useEffect(() => {
    if (!orderData.account_id && !orderData.account) {
      setSelectedAddress(null);
    } else {
      setSelectedAddress(orderData.shipping_address);
    }
  }, [orderData]);

  // Sync selected store pickup with orderData
  useEffect(() => {
    if (orderData.storepickup && storePickups.length > 0) {
      const pickup = storePickups.find(
        (p: StorePickup) => p.id === orderData.storepickup
      );
      setSelectedStorePickup(pickup || null);
    } else {
      setSelectedStorePickup(null);
    }
  }, [orderData.storepickup, storePickups]);

  const handleFulfillmentTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (value === "Pickup" && storePickups.length === 0 && showNotification) {
      showNotification(t("Store pickup not available"), "warning");
      return;
    }
    setOrderData({
      ...orderData,
      fulfillment_type: value,
    });
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setIsAddressDialogOpen(false);
  };

  const handleStorePickupChange = (
    event: any,
    newValue: StorePickup | null
  ) => {
    setSelectedStorePickup(newValue);
    setOrderData({
      ...orderData,
      storepickup: newValue?.id || undefined,
    });
  };

  const openAddressDialog = () => {
    if (!orderData.account_id) {
      if (showNotification) {
        showNotification(t("Please select a valid account"), "error");
      }
      return;
    }
    // If no addresses, open in add mode directly
    if (shippingAddresses.length === 0) {
      setDialogMode("add");
    } else {
      setDialogMode("select");
    }
    setIsAddressDialogOpen(true);
  };

  const closeAddressDialog = () => {
    setIsAddressDialogOpen(false);
    setDialogMode("select");
    setEditingAddressId(null);
    resetNewAddressForm();
  };

  const handleAddNewAddress = () => {
    setDialogMode("add");
    resetNewAddressForm();
  };

  const handleEditAddress = (address: Address) => {
    console.log(address);
    setEditingAddressId(address.address_id || null);
    setDialogMode("edit");
    // Populate form with existing address data
    setNewAddress({
      full_name: address.full_name,
      phone_number: address.phone_number,
      business_name: address.business_name || "",
      gst_number: address.gst_number || "",
      street_1: address.street_1,
      street_2: address.street_2 || "",
      city: address.city,
      state_province: address.state_province,
      postal_code: address.postal_code,
      country: address.country,
      address_type: "SHIPPING",
      is_primary_shipping: address.is_primary_shipping,
    });
  };

  const handleBackToSelect = () => {
    setDialogMode("select");
    setEditingAddressId(null);
    resetNewAddressForm();
  };

  const resetNewAddressForm = () => {
    setNewAddress({
      full_name: "",
      phone_number: "",
      business_name: "",
      gst_number: "",
      street_1: "",
      street_2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
      address_type: "SHIPPING",
      is_primary_shipping: false,
    });
  };

  const handleNewAddressChange = (field: string, value: any) => {
    setNewAddress((prev: any) => ({ ...prev, [field]: value }));
  };

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

  const handleNewAddress = (address: Address) => {
    // Add to addresses list
    const updatedAddresses = [...addresses, address];
    setAddresses(updatedAddresses);
    // Set as selected address and update orderData
    setSelectedAddress(address);
    setOrderData({
      ...orderData,
      shipping_address: address,
    });

    // Find and update the account with the new address
    const matchedAccount = accounts.find(
      (account: any) => account.id === orderData.account_id
    );
    if (matchedAccount) {
      const updatedAccounts = accounts.map((account: any) =>
        account.id === orderData.account_id
          ? { ...account, addresses: [...(account.addresses || []), address] }
          : account
      );
      setAccounts(updatedAccounts);
    }
    closeAddressDialog();
  };

  const handleUpdateAddress = (address: Address) => {
    // Update in addresses list
    const updatedAddresses = addresses.map((addr: Address) =>
      addr.address_id === address.address_id ? address : addr
    );
    setAddresses(updatedAddresses);
    // If this is the currently selected address, update it and orderData
    if (selectedAddress?.address_id === address.address_id) {
      setSelectedAddress(address);
      setOrderData({
        ...orderData,
        shipping_address:
          orderData.shipping_address?.address_id === address.address_id
            ? address
            : orderData.shipping_address,
      });
    }

    // Update the address in the account
    const matchedAccount = accounts.find(
      (account: any) => account.id === orderData.account_id
    );
    if (matchedAccount) {
      const updatedAccounts = accounts.map((account: any) =>
        account.id === orderData.account_id
          ? {
              ...account,
              addresses: (account.addresses || []).map((addr: Address) =>
                addr.address_id === address.address_id ? address : addr
              ),
            }
          : account
      );
      setAccounts(updatedAccounts);
    }
    closeAddressDialog();
  };

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t("Delivery Details")}
      </Typography>

      <Box sx={{ mb: 1 }}>
        <RadioGroup
          row
          value={orderData.fulfillment_type}
          onChange={handleFulfillmentTypeChange}
        >
          <FormControlLabel
            value="Delivery"
            control={<Radio />}
            label={t("Delivery")}
          />
          <FormControlLabel
            value="Pickup"
            control={<Radio />}
            label={t("Pickup")}
          />
        </RadioGroup>
      </Box>

      {orderData.fulfillment_type === "Delivery" && (
        <>
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {t("Recipient Details")}
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label={t("Full Name")}
                value={orderData.recipient_details?.name}
                onChange={(e) =>
                  setOrderData({
                    ...orderData,
                    recipient_details: {
                      ...orderData.recipient_details,
                      name: e.target.value,
                    },
                  })
                }
                sx={{ width: "50%" }}
                size="small"
              />
              <Box sx={{ width: "50%" }}>
                <PhoneInput
                  country={"in"}
                  value={orderData.recipient_details?.phone}
                  onChange={(value: string) =>
                    setOrderData({
                      ...orderData,
                      recipient_details: {
                        ...orderData.recipient_details,
                        phone: value,
                      },
                    })
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
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t("Shipping Address")}
            </Typography>
            {selectedAddress ? (
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none" },
                }}
              >
                <CardContent
                  sx={{
                    py: 1.5,
                    "&:last-child": { pb: 1.5 },
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography variant="body2">
                        {selectedAddress.full_name}
                      </Typography>
                      {"is_primary_shipping" in selectedAddress ? (
                        selectedAddress.is_primary_shipping ? (
                          <Chip
                            label={t("Default")}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        ) : null
                      ) : null}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatAddressForDisplay(selectedAddress)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedAddress.phone_number}
                    </Typography>
                  </Box>
                  <Tooltip
                    title={
                      shippingAddresses.length > 0
                        ? t("Change Address")
                        : t("Add Address")
                    }
                  >
                    <IconButton onClick={openAddressDialog}>
                      <EditSquareIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </CardContent>
              </Card>
            ) : (
              <Typography variant="body2" color="error">
                {t("No shipping address selected")}
              </Typography>
            )}
            {/* 
            <Button
              startIcon={<EditSquareIcon />}
              onClick={openAddressDialog}
              sx={{ textTransform: "none", p: 0 }}
            >
              {shippingAddresses.length > 0
                ? t("Change Address")
                : t("Add Address")}
            </Button> */}
          </Box>

          {/* Address Dialog */}
          <AddressDialog
            isOpen={isAddressDialogOpen}
            onClose={closeAddressDialog}
            dialogMode={dialogMode}
            addressType="SHIPPING"
            addresses={shippingAddresses}
            selectedAddress={selectedAddress}
            onAddressSelect={handleAddressSelect}
            onAddNewAddress={handleNewAddress}
            onUpdateAddress={handleUpdateAddress}
            newAddress={newAddress}
            onNewAddressChange={handleNewAddressChange}
            editingAddressId={editingAddressId}
            accountId={orderData.account_id as number}
            showNotification={showNotification}
            onBackToSelect={handleBackToSelect}
            onEditAddress={handleEditAddress}
            onAddNewAddressClick={handleAddNewAddress}
          />
        </>
      )}

      {orderData.fulfillment_type === "Pickup" && (
        <>
          {/* Store Pickup Selection */}
          <Box>
            <Autocomplete
              options={storePickups}
              getOptionLabel={(option: StorePickup) => option.name}
              value={selectedStorePickup}
              onChange={handleStorePickupChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("Store Pickup Location")}
                  size="small"
                  fullWidth
                />
              )}
              renderOption={(props, option: StorePickup) => (
                <Box component="li" {...props}>
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.875rem" }}
                    >
                      Address: {option.address_line1}
                      {option.address_line2 &&
                        `, ${option.address_line2}`}, {option.city},{" "}
                      {option.state}, {option.country}, {option.pincode}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.875rem" }}
                    >
                      Contact Person: {option.contact_person},{" "}
                      {option.contact_number}
                    </Typography>
                  </Box>
                </Box>
              )}
              isOptionEqualToValue={(option: StorePickup, value: StorePickup) =>
                option.id === value.id
              }
            />
          </Box>

          {/* Pickup Details */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {t("Pickup Details")}
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label={t("Full Name")}
                value={orderData.pickup_details?.name}
                onChange={(e) =>
                  setOrderData({
                    ...orderData,
                    pickup_details: {
                      ...orderData.pickup_details,
                      name: e.target.value,
                    },
                  })
                }
                sx={{ width: "50%" }}
                size="small"
              />
              <Box sx={{ width: "50%" }}>
                <PhoneInput
                  country={"in"}
                  value={orderData.pickup_details?.phone}
                  onChange={(value: string) =>
                    setOrderData({
                      ...orderData,
                      pickup_details: {
                        ...orderData.pickup_details,
                        phone: value,
                      },
                    })
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
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
};

export default DeliveryDetails;
