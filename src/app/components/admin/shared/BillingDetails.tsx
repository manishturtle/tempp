"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
  Chip,
  TextField,
  Tooltip,
  IconButton,
} from "@mui/material";
import EditSquareIcon from "@mui/icons-material/EditSquare";
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
  address_type: string;
  is_primary_billing: boolean;
}

interface BillingDetailsProps {
  mode?: OrderMode;
  orderData: any;
  setOrderData: (data: any) => void;
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
  accounts: any[];
  setAccounts: (accounts: any[]) => void;
  type?: "order" | "invoice";
  showNotification?: (
    message: string,
    severity: "success" | "error" | "warning" | "info"
  ) => void;
}

const BillingDetails: React.FC<BillingDetailsProps> = ({
  mode,
  orderData,
  setOrderData,
  addresses,
  setAddresses,
  accounts,
  setAccounts,
  type = "order",
  showNotification,
}) => {
  const { t } = useTranslation();

  const [selectedAddress, setSelectedAddress] =
    useState<ShippingAddress | null>(orderData?.billing_address || null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] =
    useState<boolean>(false);

  // Dialog modes: 'select' | 'add' | 'edit'
  const [dialogMode, setDialogMode] = useState<"select" | "add" | "edit">(
    "select"
  );
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

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
    address_type: "BILLING",
    is_primary_billing: false,
  });

  // Filter only billing addresses
  const billingAddresses = addresses.filter(
    (address) => address.address_type === "BILLING"
  );

  useEffect(() => {
    if (!orderData.account_id && !orderData.account) {
      setSelectedAddress(null);
    } else {
      setSelectedAddress(orderData.billing_address);
    }
  }, [orderData]);

  // Handle "Same as shipping" checkbox
  useEffect(() => {
    if (orderData?.same_as_shipping && orderData.shipping_address) {
      // Use shipping address as billing address, but exclude the id field
      const { id, ...shippingAddressWithoutId } = orderData.shipping_address;
      const billingFromShipping = {
        ...shippingAddressWithoutId,
        address_type: "BILLING",
        is_primary_billing: false,
        is_primary_shipping: false,
      };
      setSelectedAddress(billingFromShipping);
    } else if (
      !orderData?.same_as_shipping &&
      selectedAddress?.address_type === "BILLING" &&
      !selectedAddress.address_id
    ) {
      const defaultBillingAddress = billingAddresses.find(
        (address) => address.is_primary_billing
      );
      if (defaultBillingAddress) {
        setOrderData({
          ...orderData,
          billing_address: defaultBillingAddress,
        });
        setSelectedAddress(defaultBillingAddress);
      } else {
        setSelectedAddress(null);
      }
    }
  }, [orderData?.same_as_shipping, orderData.shipping_address]);

  const handleSameAsShippingChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOrderData({
      ...orderData,
      same_as_shipping: event.target.checked,
    });
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setIsAddressDialogOpen(false);
    // Uncheck "same as shipping" when selecting a different billing address
    if (orderData?.same_as_shipping) {
      setOrderData({
        ...orderData,
        same_as_shipping: false,
      });
    }
  };

  const openAddressDialog = () => {
    if (!orderData.account_id) {
      if (showNotification) {
        showNotification(t("Please select a valid account"), "error");
      }
      return;
    }
    // If no addresses, open in add mode directly
    if (billingAddresses.length === 0) {
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
      address_type: "BILLING",
      is_primary_billing: address.is_primary_billing,
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
      address_type: "BILLING",
      is_primary_billing: false,
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

  const handleAddAddress = (address: Address) => {
    // Add to addresses list
    const updatedAddresses = [...addresses, address];
    setAddresses(updatedAddresses);
    // Set as selected address and update orderData
    setSelectedAddress(address);
    setOrderData({
      ...orderData,
      billing_address: address,
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
    const updatedAddresses = addresses.map((addr: Address) =>
      addr.address_id === address.address_id ? address : addr
    );
    setAddresses(updatedAddresses);

    // If this is the currently selected address, update it and orderData
    if (selectedAddress?.address_id === address.address_id) {
      setSelectedAddress(address);
      setOrderData({
        ...orderData,
        billing_address:
          orderData.billing_address?.address_id === address.address_id
            ? address
            : orderData.billing_address,
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
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("Billing Details")}
      </Typography>

      {type === "invoice" && selectedAddress && (
        <Box sx={{ mb: 1 }}>
          <TextField
            label={t("Place of Supply")}
            value={selectedAddress?.state_province}
            disabled
            size="small"
            fullWidth
            variant="outlined"
            sx={{ mb: "0px" }}
          />
        </Box>
      )}

      {/* Billing Address Section */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t("Billing Address")}
        </Typography>
        {selectedAddress ? (
          <Card
            variant="outlined"
            sx={{ mb: 2, boxShadow: "none", "&:hover": { boxShadow: "none" } }}
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
                  {orderData?.same_as_shipping ? (
                    <Chip
                      label={t("Same as Shipping")}
                      color="info"
                      size="small"
                      variant="outlined"
                    />
                  ) : "is_primary_billing" in selectedAddress &&
                    selectedAddress.is_primary_billing ? (
                    <Chip
                      label={t("Default")}
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  ) : null}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatAddressForDisplay(selectedAddress)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAddress.phone_number}
                </Typography>
              </Box>
              {!orderData?.same_as_shipping && (
                <Tooltip
                  title={
                    billingAddresses.length > 0
                      ? t("Change Address")
                      : t("Add Address")
                  }
                >
                  <IconButton onClick={openAddressDialog}>
                    <EditSquareIcon color="primary" />
                  </IconButton>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        ) : (
          <Typography variant="body2" color="error">
            {t("No billing address selected")}
          </Typography>
        )}

        {/* {!orderData?.same_as_shipping && (
          <Button
            startIcon={<EditSquareIcon />}
            onClick={openAddressDialog}
            sx={{ textTransform: "none", p: 0 }}
          >
            {billingAddresses.length > 0
              ? t("Change Address")
              : t("Add Address")}
          </Button>
        )} */}
      </Box>

      {/* Same as Shipping Checkbox */}
      {orderData?.fulfillment_type === "Delivery" && (
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={orderData?.same_as_shipping}
                onChange={handleSameAsShippingChange}
                disabled={!orderData.shipping_address}
              />
            }
            label={t("Same as shipping address")}
          />
          {!orderData.shipping_address && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", ml: 4 }}
            >
              {t("Please select a shipping address first")}
            </Typography>
          )}
        </Box>
      )}

      {/* Address Dialog */}
      <AddressDialog
        isOpen={isAddressDialogOpen}
        onClose={closeAddressDialog}
        dialogMode={dialogMode}
        addressType="BILLING"
        addresses={billingAddresses}
        selectedAddress={selectedAddress}
        onAddressSelect={handleAddressSelect}
        onAddNewAddress={handleAddAddress}
        onUpdateAddress={handleUpdateAddress}
        newAddress={newAddress}
        onNewAddressChange={handleNewAddressChange}
        editingAddressId={editingAddressId}
        accountId={orderData.account_id}
        showNotification={showNotification}
        onBackToSelect={handleBackToSelect}
        onEditAddress={handleEditAddress}
        onAddNewAddressClick={handleAddNewAddress}
      />
    </Box>
  );
};

export default BillingDetails;
