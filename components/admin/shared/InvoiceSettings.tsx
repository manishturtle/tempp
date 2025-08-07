import React from "react";
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
  FormHelperText,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { OrderMode } from "@/app/types/order";
import { useTranslation } from "react-i18next";
import { parseISO } from "date-fns";

interface InvoiceSettingsProps {
  mode: OrderMode;
  invoiceData: any;
  setInvoiceData: (data: any) => void;
  staffUsers?: any[];
  loading?: boolean;
  numType?: string;
  paymentTerms?: any[];
  allowBackDatedInvoiceGeneration?: boolean;
}

/**
 * Component for managing invoice settings
 * Includes Invoice Number, Reference Number, Issue Date, Invoice Status, and Invoice Type
 */
const InvoiceSettings: React.FC<InvoiceSettingsProps> = ({
  mode,
  invoiceData,
  setInvoiceData,
  staffUsers,
  loading,
  numType,
  paymentTerms,
  allowBackDatedInvoiceGeneration,
}) => {
  const { t } = useTranslation();

  // Helper to determine if fields should be readonly
  const isReadOnly = mode === OrderMode.VIEW;

  // Invoice type options
  const invoiceTypeOptions = [
    { value: "STANDARD", label: t("invoices.type.standard", "Standard") },
    { value: "PROFORMA", label: t("invoices.type.proforma", "Proforma") },
    {
      value: "SALES_RECEIPT",
      label: t("invoices.type.salesReceipt", "Sales Receipt"),
    },
    { value: "RECURRING", label: t("invoices.type.recurring", "Recurring") },
  ];

  // Invoice status options
  const invoiceStatusOptions = [
    { value: "DRAFT", label: t("invoices.status.draft", "Draft") },
    { value: "ISSUED", label: t("invoices.status.issued", "Issued") },
    { value: "CANCELLED", label: t("invoices.status.cancelled", "Cancelled") },
  ];

  // GST treatment options
  const gstTreatmentOptions = [
    {
      value: "BUSINESS_GST",
      label: t("invoices.gstTreatment.businessGst", "Business GST"),
    },
    {
      value: "CONSUMER",
      label: t("invoices.gstTreatment.consumer", "Consumer"),
    },
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

  const isAutomaticNumbering = numType === "AUTOMATIC";
  const allowPastIssueDates =
    allowBackDatedInvoiceGeneration && mode.toLowerCase() === OrderMode.CREATE;

  console.log("allowPastIssueDates", allowPastIssueDates);

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
        {t("invoices.settings.title", "Invoice Settings")}
      </Typography>

      <Grid container spacing={2}>
        {/* Invoice Number */}
        {!isAutomaticNumbering && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={t("invoices.fields.invoiceNumber", "Invoice Number")}
              value={invoiceData?.invoice_number || ""}
              onChange={(e) =>
                handleFieldChange("invoice_number", e.target.value)
              }
              fullWidth
              size="small"
              disabled={isReadOnly}
              variant="outlined"
              sx={{ mb: "0px" }}
            />
          </Grid>
        )}

        {/* Reference Number */}
        <Grid size={{ xs: 12, sm: !isAutomaticNumbering ? 6 : 12 }}>
          <TextField
            label={t("invoices.fields.referenceNumber", "Reference Number")}
            value={invoiceData?.reference_number || ""}
            onChange={(e) =>
              handleFieldChange("reference_number", e.target.value)
            }
            fullWidth
            size="small"
            disabled={isReadOnly}
            variant="outlined"
            sx={{ mb: "0px" }}
          />
        </Grid>

        {/* Issue Date */}
        <Grid size={12}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("invoices.fields.issueDate", "Issue Date")}
              value={
                invoiceData?.issue_date
                  ? parseISO(invoiceData.issue_date)
                  : new Date()
              }
              onChange={(date) => handleDateChange("issue_date", date)}
              disabled={isReadOnly}
              format="dd/MM/yyyy"
              minDate={allowPastIssueDates ? undefined : new Date()}
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

        {/* Invoice Type */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" disabled={isReadOnly}>
            <InputLabel>
              {t("invoices.fields.invoiceType", "Invoice Type")}
            </InputLabel>
            <Select
              value={invoiceData?.invoice_type || "STANDARD"}
              onChange={(e) =>
                handleFieldChange("invoice_type", e.target.value)
              }
              label={t("invoices.fields.invoiceType", "Invoice Type")}
            >
              {invoiceTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Invoice Status */}
        {/* <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" disabled={isReadOnly}>
            <InputLabel>
              {t("invoices.fields.invoiceStatus", "Invoice Status")}
            </InputLabel>
            <Select
              value={invoiceData?.invoice_status || "DRAFT"}
              onChange={(e) =>
                handleFieldChange("invoice_status", e.target.value)
              }
              label={t("invoices.fields.invoiceStatus", "Invoice Status")}
            >
              {invoiceStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid> */}

        {/* GST Treatment */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small" disabled={isReadOnly}>
            <InputLabel>
              {t("invoices.fields.gstTreatment", "GST Treatment")}
            </InputLabel>
            <Select
              value={invoiceData?.gst_treatment || "DRAFT"}
              onChange={(e) =>
                handleFieldChange("gst_treatment", e.target.value)
              }
              label={t("invoices.fields.gstTreatment", "GST Treatment")}
            >
              {gstTreatmentOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={12}>
          <Autocomplete
            id="responsible-person"
            options={staffUsers?.users || []}
            loading={loading}
            getOptionLabel={(option) => option.full_name}
            value={
              (staffUsers?.users || []).find(
                (user: any) => user.id === invoiceData?.responsible_person
              ) || null
            }
            onChange={(_, newValue) =>
              setInvoiceData({
                ...invoiceData,
                responsible_person: newValue?.id,
              })
            }
            disabled={isReadOnly}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("orders.responsiblePerson")}
                size="small"
                fullWidth
                sx={{ mb: "0px" }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? (
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
        <Grid size={12}>
          <FormControl fullWidth size="small" disabled={isReadOnly}>
            <InputLabel>
              {t("invoices.fields.paymentTermsLabel", "Payment Terms")}
            </InputLabel>
            <Select
              value={invoiceData?.payment_terms_label}
              onChange={(e) => {
                const selectedLabel = e.target.value;
                const selectedTerm = paymentTerms?.find(
                  (term: any) => term.label === selectedLabel
                );

                // Update payment terms label
                handleFieldChange("payment_terms_label", selectedLabel);

                // Update payment terms days (except for Custom)
                if (selectedTerm && selectedLabel !== "Custom") {
                  handleFieldChange(
                    "payment_terms",
                    selectedTerm.days.toString()
                  );

                  // Calculate and update due date
                  if (invoiceData?.issue_date) {
                    const issueDate = new Date(invoiceData.issue_date);
                    const dueDate = new Date(issueDate);
                    dueDate.setDate(dueDate.getDate() + selectedTerm.days);
                    handleFieldChange("due_date", dueDate.toISOString());
                  }
                } else if (selectedLabel === "Custom") {
                  handleFieldChange("payment_terms", "0");
                }
              }}
              label={t("invoices.fields.paymentTermsLabel", "Payment Terms")}
              size="small"
            >
              {paymentTerms?.length === 0 ? (
                <MenuItem value="" disabled>
                  {t("noPaymentTermsFound", "No Payment Terms Found")}
                </MenuItem>
              ) : (
                paymentTerms?.map((option: any) => (
                  <MenuItem key={option.label} value={option.label}>
                    {option.label}
                  </MenuItem>
                ))
              )}
            </Select>
            {invoiceData?.due_date &&
              invoiceData?.payment_terms_label !== "Custom" && (
                <FormHelperText>
                  Due Date:{" "}
                  {new Date(invoiceData.due_date).toLocaleDateString("en-GB")}
                </FormHelperText>
              )}
          </FormControl>
        </Grid>
        {invoiceData?.payment_terms_label === "Custom" && (
          <Grid size={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label={t("invoices.fields.dueDate", "Due Date")}
                value={
                  invoiceData?.due_date ? new Date(invoiceData.due_date) : null
                }
                onChange={(date) => {
                  if (date && invoiceData?.issue_date) {
                    // Update due date
                    handleFieldChange("due_date", date.toISOString());

                    // Calculate payment terms (days difference)
                    const issueDate = new Date(invoiceData.issue_date);
                    const timeDifference = date.getTime() - issueDate.getTime();
                    const daysDifference = Math.ceil(
                      timeDifference / (1000 * 3600 * 24)
                    );

                    // Ensure non-negative payment terms
                    const paymentTerms = Math.max(0, daysDifference);
                    handleFieldChange("payment_terms", paymentTerms.toString());
                  } else if (date) {
                    // If no issue date, just set the due date
                    handleFieldChange("due_date", date.toISOString());
                  }
                }}
                disabled={isReadOnly}
                format="dd/MM/yyyy"
                minDate={
                  invoiceData?.issue_date
                    ? new Date(invoiceData.issue_date)
                    : new Date()
                }
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
        )}
      </Grid>
    </Box>
  );
};

export default InvoiceSettings;
