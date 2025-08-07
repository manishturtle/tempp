import React, { useEffect } from "react";
import {
  Grid,
  Typography,
  TextField,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  InputLabel,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { OrderMode } from "@/app/types/order";
import { useTranslation } from "react-i18next";
import { parseISO, addDays } from "date-fns";

interface PaymentDetailsProps {
  mode: OrderMode;
  invoiceData: any;
  setInvoiceData: (data: any) => void;
}

/**
 * Component for managing payment details
 * Includes Payment Status, Payment Terms Label, Payment Terms, and Due Date
 */
const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  mode,
  invoiceData,
  setInvoiceData,
}) => {
  const { t } = useTranslation();

  // Helper to determine if fields should be readonly
  const isReadOnly = mode === OrderMode.VIEW;

  // Payment status options
  const paymentStatusOptions = [
    { value: "UNPAID", label: t("invoices.paymentStatus.unpaid", "Unpaid") },
    { value: "PAID", label: t("invoices.paymentStatus.paid", "Paid") },
    { value: "OVERDUE", label: t("invoices.paymentStatus.overdue", "Overdue") },
  ];

  const handleFieldChange = (field: string, value: any) => {
    setInvoiceData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (field: string, date: Date | null) => {
    if (date) {
      handleFieldChange(field, date.toISOString());
    }
  };

  // Auto-calculate due date when payment terms change
  useEffect(() => {
    if (invoiceData?.payment_terms && invoiceData?.issue_date) {
      const issueDate = new Date(invoiceData.issue_date);
      const paymentTerms = parseInt(invoiceData.payment_terms) || 0;
      const dueDate = addDays(issueDate, paymentTerms);
      handleFieldChange("due_date", dueDate.toISOString());
    }
  }, [invoiceData?.payment_terms, invoiceData?.issue_date]);

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
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {t("invoices.payment.title", "Payment Details")}
      </Typography>

      <Grid container spacing={2}>
        {/* Payment Status */}
        {/* <Grid size={12}>
          <FormControl fullWidth size="small" disabled={isReadOnly}>
            <InputLabel>
              {t("invoices.fields.paymentStatus", "Payment Status")}
            </InputLabel>
            <Select
              value={invoiceData?.payment_status || "UNPAID"}
              onChange={(e) =>
                handleFieldChange("payment_status", e.target.value)
              }
              label={t("invoices.fields.paymentStatus", "Payment Status")}
            >
              {paymentStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid> */}

        {/* Payment Terms Label */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={t(
              "invoices.fields.paymentTermsLabel",
              "Payment Terms Label"
            )}
            value={invoiceData?.payment_terms_label || ""}
            onChange={(e) =>
              handleFieldChange("payment_terms_label", e.target.value)
            }
            fullWidth
            size="small"
            disabled={isReadOnly}
            variant="outlined"
            placeholder={t(
              "invoices.placeholders.paymentTermsLabel",
              "e.g., Net 30, Due on receipt"
            )}
            sx={{ mb: "0px" }}
          />
        </Grid>

        {/* Payment Terms */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={t("invoices.fields.paymentTerms", "Payment Terms")}
            type="number"
            value={invoiceData?.payment_terms || ""}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow positive numbers
              if (value === "" || parseInt(value) >= 0) {
                handleFieldChange("payment_terms", value);
              }
            }}
            fullWidth
            size="small"
            disabled={isReadOnly}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {t("invoices.units.days", "day(s)")}
                </InputAdornment>
              ),
            }}
            inputProps={{
              min: 0,
              step: 1,
              onWheel: (e) => e.preventDefault(), // Disable scroll to change value
            }}
            sx={{ mb: "0px" }}
          />
        </Grid>

        {/* Due Date */}
        <Grid size={12}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("invoices.fields.dueDate", "Due Date")}
              value={
                invoiceData?.due_date
                  ? parseISO(invoiceData.due_date)
                  : new Date()
              }
              onChange={(date) => handleDateChange("due_date", date)}
              disabled={isReadOnly}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                  variant: "outlined",
                  sx: { mb: "0px" },
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PaymentDetails;
