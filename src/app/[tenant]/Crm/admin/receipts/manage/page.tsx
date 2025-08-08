"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Backdrop,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { getAccountsList, getUnpaidInvoices } from "@/app/hooks/api/orders";
import {
  getAllPaymentMethods,
  getReceiptById,
  useCreateReceipt,
  useUpdateReceipt,
} from "@/app/hooks/api/receipts";
import BasicDetails from "@/app/components/admin/receipts/BasicDetails";
import ReceiptDetails from "@/app/components/admin/receipts/ReceiptDetails";
import Invoicing from "@/app/components/admin/receipts/Invoicing";
import { OrderMode } from "@/app/types/order";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";

const PaymentManagePage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const tenantSlug = typeof params?.tenant === "string" ? params.tenant : "";

  const [loading, setLoading] = useState(false);
  const { notification, showNotification, hideNotification, showError } =
    useNotification();
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    content: "",
    onConfirm: () => {},
  });
  const [correctionDialog, setCorrectionDialog] = useState({
    open: false,
    onConfirm: (reason: string) => {},
  });
  const [correctionReason, setCorrectionReason] = useState("");

  // API mutation hooks
  const createReceiptMutation = useCreateReceipt();
  const updateReceiptMutation = useUpdateReceipt();

  const mode = searchParams.get("mode") || "VIEW";
  const isReadOnly = mode === "VIEW";
  const receiptId = searchParams.get("id");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  const [unpaidInvoices, setUnpaidInvoices] = useState<any>({});
  const [isLoadingUnpaidInvoices, setIsLoadingUnpaidInvoices] = useState(false);

  const [data, setData] = useState<any>({
    account_id: null,
    account_name: "",
    account: null,
    amount_received: "",
    receipt_date: new Date().toISOString(),
    reference_number: "",
    payment_method_id: null,
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch accounts
      try {
        setIsLoadingAccounts(true);
        const accounts = await getAccountsList();
        setAccounts(accounts);
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setIsLoadingAccounts(false);
      }

      // Fetch payment methods
      try {
        setIsLoadingPaymentMethods(true);
        const paymentMethods = await getAllPaymentMethods();
        setPaymentMethods(paymentMethods);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
      } finally {
        setIsLoadingPaymentMethods(false);
      }
    };

    fetchData();
  }, []);

  // Fetch receipt details when in EDIT or VIEW mode with an ID
  useEffect(() => {
    if ((mode === "EDIT" || mode === "VIEW") && receiptId) {
      const fetchReceiptDetails = async () => {
        try {
          setLoading(true);
          const receiptDetails = await getReceiptById(parseInt(receiptId));

          const invoiceSettlements = receiptDetails.allocations.map(
            (allocation: any) => ({
              id: allocation.id,
              invoiceId: allocation.invoice,
              amountSettled: allocation.amount_applied,
              tdsAmount: allocation.tds_amount,
              isTdsApplied: allocation.show_tds,
            })
          );

          // Update the data state with fetched receipt details
          setData({
            account_id: receiptDetails.account_id || null,
            account_name: receiptDetails.account_name || "",
            account: receiptDetails.account || null,
            amount_received: receiptDetails.amount_received || "",
            receipt_date:
              receiptDetails.receipt_date || new Date().toISOString(),
            reference_number: receiptDetails.reference_number || "",
            payment_method_id: receiptDetails.payment_method_id || null,
            notes: receiptDetails.notes || "",
            invoice_settlements: invoiceSettlements || [],
          });
        } catch (error) {
          console.error("Error fetching receipt details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchReceiptDetails();
    }
  }, [mode, receiptId]);

  useEffect(() => {
    if (!data.account_id) {
      return;
    }

    const fetchUnpaidInvoices = async () => {
      try {
        setIsLoadingUnpaidInvoices(true);
        const unpaidInvoices = await getUnpaidInvoices(data.account_id);
        setUnpaidInvoices(unpaidInvoices);
      } catch (error) {
        console.error("Error fetching unpaid invoices:", error);
      } finally {
        setIsLoadingUnpaidInvoices(false);
      }
    };

    fetchUnpaidInvoices();
  }, [data.account_id]);

  const getTitle = () => {
    switch (mode) {
      case "Create":
        return t("Create Receipt");
      case "EDIT":
        return t("Edit Receipt");
      case "VIEW":
        return t("View Receipt");
      default:
        return t("View Receipt");
    }
  };

  const handleBack = () => {
    router.push(`/${tenantSlug}/Crm/admin/receipts`);
  };

  const performApiCall = async (newData: any) => {
    try {
      if (mode === "Create") {
        const result = await createReceiptMutation.mutateAsync(newData);
        if (result?.id) {
          router.push(`/${tenantSlug}/Crm/admin/receipts`);
        }
      } else if (mode === "EDIT" && receiptId) {
        const result = await updateReceiptMutation.mutateAsync({
          id: parseInt(receiptId),
          data: newData,
        });
        if (result?.corrected_receipt?.id) {
          router.push(`/${tenantSlug}/Crm/admin/receipts`);
        }
      }
    } catch (error) {
      console.error("Error saving receipt:", error);
      showError("Error saving receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateAndSave = async (newData: any) => {
    if (mode === "EDIT") {
      // Show correction reason dialog for EDIT mode
      setCorrectionDialog({
        open: true,
        onConfirm: async (reason: string) => {
          setCorrectionDialog({ ...correctionDialog, open: false });
          setCorrectionReason(""); // Reset reason after use

          // Add reason to the data being sent
          const dataWithReason = {
            ...newData,
            reason_for_correction: reason,
          };

          await performApiCall(dataWithReason);
        },
      });
    } else {
      // For CREATE mode, directly call API
      await performApiCall(newData);
    }
  };

  const handleSave = async () => {
    if (!data.account_id || !data.amount_received) {
      showError("Required fields missing. Please fill in all required fields.");
      return;
    }

    const { account, ...receiptData } = data;
    const newData = {
      ...receiptData,
      amount_received: parseFloat(parseFloat(data.amount_received).toFixed(2)),
      receipt_date: new Date(data.receipt_date).toISOString().split("T")[0],
    };

    // Calculate total amount settled from invoice settlements
    const totalAmountSettled = (newData.invoice_settlements || []).reduce(
      (sum: number, settlement: any) => {
        const amount = parseFloat(settlement.amountSettled?.toString()) || 0;
        return sum + amount;
      },
      0
    );

    const amountReceived = newData.amount_received;
    const difference = totalAmountSettled - amountReceived;

    // Check if total amount settled is greater than amount received
    if (difference > 0.01) {
      // Using 0.01 to handle floating point precision
      showError(
        `Total amount settled (₹${totalAmountSettled.toFixed(
          2
        )}) cannot be more than amount received (₹${amountReceived.toFixed(2)})`
      );
      return;
    }

    // Check if amounts are equal (proceed with save)
    if (Math.abs(difference) <= 0.01) {
      setLoading(true);
      await validateAndSave(newData);
      return;
    }

    // Amount settled is less than amount received - show confirmation dialog
    const pendingAmount = amountReceived - totalAmountSettled;
    setConfirmDialog({
      open: true,
      title: "Unallocated Funds",
      content: `Pending amount received is not accounted for (₹${pendingAmount.toFixed(
        2
      )}). This amount will be saved as unallocated funds. Do you want to continue?`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setLoading(true);
        await validateAndSave(newData);
      },
    });
  };

  const handleEdit = () => {
    router.push(`/${tenantSlug}/Crm/admin/receipts/manage?mode=EDIT`);
  };

  const renderButtons = () => {
    switch (mode) {
      case "Create":
      case "EDIT":
        return (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </Box>
        );
      case "VIEW":
        return (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button variant="contained" onClick={handleEdit}>
              Edit
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4">{getTitle()}</Typography>
          {renderButtons()}
        </Box>

        <Grid container rowSpacing={2} columnSpacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <BasicDetails
              mode={mode as OrderMode}
              accounts={accounts}
              isLoadingAccounts={isLoadingAccounts}
              data={data}
              setData={setData}
              unpaidInvoices={unpaidInvoices}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <ReceiptDetails
              mode={mode as OrderMode}
              paymentMethods={paymentMethods}
              isLoadingPaymentMethods={isLoadingPaymentMethods}
              data={data}
              setData={setData}
            />
          </Grid>
          <Grid size={12}>
            <Invoicing
              data={data}
              unpaidInvoices={unpaidInvoices}
              isReadOnly={isReadOnly}
              setData={setData}
              showError={showError}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Notification Component */}
      <Notification
        open={notification.open}
        message={notification.message}
        title={notification.title}
        severity={notification.severity}
        onClose={hideNotification}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />

      {/* Correction Reason Dialog */}
      <Dialog
        open={correctionDialog.open}
        onClose={() => {
          setCorrectionDialog({ ...correctionDialog, open: false });
          setCorrectionReason("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reason for Correction</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Please provide a reason for this correction"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            placeholder="Enter your reason for making this correction..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setCorrectionDialog({ ...correctionDialog, open: false });
              setCorrectionReason("");
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => correctionDialog.onConfirm(correctionReason)}
            variant="contained"
            color="primary"
            disabled={!correctionReason.trim()}
          >
            Confirm Correction
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentManagePage;
