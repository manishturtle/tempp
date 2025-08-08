import React, { useEffect, useState } from "react";
import {
  Grid,
  Typography,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { OrderMode } from "@/app/types/order";
import { useTranslation } from "react-i18next";
import { StaffUser } from "@/app/types/order";
import { parseISO } from "date-fns";

interface OrderSettingsProps {
  mode: OrderMode;
  staffUsers?: StaffUser[];
  isLoadingStaffUsers?: boolean;
  orderData: any;
  setOrderData: (data: any) => void;
}

/**
 * Component for managing order settings
 * Includes Order Number, Date, Status, and Discount Level
 */
const OrderSettings: React.FC<OrderSettingsProps> = ({
  mode,
  staffUsers,
  isLoadingStaffUsers,
  orderData,
  setOrderData,
}) => {
  const { t } = useTranslation();

  // Helper to determine if fields should be readonly
  const isReadOnly = mode === OrderMode.VIEW;

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
        {t("orders.orderSettings")}
      </Typography>

      <Grid container rowSpacing={2} columnSpacing={2}>
        {/* Order Number - Only in View Mode */}
        {mode === OrderMode.VIEW && (
          <Grid size={12}>
            <TextField
              id="order-id"
              label={t("orders.orderNumber")}
              value={orderData?.order_id}
              variant="outlined"
              disabled={true}
              fullWidth
              size="small"
              sx={{ mb: "0px" }}
            />
          </Grid>
        )}

        <Grid size={12}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("orders.orderDate")}
              value={
                orderData?.order_date ? parseISO(orderData.order_date) : null
              }
              onChange={(date) =>
                setOrderData({ ...orderData, order_date: date ? date.toISOString() : null })
              }
              disabled={isReadOnly}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                  sx: { mb: "0px" },
                },
              }}
              format="dd/MM/yyyy"
            />
          </LocalizationProvider>
        </Grid>

        <Grid size={12}>
          <FormControl fullWidth size="small">
            <InputLabel id="order-status-label">
              {t("orders.orderStatus")}
            </InputLabel>
            <Select
              labelId="order-status-label"
              id="order-status"
              value={orderData?.status}
              label={t("orders.orderStatus")}
              onChange={(e) =>
                setOrderData({ ...orderData, status: e.target.value })
              }
              disabled={isReadOnly}
              size="small"
            >
              <MenuItem value="DRAFT">{t("orders.status.draft")}</MenuItem>
              <MenuItem value="PENDING_PAYMENT">
                {t("orders.status.pending_payment")}
              </MenuItem>
              <MenuItem value="PROCESSING">
                {t("orders.status.processing")}
              </MenuItem>
              <MenuItem value="AWAITING_FULFILLMENT">
                {t("orders.status.awaiting_fulfillment")}
              </MenuItem>
              <MenuItem value="PARTIALLY_SHIPPED">
                {t("orders.status.partially_shipped")}
              </MenuItem>
              <MenuItem value="SHIPPED">{t("orders.status.shipped")}</MenuItem>
              <MenuItem value="DELIVERED">
                {t("orders.status.delivered")}
              </MenuItem>
              <MenuItem value="COMPLETED">
                {t("orders.status.completed")}
              </MenuItem>
              <MenuItem value="CANCELLED">
                {t("orders.status.cancelled")}
              </MenuItem>
              <MenuItem value="ON_HOLD">{t("orders.status.on_hold")}</MenuItem>
              <MenuItem value="BACKORDERED">
                {t("orders.status.backordered")}
              </MenuItem>
              <MenuItem value="REFUNDED">
                {t("orders.status.refunded")}
              </MenuItem>
              <MenuItem value="PARTIALLY_REFUNDED">
                {t("orders.status.partially_refunded")}
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={12}>
          <Autocomplete
            id="responsible-person"
            options={staffUsers?.users || []}
            loading={isLoadingStaffUsers}
            getOptionLabel={(option) => option.full_name}
            value={
              (staffUsers?.users || []).find(
                (user: any) => user.id === orderData?.responsible_person
              ) || null
            }
            onChange={(_, newValue) =>
              setOrderData({ ...orderData, responsible_person: newValue?.id })
            }
            disabled={isReadOnly}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("orders.responsiblePerson")}
                size="small"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {isLoadingStaffUsers ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderSettings;
