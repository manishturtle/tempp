import React, { useEffect, useState } from "react";
import {
  Grid,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
} from "@mui/material";

import { Account, Contact, OrderMode, SellingChannel } from "@/app/types/order";
import { useTranslation } from "react-i18next";

interface CustomerDetailsProps {
  mode: OrderMode;
  accounts: Account[];
  isLoadingAccounts: boolean;
  contacts: Contact[];
  sellingChannels: SellingChannel[];
  orderData: any;
  setOrderData: (data: any) => void;
  setAddresses: (addresses: any[]) => void;
  unpaidInvoices: any;
}

/**
 * Component for selecting customer details in the order form
 * Includes selection of Account, Contact Person, and Selling Channel
 */
const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  mode,
  accounts,
  isLoadingAccounts,
  contacts,
  sellingChannels,
  orderData,
  setOrderData,
  setAddresses,
  unpaidInvoices,
}) => {
  const { t } = useTranslation();

  console.log("unpaidInvoices", unpaidInvoices);
  // Helper to determine if fields should be readonly
  const isReadOnly = mode?.toLowerCase() === OrderMode.VIEW;

  const handleAccountChange = (account: any) => {
    if (account) {
      const addresses = account?.addresses;
      setAddresses(addresses);

      const primaryShippingAddress = addresses.find(
        (address: any) => address.is_primary_shipping
      );
      const primaryBillingAddress = addresses.find(
        (address: any) => address.is_primary_billing
      );
      setOrderData({
        ...orderData,
        account_id: account.id,
        account: account,
        account_name: account.name,
        customer_group_id: account.customer_group?.id,
        shipping_address: primaryShippingAddress,
        billing_address: primaryBillingAddress,
        fulfillment_type: "Delivery",
      });
    } else {
      setAddresses([]);
      setOrderData((prev: any) => ({
        ...prev,
        shipping_address: undefined,
        billing_address: undefined,
        recipient_details: {
          name: "",
          phone: "",
        },
        fulfillment_type: "Delivery",
        account_id: null,
        account: null,
        customer_group_id: null,
        account_name: "",
        contact_id: null,
        contact_person_name: "",
      }));
    }
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
      <Typography variant="h6" mb={2}>
        {t("orders.customerDetails")}
      </Typography>

      <Grid container rowSpacing={2} columnSpacing={2}>
        {/* Account Selection */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete
            id="account-select"
            options={accounts}
            getOptionLabel={(option) => option?.name || ""}
            value={
              accounts.find(
                (account) => account.id === orderData?.account_id
              ) || null
            }
            onChange={(_, newValue) => {
              handleAccountChange(newValue);
            }}
            loading={isLoadingAccounts}
            disabled={isReadOnly}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            getOptionKey={(option) => option?.id?.toString() || ""}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("orders.account")}
                variant="outlined"
                size="small"
                sx={{ mb: "0px" }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingAccounts ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                required
                helperText={
                  unpaidInvoices
                    ? unpaidInvoices?.unpaid_amount
                      ? `Outstanding Amount: INR ${unpaidInvoices?.unpaid_amount}`
                      : ""
                    : ""
                }
              />
            )}
          />
        </Grid>

        {/* Selling Channel Selection */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete
            id="selling-channel-select"
            options={sellingChannels}
            getOptionLabel={(option) => option?.name || ""} // Add fallback empty string
            value={
              sellingChannels.find(
                (channel) => channel.id === orderData?.selling_channel_id
              ) || null
            }
            onChange={(_, newValue) => {
              setOrderData((prev: any) => ({
                ...prev,
                selling_channel_id: newValue?.id,
              }));
            }}
            disabled={isReadOnly}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            getOptionKey={(option) => option.id.toString()}
            loading={isLoadingAccounts}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("orders.sellingChannel")}
                variant="outlined"
                size="small"
                sx={{ mb: "0px" }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: <>{params.InputProps.endAdornment}</>,
                }}
                required
              />
            )}
          />
        </Grid>

        {/* Contact Selection (only enabled when an account is selected) */}
        {orderData?.account_id && orderData?.selling_channel_id && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              id="contact-select"
              options={contacts}
              getOptionLabel={(option) =>
                option
                  ? `${option.first_name || ""} ${
                      option.last_name || ""
                    }`.trim()
                  : ""
              }
              value={
                contacts.find(
                  (contact) => contact.id === orderData?.contact_id
                ) || null
              }
              onChange={(_, newValue) => {
                const phone =
                  newValue?.mobile_phone || newValue?.work_phone || "";
                return setOrderData({
                  ...orderData,
                  contact_id: newValue?.id || null,
                  contact_person_name: newValue?.full_name || "",
                  recipient_details: {
                    name: newValue?.full_name || "",
                    phone: phone,
                  },
                });
              }}
              disabled={!orderData?.account_id || isReadOnly}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              getOptionKey={(option) => option?.id?.toString() || ""}
              loading={isLoadingAccounts}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("orders.contactPerson")}
                  variant="outlined"
                  error={!orderData?.account_id}
                  helperText={
                    !orderData?.account_id && !isReadOnly
                      ? t("orders.selectAccountFirst")
                      : ""
                  }
                  size="small"
                  sx={{ mb: "0px" }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: <>{params.InputProps.endAdornment}</>,
                  }}
                />
              )}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default CustomerDetails;
