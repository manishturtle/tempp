import React, { useEffect, useState } from "react";
import {
  Grid,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
} from "@mui/material";

import { Account, OrderMode } from "@/app/types/order";
import { useTranslation } from "react-i18next";

interface BasicDetailsProps {
  mode: OrderMode;
  accounts: Account[];
  isLoadingAccounts: boolean;
  data: any;
  setData: (data: any) => void;
  unpaidInvoices?: any;
}

const BasicDetails: React.FC<BasicDetailsProps> = ({
  mode,
  accounts,
  isLoadingAccounts,
  data,
  setData,
  unpaidInvoices,
}) => {
  const { t } = useTranslation();

  const isReadOnly = mode?.toLowerCase() === OrderMode.VIEW;

  const handleAccountChange = (account: any) => {
    if (account) {
      setData({
        ...data,
        account_id: account.id,
        account: account,
        account_name: account.name,
      });
    } else {
      setData((prev: any) => ({
        ...prev,
        account_id: null,
        account: null,
        account_name: "",
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
        <Grid size={12}>
          <Autocomplete
            id="account-select"
            options={accounts}
            getOptionLabel={(option) => option?.name || ""}
            value={
              accounts.find((account) => account.id === data?.account_id) ||
              null
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
        <Grid size={12}>
          <TextField
            label={t("receipts.amountReceived", "Amount Received")}
            variant="outlined"
            size="small"
            sx={{ mb: "0px" }}
            required
            type="number"
            fullWidth
            onChange={(e) => {
              setData({
                ...data,
                amount_received: e.target.value,
              });
            }}
            value={data?.amount_received}
            disabled={isReadOnly}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default BasicDetails;
