"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useOrderDetailContext } from "@/app/contexts/OrderDetailContext";
import { useTranslation } from "react-i18next";
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Link as MuiLink,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import ReplayIcon from "@mui/icons-material/Replay";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import OrderProgressStepper from "@/app/components/Store/orderDetails/OrderProgressStepper";
import InfoCard from "@/app/components/Store/orderDetails/InfoCard";
import ReturnInitiationModal from "@/app/components/Store/returns/ReturnInitiationModal";
import {
  OrderDetail,
  OrderProgressStep,
  OrderRMASummary,
} from "@/app/types/store/orderTypes";
import { useUserOrderDetail } from "@/app/hooks/api/store/useUserOrderDetail";
import { useSubmitReturnRequest } from "@/app/hooks/api/store/useSubmitReturnRequest";
import { ReturnRequestPayload } from "@/app/hooks/api/store/rmaService";
import useNotification from "@/app/hooks/useNotification";

// You can uncomment this if needed for user-specific checks
// import { useAuthContext } from '@/app/auth/providers/AuthContext';

/**
 * User Order Detail Page
 *
 * Displays detailed information about a user's order
 * @returns React component
 */
export default function UserOrderDetailPage(): React.ReactElement {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();
  const params = useParams();
  const { orderDetailId } = useOrderDetailContext();

  // Get tenant slug from session storage or fallback to params
  const [tenantSlug, setTenantSlug] = React.useState<string>("");

  React.useEffect(() => {
    // Get tenant slug from session storage if available, otherwise use params
    const storedTenant =
      typeof window !== "undefined"
        ? sessionStorage.getItem("currentTenantSlug")
        : null;
    setTenantSlug(storedTenant || (params?.tenant as string) || "");
  }, [params?.tenant]);

  const {
    data: orderDetails,
    isLoading,
    isError,
    error,
  } = useUserOrderDetail(orderDetailId || "");
  const submitReturnMutation = useSubmitReturnRequest();
  const notification = useNotification();

  // State for return modal
  const [isReturnModalOpen, setReturnModalOpen] = useState<boolean>(false);

  // Prepare static return reasons
  const staticReturnReasons = [
    {
      id: "damaged",
      name: t("orders.returns.reasons.damaged"),
      description: t("orders.returns.reasonDescriptions.damaged"),
    },
    {
      id: "wrong_item",
      name: t("orders.returns.reasons.wrongItem"),
      description: t("orders.returns.reasonDescriptions.wrongItem"),
    },
    {
      id: "not_as_described",
      name: t("orders.returns.reasons.notAsDescribed"),
      description: t("orders.returns.reasonDescriptions.notAsDescribed"),
    },
    {
      id: "defective",
      name: t("orders.returns.reasons.defective"),
      description: t("orders.returns.reasonDescriptions.defective"),
    },
    {
      id: "no_longer_needed",
      name: t("orders.returns.reasons.noLongerNeeded"),
      description: t("orders.returns.reasonDescriptions.noLongerNeeded"),
    },
  ];

  // Prepare static preferred resolutions
  const staticPreferredResolutions = [
    {
      id: "refund",
      name: t("orders.returns.resolutions.refund"),
      description: t("orders.returns.resolutionDescriptions.refund"),
    },
    {
      id: "replacement",
      name: t("orders.returns.resolutions.replacement"),
      description: t("orders.returns.resolutionDescriptions.replacement"),
    },
    {
      id: "store_credit",
      name: t("orders.returns.resolutions.storeCredit"),
      description: t("orders.returns.resolutionDescriptions.storeCredit"),
    },
  ];

  // Function to handle initiating a return
  const handleInitiateReturn = (): void => {
    if (!orderDetails) return;

    if (orderDetails.canInitiateReturn) {
      setReturnModalOpen(true);
    } else {
      notification.showNotification({
        message: t("orders.detail.returns.cannotInitiate"),
        type: "error",
      });
    }
  };

  // Function to handle return request submission
  const handleReturnRequestSubmit = async (data: {
    itemsToReturn: Array<{
      itemId: string;
      quantity: number;
      reasonId: string;
    }>;
    comments?: string;
    preferredResolutionId?: string;
  }): Promise<void> => {
    try {
      // Create payload with order_id from context
      const payload: ReturnRequestPayload = {
        order_id: orderDetailId ? parseInt(orderDetailId, 10) : 0, // Convert to number and use snake_case
        items: data.itemsToReturn.map((item) => ({
          order_item_id: parseInt(item.itemId, 10), // Convert to number
          quantity: item.quantity,
          reason: item.reasonId,
        })),
        comments: data.comments,
        preferred_resolution_id: data.preferredResolutionId
          ? data.preferredResolutionId
          : undefined,
      };

      await submitReturnMutation.mutateAsync(payload);
      setReturnModalOpen(false); // Close modal on success
    } catch (error) {
      console.error("Failed to submit return request:", error);
      // Error handling is managed by the mutation hook
    }
  };

  // Determine status chip color based on order status
  const getStatusChipColor = (
    status?: string
  ):
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning" => {
    if (!status) return "default";

    switch (status) {
      case "delivered":
        return "success";
      case "shipped":
        return "info";
      case "processing":
        return "primary";
      case "cancelled":
        return "error";
      case "pending":
      case "pending_payment":
        return "warning";
      default:
        return "default";
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            {t("detail.loading")}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Render error state
  if (isError || !orderDetails) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
              startIcon={<ReplayIcon />}
            >
              {t("common.retry")}
            </Button>
          }
        >
          {error?.message || t("orders.detail.errorLoading")}
        </Alert>

        <Box sx={{ mt: 2 }}>
          <Button
            onClick={() => router.push(`/${tenantSlug}/store/account/orders`)}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            {t("orders.detail.backToOrders")}
          </Button>
        </Box>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: theme.spacing(4) }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ py: theme.spacing(4) }}>
        <Alert severity="error">
          {t(
            "orderDetail.errorLoading",
            "There was a problem loading the order details. Please try again later."
          )}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header Section */}
      <Box mb={theme.spacing(3)} mt={theme.spacing(2)}>
        {/* Back to Order History link */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={theme.spacing(2)}
        >
          <Link href={`/${tenantSlug}/store/account/orders`} passHref>
            <MuiLink
              sx={{
                display: "inline-flex",
                alignItems: "center",
                color: "primary.main",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} />
              {t("detail.backToHistory", "Back to Order History")}
            </MuiLink>
          </Link>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              size="small"
              onClick={() => window.print()}
            >
              {t("detail.printInvoice", "Print Invoice")}
            </Button>
            {/* <Button
              variant="contained"
              startIcon={<ReplayIcon />}
              size="small"
              color="primary"
            >
              {t('detail.reorder', 'Reorder')}
            </Button> */}
          </Stack>
        </Box>

        {/* Order Details Title */}
        <Box mb={theme.spacing(2)}>
          <Typography variant="h5" component="h1" fontWeight={500}>
            {t("detail.orderDetailsTitle", "Order Details")}
          </Typography>
        </Box>

        {/* Order Info and Status in Paper */}
        <Paper
          elevation={0}
          sx={{
            p: theme.spacing(3),
            mb: theme.spacing(3),
            border: `${theme.palette.mode === "dark" ? 1 : 1}px solid ${
              theme.palette.divider
            }`,
            borderRadius: theme.shape.borderRadius,
            justifyContent: "space-between",
            display: "flex",
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {/* {t('detail.orderIdLabel', 'Order ID:')} */}#
              {orderDetails.displayId}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {/* {t('detail.orderDateLabel', 'Order Date:')}  */}
              {orderDetails.date}
            </Typography>
          </Box>

          {/* Status */}
          <Box>
            <Chip
              label={t(orderDetails.statusTextKey, orderDetails.status)}
              color={getStatusChipColor(orderDetails.status)}
              size="small"
            />
          </Box>
        </Paper>
      </Box>

      {/* Order Progress Tracker */}
      <Box mb={theme.spacing(4)}>
        <Paper
          elevation={0}
          sx={{
            border: `${theme.palette.mode === "dark" ? 1 : 1}px solid ${
              theme.palette.divider
            }`,
            borderRadius: theme.shape.borderRadius,
          }}
        >
          <OrderProgressStepper steps={orderDetails.progressSteps} />
        </Paper>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3} mb={theme.spacing(4)}>
        {/* Left Column: Shipping & Billing Info */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Shipping Info Card */}
            <InfoCard
              titleKey={!isMobile ? "orders.detail.shippingInfoTitle" : ""}
            >
              {isMobile && (
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <LocalShippingOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
                  <Typography variant="h6" sx={{ mb: "0px" }}>
                    {t(
                      "orders.detail.shippingInfoTitle",
                      "Shipping Information"
                    )}
                  </Typography>
                </Box>
              )}
              <Typography variant="body1" fontWeight="medium">
                {orderDetails?.shippingAddress?.fullName}
              </Typography>

              <Typography variant="body2">
                {orderDetails?.shippingAddress?.addressLine1}
              </Typography>

              {orderDetails?.shippingAddress?.addressLine2 && (
                <Typography variant="body2">
                  {orderDetails?.shippingAddress?.addressLine2}
                </Typography>
              )}

              <Typography variant="body2">
                {orderDetails?.shippingAddress?.cityStateZipCountry}
              </Typography>

              <Typography variant="body2">
                {orderDetails?.shippingAddress?.phoneNumber}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2">
                {t("detail.shippingMethodLabel", "Shipping Method")}
              </Typography>

              <Typography variant="body2">
                {orderDetails?.shippingMethodName}
              </Typography>

              {orderDetails?.trackingNumber && (
                <>
                  <Typography variant="subtitle2" mt={1}>
                    {t(
                      "orders.detail.trackingInfoLabel",
                      "Tracking Information"
                    )}
                  </Typography>

                  <Typography variant="body2">
                    {orderDetails?.carrier}
                  </Typography>

                  <MuiLink
                    href={orderDetails?.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {orderDetails?.trackingNumber}
                  </MuiLink>
                </>
              )}
            </InfoCard>

            {/* Billing Information */}
            <InfoCard titleKey={!isMobile ? "detail.billingInfoTitle" : ""}>
              {isMobile && (
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <PaymentOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
                  <Typography variant="h6" sx={{ mb: "0px" }}>
                    {t("detail.billingInfoTitle", "Billing Information")}
                  </Typography>
                </Box>
              )}
              {orderDetails?.sameShippingAndBilling ? (
                <Typography variant="body1">
                  {t("detail.sameAsShipping", "Same as shipping address")}
                </Typography>
              ) : (
                <>
                  <Typography variant="body1" fontWeight="medium">
                    {orderDetails?.billingAddress?.fullName}
                  </Typography>

                  <Typography variant="body2">
                    {orderDetails?.billingAddress?.addressLine1}
                  </Typography>

                  {orderDetails?.billingAddress?.addressLine2 && (
                    <Typography variant="body2">
                      {orderDetails?.billingAddress?.addressLine2}
                    </Typography>
                  )}

                  <Typography variant="body2">
                    {orderDetails?.billingAddress?.cityStateZipCountry}
                  </Typography>

                  <Typography variant="body2">
                    {orderDetails?.billingAddress?.phoneNumber}
                  </Typography>
                </>
              )}
            </InfoCard>

            {/* Payment Method */}
            <InfoCard titleKey="orders.detail.paymentMethodTitle">
              <Stack direction="row" spacing={1} alignItems="center">
                <CreditCardIcon color="action" />
                <Typography variant="body1">
                  {orderDetails?.paymentMethod?.displayName}
                </Typography>
              </Stack>
            </InfoCard>
          </Stack>
        </Grid>

        {/* Right Column: Order Items & Summary */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Order Items Card */}
            <InfoCard
              titleKey={!isMobile ? "orders.detail.itemsOrderedTitle" : ""}
            >
              {isMobile && (
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">
                    {t("orders.detail.itemsOrderedTitle", "Items Ordered")}
                  </Typography>
                </Box>
              )}
              {isMobile ? (
                // Mobile card-based layout
                <Stack spacing={2}>
                  {orderDetails?.items?.map((item) => (
                    <Paper
                      key={item.id}
                      elevation={0}
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.shape.borderRadius,
                        overflow: "hidden",
                        display: "flex",
                      }}
                    >
                      {/* Image - full height of card */}
                      <Box
                        sx={{
                          width: 100,
                          minHeight: 100,
                          bgcolor: theme.palette.grey[50],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Avatar
                          src={item.image_url}
                          variant="rounded"
                          alt={item.name}
                          sx={{
                            width: 80,
                            height: 80,
                            "& img": { objectFit: "contain" },
                          }}
                        />
                      </Box>

                      {/* Content */}
                      <Box sx={{ p: 1.5, flexGrow: 1 }}>
                        {/* Title/Name with quantity chip */}
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            variant="subtitle1"
                            fontWeight="medium"
                            sx={{ flexGrow: 1 }}
                          >
                            {item.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${item.quantity}`}
                            color="primary"
                            variant="outlined"
                            sx={{ height: 24, minWidth: 32 }}
                          />
                        </Box>

                        {/* Quantity and Price */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mt: 1.5,
                            pt: 1,
                            borderTop: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography variant="body2">
                            {t("orders.detail.total", "Total")}:
                          </Typography>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {item.lineTotalFormatted}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                // Desktop table layout
                <TableContainer>
                  <Table size="small" aria-label="order items table">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {t("orders.detail.itemTableHeader.item", "Item")}
                        </TableCell>
                        <TableCell>
                          {t("orders.detail.itemTableHeader.sku", "SKU")}
                        </TableCell>
                        <TableCell align="center">
                          {t("orders.detail.itemTableHeader.qty", "Qty")}
                        </TableCell>
                        <TableCell align="right">
                          {t("orders.detail.itemTableHeader.price", "Price")}
                        </TableCell>
                        <TableCell align="right">
                          {t("orders.detail.itemTableHeader.total", "Total")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderDetails?.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                            >
                              <Avatar
                                src={item.image_url}
                                variant="rounded"
                                alt={item.name}
                                sx={{ width: 40, height: 40 }}
                              />
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {item.variantInfo}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {item.unitPriceFormatted}
                          </TableCell>
                          <TableCell align="right">
                            {item.lineTotalFormatted}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </InfoCard>

            {/* Order Summary Card */}
            <InfoCard titleKey="orders.detail.orderSummaryTitle">
              <Stack spacing={1}>
                {/* Subtotal */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1">
                    {t("orders.detail.summary.subtotal", "Subtotal")}
                  </Typography>
                  <Typography variant="body1">
                    {orderDetails?.totals?.subtotalFormatted}
                  </Typography>
                </Stack>

                {/* Shipping */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1">
                    {t("orders.detail.summary.shipping", "Shipping")}
                  </Typography>
                  <Typography variant="body1">
                    {orderDetails?.totals?.shippingFormatted}
                  </Typography>
                </Stack>

                {/* Tax */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1">
                    {t("orders.detail.summary.tax", "Tax")}
                  </Typography>
                  <Typography variant="body1">
                    {orderDetails?.totals?.taxFormatted}
                  </Typography>
                </Stack>

                {/* Discount */}
                {orderDetails?.totals?.discountAmount && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body1">
                      {t(
                        "orders.detail.summary.discount",
                        "Discount ({{code}})",
                        { code: orderDetails?.totals?.discountCode }
                      )}
                    </Typography>
                    <Typography variant="body1" color="error.main">
                      {orderDetails?.totals?.discountAmountFormatted}
                    </Typography>
                  </Stack>
                )}

                {/* Loyalty Points */}
                {orderDetails?.totals?.loyaltyPointsUsed && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body1">
                      {t(
                        "orders.detail.summary.loyalty",
                        "Loyalty Points Applied"
                      )}
                    </Typography>
                    <Typography variant="body1" color="error.main">
                      {orderDetails?.totals?.loyaltyPointsUsedFormatted}
                    </Typography>
                  </Stack>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Grand Total */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">
                    {t("orders.detail.summary.grandTotal", "Grand Total")}
                  </Typography>
                  <Typography variant="h6">
                    {orderDetails?.totals?.grandTotalFormatted}
                  </Typography>
                </Stack>
              </Stack>
            </InfoCard>

            {/* Returns Section */}

            <InfoCard titleKey="orders.detail.returns.title">
              <Box>
                {/* Return Button and Instructions */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={orderDetails?.existingRmas?.length ? theme.spacing(3) : 0}
                >
                  <Typography variant="body1">
                    {orderDetails?.existingRmas?.length
                      ? t(
                          "orders.detail.returns.returnsExist",
                          "You have existing return requests for this order."
                        )
                      : t(
                          "orders.detail.returns.noReturnsInitiated",
                          "No returns have been initiated for this order."
                        )}
                  </Typography>

                  {/* Show return button if status is DELIVERED or canInitiateReturn is true */}
                  {orderDetails &&
                    (orderDetails.status === "DELIVERED" ||
                      orderDetails.canInitiateReturn === true) && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleInitiateReturn}
                        disabled={submitReturnMutation.isPending}
                      >
                        {t(
                          "orders.detail.returns.initiateReturnButton",
                          "Initiate Return"
                        )}
                      </Button>
                    )}
                </Box>

                {/* Existing Returns */}
                {orderDetails?.existingRmas &&
                  orderDetails.existingRmas.length > 0 && (
                    <>
                      <Typography variant="subtitle1" mt={2} mb={1}>
                        {t(
                          "orders.detail.returns.existingReturnsTitle",
                          "Existing Returns"
                        )}
                      </Typography>

                      <TableContainer>
                        <Table size="small" aria-label="returns table">
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                {t(
                                  "orders.detail.returns.rmaNumber",
                                  "RMA Number"
                                )}
                              </TableCell>
                              <TableCell>
                                {t(
                                  "orders.detail.returns.dateRequested",
                                  "Date Requested"
                                )}
                              </TableCell>
                              <TableCell>
                                {t("orders.detail.returns.status", "Status")}
                              </TableCell>
                              <TableCell>
                                {t("orders.detail.returns.items", "Items")}
                              </TableCell>
                              <TableCell>
                                {t(
                                  "orders.detail.returns.resolution",
                                  "Resolution"
                                )}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orderDetails.existingRmas.map((rma) => (
                              <TableRow key={rma.id}>
                                <TableCell>
                                  <Link
                                    href={`/store/account/returns/${rma.id}`}
                                    passHref
                                  >
                                    <MuiLink sx={{ textDecoration: "none" }}>
                                      {rma.displayId}
                                    </MuiLink>
                                  </Link>
                                </TableCell>
                                <TableCell>{rma.dateRequested}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={rma.statusText || rma.status}
                                    size="small"
                                    color={
                                      rma.status === "completed"
                                        ? "success"
                                        : rma.status === "rejected" ||
                                          rma.status === "cancelled"
                                        ? "error"
                                        : rma.status === "processing" ||
                                          rma.status === "items_received"
                                        ? "info"
                                        : "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  {rma.items
                                    .map(
                                      (item) =>
                                        `${item.productName} (Qty: ${item.quantity})`
                                    )
                                    .join(", ")}
                                </TableCell>
                                <TableCell>
                                  {rma.resolutionStatus
                                    ? rma.resolutionStatus.toUpperCase()
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                {/* No RMAs and cannot initiate */}
                {!orderDetails?.existingRmas?.length &&
                  !orderDetails?.canInitiateReturn && (
                    <Typography variant="body2" mt={2}>
                      {t(
                        "orders.detail.returns.cannotReturnMessage",
                        "This order is not eligible for returns at this time."
                      )}
                    </Typography>
                  )}
              </Box>
            </InfoCard>
          </Stack>
        </Grid>
      </Grid>

      {/* Return Initiation Modal */}
      {orderDetails && isReturnModalOpen && (
        <ReturnInitiationModal
          open={isReturnModalOpen}
          onClose={() => setReturnModalOpen(false)}
          orderId={orderDetailId || ""}
          orderDisplayId={orderDetails.displayId}
          items={orderDetails.items.map((item) => ({
            id: item.id,
            productId: item.id, // Use item.id as a fallback for productId
            name: item.name,
            variantInfo: item.variantInfo || "",
            sku: item.sku,
            imageUrl: item.image_url,
            orderedQuantity: item.quantity,
            eligibleQuantity: item.quantity, // Use quantity as eligibleQuantity
            unitPrice: item.unitPrice,
            unitPriceFormatted: item.unitPriceFormatted,
          }))}
          returnReasons={staticReturnReasons}
          preferredResolutions={staticPreferredResolutions}
        />
      )}
    </Container>
  );
}
