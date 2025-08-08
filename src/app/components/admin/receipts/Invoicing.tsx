import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  InputBase,
  Link,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";

// Reusable Currency Input Component
interface CurrencyInputProps {
  value: number | string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputProps?: any;
  currency?: string;
  sx?: any;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  disabled = false,
  inputProps = {},
  currency = "₹",
  sx = {},
}) => {
  return (
    <InputBase
      type="number"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      disabled={disabled}
      inputProps={inputProps}
      startAdornment={
        <InputAdornment position="start">
          <Typography variant="body2" color="text.secondary">
            {currency}
          </Typography>
        </InputAdornment>
      }
      sx={{
        width: 120,
        height: 32,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: "4px",
        px: 1,
        fontSize: "0.875rem",
        "&:hover": {
          borderColor: "primary.main",
        },
        "&.Mui-focused": {
          borderColor: "primary.main",
          outline: "none",
        },
        ...sx,
      }}
    />
  );
};

// Indian Number Formatting Function
const formatIndianCurrency = (amount: number): string => {
  if (amount === 0) return "0";

  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  // Convert to string and split by decimal
  const [integerPart, decimalPart] = absoluteAmount.toString().split(".");

  // Format integer part with Indian numbering system
  let formattedInteger = "";
  const length = integerPart.length;

  if (length <= 3) {
    formattedInteger = integerPart;
  } else {
    // Add commas from right to left
    let remaining = integerPart;

    // First group of 3 digits from right
    formattedInteger = remaining.slice(-3);
    remaining = remaining.slice(0, -3);

    // Then groups of 2 digits
    while (remaining.length > 0) {
      if (remaining.length <= 2) {
        formattedInteger = remaining + "," + formattedInteger;
        break;
      } else {
        formattedInteger = remaining.slice(-2) + "," + formattedInteger;
        remaining = remaining.slice(0, -2);
      }
    }
  }

  // Add decimal part if exists
  let result = formattedInteger;
  if (decimalPart) {
    result += "." + decimalPart;
  }

  return isNegative ? "-" + result : result;
};

interface UnpaidInvoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  payment_methods: number[];
  payment_status: string;
}

interface InvoiceSettlement {
  invoiceId: number;
  amountSettled: number;
  tdsAmount: number;
  isTdsApplied: boolean;
}

interface InvoicingProps {
  data: any;
  unpaidInvoices: {
    unpaid_invoices: UnpaidInvoice[];
  };
  isReadOnly?: boolean;
  setData?: (data: any) => void;
  showError?: (message: string) => void;
}

const Invoicing: React.FC<InvoicingProps> = ({
  data,
  unpaidInvoices,
  isReadOnly = false,
  setData,
  showError,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const currency = "₹";

  // Get settlements from parent data or initialize empty array
  // Only selected invoices are stored in settlements
  const settlements = data?.invoice_settlements || [];

  // Initialize settlements as empty array when unpaid invoices change
  useEffect(() => {
    if (
      unpaidInvoices?.unpaid_invoices &&
      setData &&
      !data?.invoice_settlements
    ) {
      // Start with empty settlements - only selected invoices will be added
      setData({
        ...data,
        invoice_settlements: [],
      });
    }
  }, [unpaidInvoices, data, setData]);

  // Don't render if no account is selected
  if (!data?.account_id || !unpaidInvoices?.unpaid_invoices) {
    return null;
  }

  const filteredInvoices = unpaidInvoices.unpaid_invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (!setData) return;
    if (
      (!data?.amount_received || parseFloat(data.amount_received) <= 0) &&
      showError
    ) {
      showError("Please type in a valid amount received!");
      return;
    }

    let updatedSettlements: InvoiceSettlement[];

    if (checked) {
      // Select all: create settlements for all filtered invoices
      updatedSettlements = filteredInvoices.map((invoice) => {
        // Check if settlement already exists
        const existingSettlement = settlements.find(
          (s: InvoiceSettlement) => s.invoiceId === invoice.id
        );

        return existingSettlement
          ? {
              ...existingSettlement,
              amountSettled: invoice.amount_due,
            }
          : {
              invoiceId: invoice.id,
              amountSettled: invoice.amount_due,
              tdsAmount: 0,
              isTdsApplied: false,
            };
      });
    } else {
      // Deselect all: remove all filtered invoices from settlements
      const filteredInvoiceIds = filteredInvoices.map((inv) => inv.id);
      updatedSettlements = settlements.filter(
        (settlement: any) => !filteredInvoiceIds.includes(settlement.invoiceId)
      );
    }

    setData({
      ...data,
      invoice_settlements: updatedSettlements,
    });
  };

  const handleRowSelect = (invoiceId: number, checked: boolean) => {
    if (!setData) return;
    if (
      (!data?.amount_received || parseFloat(data.amount_received) <= 0) &&
      showError
    ) {
      showError("Please type in a valid amount received!");
      return;
    }

    let updatedSettlements: InvoiceSettlement[];

    if (checked) {
      // Add invoice to settlements if not already present
      const existingSettlement = settlements.find(
        (s: InvoiceSettlement) => s.invoiceId === invoiceId
      );

      if (existingSettlement) {
        // Update existing settlement
        const invoice = unpaidInvoices.unpaid_invoices.find(
          (inv) => inv.id === invoiceId
        );
        updatedSettlements = settlements.map((settlement: any) =>
          settlement.invoiceId === invoiceId
            ? {
                ...settlement,
                amountSettled: invoice?.amount_due || 0,
              }
            : settlement
        );
      } else {
        // Add new settlement
        const invoice = unpaidInvoices.unpaid_invoices.find(
          (inv) => inv.id === invoiceId
        );
        updatedSettlements = [
          ...settlements,
          {
            invoiceId,
            amountSettled: invoice?.amount_due || 0,
            tdsAmount: 0,
            isTdsApplied: false,
          },
        ];
      }
    } else {
      // Remove invoice from settlements
      updatedSettlements = settlements.filter(
        (settlement: any) => settlement.invoiceId !== invoiceId
      );
    }

    setData({
      ...data,
      invoice_settlements: updatedSettlements,
    });
  };

  const handleAmountSettledChange = (invoiceId: number, value: string) => {
    if (!setData) return;

    const numValue = parseFloat(value) || 0;
    const invoice = unpaidInvoices.unpaid_invoices.find(
      (inv) => inv.id === invoiceId
    );
    const maxAmount = invoice?.amount_due || 0;

    // Don't allow amount to exceed amount_due
    const finalAmount = Math.min(numValue, maxAmount);

    // Only update if the invoice settlement exists (i.e., is selected)
    const existingSettlement = settlements.find(
      (s: any) => s.invoiceId === invoiceId
    );
    if (!existingSettlement) return; // Should not happen, but safety check

    const updatedSettlements = settlements.map((settlement: any) =>
      settlement.invoiceId === invoiceId
        ? { ...settlement, amountSettled: finalAmount }
        : settlement
    );

    setData({
      ...data,
      invoice_settlements: updatedSettlements,
    });
  };

  const getSettlement = (invoiceId: number) => {
    const settlement = settlements.find(
      (s: InvoiceSettlement) => s.invoiceId === invoiceId
    );

    // If settlement exists, it means the invoice is selected
    if (settlement) {
      return settlement;
    }

    // If no settlement found, return default unselected state
    return {
      invoiceId,
      amountSettled: 0,
      tdsAmount: 0,
      isTdsApplied: false,
    };
  };

  // Helper function to check if an invoice is selected
  const isInvoiceSelected = (invoiceId: number) => {
    return settlements.some((s: any) => s.invoiceId === invoiceId);
  };

  // TDS Functions
  const handleTdsToggle = (invoiceId: number) => {
    if (!setData) return;

    // Only allow TDS toggle for selected invoices
    const existingSettlement = settlements.find(
      (s: any) => s.invoiceId === invoiceId
    );
    if (!existingSettlement) return;

    const updatedSettlements = settlements.map((settlement: any) =>
      settlement.invoiceId === invoiceId
        ? {
            ...settlement,
            isTdsApplied: !settlement.isTdsApplied,
            tdsAmount: !settlement.isTdsApplied ? 0 : settlement.tdsAmount,
          }
        : settlement
    );

    setData({
      ...data,
      invoice_settlements: updatedSettlements,
    });
  };

  const handleTdsAmountChange = (invoiceId: number, value: string) => {
    if (!setData) return;

    // Only allow TDS amount change for selected invoices
    const existingSettlement = settlements.find(
      (s: any) => s.invoiceId === invoiceId
    );
    if (!existingSettlement) return;

    const numValue = parseFloat(value) || 0;
    const invoice = unpaidInvoices.unpaid_invoices.find(
      (inv) => inv.id === invoiceId
    );
    const maxTdsAmount = ((invoice?.amount_due || 0) * 30) / 100;
    const finalAmount = Math.min(numValue, maxTdsAmount);

    const updatedSettlements = settlements.map(
      (settlement: InvoiceSettlement) =>
        settlement.invoiceId === invoiceId
          ? { ...settlement, tdsAmount: finalAmount }
          : settlement
    );

    setData({
      ...data,
      invoice_settlements: updatedSettlements,
    });
  };

  // All settlements are now selected by definition (only selected invoices are stored)
  const selectedSettlements = settlements;
  const totalAmountDue = selectedSettlements.reduce(
    (sum: number, settlement: InvoiceSettlement) => {
      const invoice = unpaidInvoices.unpaid_invoices.find(
        (inv) => inv.id === settlement.invoiceId
      );
      return sum + (invoice?.amount_due || 0);
    },
    0
  );
  const totalAmountSettled = selectedSettlements.reduce(
    (sum: number, settlement: InvoiceSettlement) => {
      const amount = parseFloat(settlement.amountSettled.toString()) || 0;
      return sum + amount;
    },
    0
  );
  const totalTdsAmount = selectedSettlements.reduce(
    (sum: number, settlement: InvoiceSettlement) => {
      const tdsAmount = settlement.isTdsApplied
        ? parseFloat(settlement.tdsAmount.toString()) || 0
        : 0;
      return sum + tdsAmount;
    },
    0
  );

  const allSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((invoice: UnpaidInvoice) =>
      isInvoiceSelected(invoice.id)
    );

  const someSelected = filteredInvoices.some((invoice: UnpaidInvoice) =>
    isInvoiceSelected(invoice.id)
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6">Settle invoices with this payment</Typography>
        <TextField
          placeholder="Search Invoice Number"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 250 }}
        />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={isReadOnly}
                />
              </TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Invoice Number</TableCell>
              <TableCell>Invoice Amount</TableCell>
              <TableCell>Amount Settled</TableCell>
              <TableCell>TDS Deduction</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map((invoice) => {
              const settlement = getSettlement(invoice.id);
              return (
                <TableRow key={invoice.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isInvoiceSelected(invoice.id)}
                      onChange={(e) =>
                        handleRowSelect(invoice.id, e.target.checked)
                      }
                      disabled={isReadOnly}
                    />
                  </TableCell>
                  <TableCell>{invoice.due_date}</TableCell>
                  <TableCell>{invoice.invoice_number}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {currency} {formatIndianCurrency(invoice.total_amount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({currency} {formatIndianCurrency(invoice.amount_due)}{" "}
                        pending)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <CurrencyInput
                      value={settlement.amountSettled}
                      onChange={(value) =>
                        handleAmountSettledChange(invoice.id, value)
                      }
                      disabled={isReadOnly}
                      inputProps={{
                        min: 0,
                        max: invoice.amount_due,
                        step: "0.01",
                      }}
                      currency={currency}
                    />
                  </TableCell>
                  <TableCell>
                    {settlement.isTdsApplied ? (
                      <CurrencyInput
                        value={settlement.tdsAmount}
                        onChange={(value) =>
                          handleTdsAmountChange(invoice.id, value)
                        }
                        disabled={isReadOnly}
                        inputProps={{
                          min: 0,
                          max: (invoice.amount_due * 30) / 100,
                          step: "0.01",
                        }}
                        currency={currency}
                        sx={{ width: 100 }}
                      />
                    ) : (
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleTdsToggle(invoice.id)}
                        disabled={isReadOnly}
                        sx={{
                          color: "primary.main",
                          textDecoration: "underline",
                          cursor: "pointer",
                          border: "none",
                          background: "none",
                          "&:hover": {
                            textDecoration: "none",
                          },
                        }}
                      >
                        Apply TDS
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInvoices.length > 0 && (
              <TableRow sx={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                <TableCell colSpan={3}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Total
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {currency} {formatIndianCurrency(totalAmountDue)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {currency} {formatIndianCurrency(totalAmountSettled)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {currency} {formatIndianCurrency(totalTdsAmount)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Invoicing;
