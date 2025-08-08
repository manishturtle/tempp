import React, { useState } from "react";
import {
  Grid,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { OrderMode } from "@/app/types/order";
import { useTranslation } from "react-i18next";

interface PaymentMethod {
  id: number;
  name: string;
  payment_type: string;
  payment_type_display: string;
  is_active: boolean;
  is_visible_on_store: boolean;
  description: string;
}

interface ReceiptDetailsProps {
  mode: OrderMode;
  paymentMethods: PaymentMethod[];
  isLoadingPaymentMethods: boolean;
  data: any;
  setData: (data: any) => void;
}

const ReceiptDetails: React.FC<ReceiptDetailsProps> = ({
  mode,
  paymentMethods,
  isLoadingPaymentMethods,
  data,
  setData,
}) => {
  const { t } = useTranslation();
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const isReadOnly = mode?.toLowerCase() === OrderMode.VIEW;
  const isCreateMode = mode?.toLowerCase() === OrderMode.CREATE;

  const getFilteredPaymentMethods = () => {
    if (isCreateMode) {
      // In create mode, only show active payment methods
      return paymentMethods.filter((method) => method.is_active);
    } else {
      // In edit/view mode, show all methods but mark inactive ones
      return paymentMethods;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (!method.is_active && !isCreateMode) {
      return `${method.name} (Inactive)`;
    }
    return method.name;
  };

  const handlePaymentMethodChange = (paymentMethod: PaymentMethod | null) => {
    setData({
      ...data,
      payment_method_id: paymentMethod?.id || null,
    });
  };

  const handleDateChange = (newDate: Date | null) => {
    setData({
      ...data,
      receipt_date: newDate ? newDate.toISOString() : null,
    });
  };

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id === data?.payment_method_id
  );

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
        {t("Receipt Details")}
      </Typography>

      <Grid container rowSpacing={2} columnSpacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("Receipt Date")}
              value={data?.receipt_date ? new Date(data.receipt_date) : null}
              onChange={handleDateChange}
              disabled={isReadOnly}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                  required: true,
                  sx: { mb: "0px" },
                },
              }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            id="payment-method-select"
            options={getFilteredPaymentMethods()}
            getOptionLabel={(option) => getPaymentMethodLabel(option)}
            value={selectedPaymentMethod || null}
            onChange={(_, newValue) => {
              handlePaymentMethodChange(newValue);
            }}
            loading={isLoadingPaymentMethods}
            disabled={isReadOnly}
            isOptionEqualToValue={(option, value) => option?.id === value?.id}
            getOptionKey={(option) => option?.id?.toString() || ""}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("Payment Method")}
                variant="outlined"
                size="small"
                sx={{ mb: "0px" }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingPaymentMethods ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                required
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            label={t("Reference Number")}
            variant="outlined"
            size="small"
            sx={{ mb: "0px" }}
            fullWidth
            onChange={(e) => {
              setData({
                ...data,
                reference_number: e.target.value,
              });
            }}
            value={data?.reference_number || ""}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid size={12}>
          {!isEditingNotes && (!data?.notes || data.notes.trim() === "") ? (
            <Typography
              variant="body2"
              color="primary"
              sx={{
                cursor: "pointer",
                mt: 1,
                mb: 1,
                opacity: isReadOnly ? 0.5 : 1,
              }}
              onClick={() => (isReadOnly ? null : setIsEditingNotes(true))}
            >
              +{" "}
              <span style={{ textDecoration: "underline" }}>
                {t("Add Notes")}
              </span>
            </Typography>
          ) : (
            <TextField
              label={t("Notes")}
              value={data?.notes || ""}
              onChange={(e) => {
                setData({
                  ...data,
                  notes: e.target.value,
                });
              }}
              onBlur={() => {
                if (!data?.notes || data.notes.trim() === "") {
                  setIsEditingNotes(false);
                }
              }}
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              placeholder={t(
                "Enter any additional notes or remarks for this receipt..."
              )}
              autoFocus
              sx={{ mb: "0px" }}
              disabled={isReadOnly}
              size="small"
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReceiptDetails;
