"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Grid,
  Stack,
  Skeleton,
  Paper,
  Typography,
  Box,
  Avatar,
  Link,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import ImageIcon from "@mui/icons-material/Image";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PublishedWithChangesIcon from "@mui/icons-material/PublishedWithChanges";
import { AdminOrder } from "@/app/types/admin/orders";
import { OrderStatus } from "@/app/types/store/order";

// Extended interface for more comprehensive order details
export interface AdminOrderDetail extends AdminOrder {
  // Map id to order_id for backward compatibility
  order_id: string;
  // Add payment method details
  payment_method?: string;
  transaction_id?: string;
  payment_date?: string;
  // Ensure customer_details is not null
  customer_details: NonNullable<AdminOrder["customer_details"]>;
  // Ensure these are non-null
  account_id: number;
  contact_id: number;
}

interface OrderOverviewTabProps {
  orderId: string;
  order: AdminOrderDetail | null;
  isLoading?: boolean;
}

/**
 * Order Overview Tab component
 * Displays the main content and financial summary for an order
 */
export default function OrderOverviewTab({
  orderId,
  order,
  isLoading = false,
}: OrderOverviewTabProps) {
  const { t } = useTranslation();

  return (
    <Grid container spacing={3}>
      {/* Left Column - Main Content */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Stack spacing={3}>
          {/* Content Sections will go here */}
          {isLoading ? (
            <>
              <Paper sx={{ p: 2.5 }} elevation={2}>
                <Typography variant="h6" gutterBottom>
                  <Skeleton width={200} />
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box>
                          <Skeleton width={120} height={24} />
                          <Skeleton width={180} height={18} />
                        </Box>
                      </Box>
                      <Skeleton width={160} height={20} />
                      <Skeleton width={140} height={20} />
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Skeleton width={150} height={24} />
                    <Skeleton width={200} height={20} />
                    <Skeleton width={180} height={20} />
                    <Skeleton width={160} height={20} />
                    <Skeleton width={140} height={20} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Skeleton width={150} height={24} />
                    <Skeleton width={200} height={20} />
                    <Skeleton width={180} height={20} />
                    <Skeleton width={160} height={20} />
                    <Skeleton width={140} height={20} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 2.5 }} elevation={2}>
                <Typography variant="h6" gutterBottom>
                  <Skeleton width={180} />
                </Typography>
                <Skeleton variant="rectangular" height={200} />
              </Paper>
            </>
          ) : (
            <>
              <Paper sx={{ p: 2.5 }} elevation={2}>
                <Typography variant="h6" gutterBottom>
                  {t(
                    "admin.orders.detail.overview.customerInfoTitle",
                    "Customer & Shipping Information"
                  )}
                </Typography>

                <Grid container spacing={2}>
                  {/* Customer Information */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {order?.customer_details?.name || "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {order?.customer_details?.account_status}{" "}
                            {t(
                              "admin.orders.detail.overview.customer",
                              "Customer"
                            )}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack spacing={1}>
                        {order?.customer_details?.email && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <EmailIcon fontSize="small" color="action" />
                            <Link
                              href={`mailto:${order.customer_details.email}`}
                            >
                              <Typography variant="body2">
                                {order.customer_details.email}
                              </Typography>
                            </Link>
                          </Box>
                        )}

                        {order?.customer_details?.phone && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {order.customer_details.phone}
                            </Typography>
                          </Box>
                        )}

                        {order?.customer_details?.company && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <BusinessIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {order.customer_details.company}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Stack>
                  </Grid>

                  {/* Shipping Address */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("common.shippingAddress", "Shipping Address")}
                    </Typography>

                    {order?.shipping_address ? (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          {order.shipping_address.full_name}
                        </Typography>
                        <Typography variant="body2">
                          {order.shipping_address.address_line1}
                        </Typography>
                        {order.shipping_address.address_line2 && (
                          <Typography variant="body2">
                            {order.shipping_address.address_line2}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          {order.shipping_address.city},{" "}
                          {order.shipping_address.state}{" "}
                          {order.shipping_address.postal_code}
                        </Typography>
                        <Typography variant="body2">
                          {order.shipping_address.country}
                        </Typography>
                        <Typography variant="body2">
                          {order.shipping_address.phone_number}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t(
                          "admin.orders.detail.noShippingAddress",
                          "No shipping address provided"
                        )}
                      </Typography>
                    )}
                  </Grid>

                  {/* Billing Address */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("common.billingAddress", "Billing Address")}
                    </Typography>

                    {order?.billing_address ? (
                      // Check if billing address is the same as shipping address
                      order.billing_address.address_line1 ===
                        order.shipping_address?.address_line1 &&
                      order.billing_address.postal_code ===
                        order.shipping_address?.postal_code ? (
                        <Typography variant="body2" color="text.secondary">
                          {t(
                            "orders.detail.sameAsShipping",
                            "Same as shipping address"
                          )}
                        </Typography>
                      ) : (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            {order.billing_address.full_name}
                          </Typography>
                          <Typography variant="body2">
                            {order.billing_address.address_line1}
                          </Typography>
                          {order.billing_address.address_line2 && (
                            <Typography variant="body2">
                              {order.billing_address.address_line2}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            {order.billing_address.city},{" "}
                            {order.billing_address.state}{" "}
                            {order.billing_address.postal_code}
                          </Typography>
                          <Typography variant="body2">
                            {order.billing_address.country}
                          </Typography>
                          <Typography variant="body2">
                            {order.billing_address.phone_number}
                          </Typography>
                        </Box>
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t(
                          "admin.orders.detail.noBillingAddress",
                          "No billing address provided"
                        )}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 2.5 }} elevation={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="h6">
                    {t("admin.orders.detail.overview.itemsTitle", {
                      defaultValue: `Order Items (${
                        order?.items?.length || 0
                      })`,
                      count: order?.items?.length || 0,
                    })}{" "}
                  </Typography>
                  <Button size="small" variant="text">
                    {t("common.editItems", "Edit Items")}
                  </Button>
                </Stack>

                {order?.items && order.items.length > 0 ? (
                  <>
                    <TableContainer>
                      <Table size="small" aria-label="order items table">
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              {t("admin.orders.detail.product", "Product")}
                            </TableCell>
                            <TableCell align="right">
                              {t("admin.orders.detail.quantity", "Quantity")}
                            </TableCell>
                            <TableCell align="right">
                              {t("admin.orders.detail.price", "Price")}
                            </TableCell>
                            <TableCell align="right">
                              {t("admin.orders.detail.discount", "Discount")}
                            </TableCell>
                            <TableCell align="right">
                              {t("admin.orders.detail.total", "Total")}
                            </TableCell>
                            <TableCell align="center">
                              {t("admin.orders.detail.status", "Status")}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {order.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell component="th" scope="row">
                                <Stack
                                  direction="row"
                                  spacing={1.5}
                                  alignItems="center"
                                >
                                  {item.image_url ? (
                                    <Avatar
                                      variant="rounded"
                                      src={item.image_url}
                                      alt={item.product_name}
                                      sx={{ width: 48, height: 48 }}
                                    />
                                  ) : (
                                    <Avatar
                                      variant="rounded"
                                      sx={{
                                        width: 48,
                                        height: 48,
                                        bgcolor: "grey.200",
                                      }}
                                    >
                                      <ImageIcon color="action" />
                                    </Avatar>
                                  )}
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight="medium"
                                    >
                                      {item.product_name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      color="text.secondary"
                                    >
                                      {t("admin.orders.detail.sku", "SKU")}:{" "}
                                      {item.product_sku}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                {item.quantity}
                              </TableCell>
                              <TableCell align="right">
                                {order.currency} {item.unit_price}
                              </TableCell>
                              <TableCell align="right">-</TableCell>
                              <TableCell align="right">
                                {order.currency} {item.total_price}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={
                                    order.status === "SHIPPED" ||
                                    order.status === "DELIVERED"
                                      ? t(
                                          "admin.orders.detail.shipped",
                                          "Shipped"
                                        )
                                      : t(
                                          "admin.orders.detail.pending",
                                          "Pending"
                                        )
                                  }
                                  color="info"
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mt: 2,
                      }}
                    >
                      <Button
                        startIcon={<LocalShippingIcon />}
                        variant="contained"
                      >
                        {t(
                          "admin.orders.detail.manageFulfillment",
                          "Manage Fulfillment"
                        )}
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "admin.orders.detail.noItems",
                      "No items in this order."
                    )}
                  </Typography>
                )}
              </Paper>

              {/* Returns & Exchanges Section */}
              <Paper sx={{ p: 2.5 }} elevation={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="h6">
                    {t(
                      "admin.orders.detail.overview.returnsTitle",
                      "Returns & Exchanges"
                    )}
                  </Typography>
                  <Button size="small" variant="text">
                    {t(
                      "admin.orders.detail.overview.createNewRma",
                      "Create New RMA"
                    )}
                  </Button>
                </Stack>

                {/* Empty state for Returns & Exchanges */}
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <PublishedWithChangesIcon
                    sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t(
                      "admin.orders.detail.overview.noReturns",
                      "No returns or exchanges have been initiated for this order"
                    )}
                  </Typography>
                  <Button variant="contained" sx={{ mt: 1 }}>
                    {t(
                      "admin.orders.detail.overview.initiateReturn",
                      "Initiate Return/Exchange"
                    )}
                  </Button>
                </Box>
              </Paper>
            </>
          )}
        </Stack>
      </Grid>

      {/* Right Column - Financial Summary */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={3}>
          {isLoading ? (
            <>
              <Paper sx={{ p: 2.5 }} elevation={2}>
                <Typography variant="h6" gutterBottom>
                  <Skeleton width={120} />
                </Typography>
                <Stack spacing={2}>
                  <Skeleton variant="text" height={30} />
                  <Skeleton variant="text" height={30} />
                  <Skeleton variant="text" height={30} />
                  <Skeleton variant="text" height={30} />
                  <Skeleton variant="text" height={36} />
                </Stack>
              </Paper>
            </>
          ) : (
            <Paper sx={{ p: 2.5 }} elevation={2}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="h6">
                  {t(
                    "admin.orders.detail.financials.title",
                    "Financials & Payment"
                  )}
                </Typography>
                <Link component="button" variant="body2" onClick={() => {}}>
                  {t(
                    "admin.orders.detail.financials.viewFullLog",
                    "View Full Log"
                  )}
                </Link>
              </Stack>

              {/* Payment Method Sub-section */}
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("common.paymentMethod", "Payment Method")}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <CreditCardIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {order?.payment_method ||
                      t("common.notAvailable", "Not Available")}
                  </Typography>
                </Stack>

                {order?.transaction_id && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {t("admin.orders.detail.transactionId", "Transaction ID")}:{" "}
                    {order.transaction_id}
                  </Typography>
                )}

                {order?.payment_date && (
                  <Typography variant="body2" color="text.secondary">
                    {t("admin.orders.detail.paymentDate", "Payment Date")}:{" "}
                    {new Date(order.payment_date).toLocaleDateString()}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Order Totals Sub-section */}
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t(
                    "admin.orders.detail.financials.orderTotals",
                    "Order Totals"
                  )}
                </Typography>

                <Stack spacing={1}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2">
                      {t("common.subtotal", "Subtotal")}
                    </Typography>
                    <Typography variant="body2">
                      {order?.currency} {order?.subtotal_amount || "0.00"}
                    </Typography>
                  </Box>

                  {Number(order?.discount_amount || 0) > 0 && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        {t("common.discount", "Discount")}
                      </Typography>
                      <Typography variant="body2" color="error.main">
                        -{order?.currency} {order?.discount_amount || "0.00"}
                      </Typography>
                    </Box>
                  )}

                  {Number(order?.shipping_amount || 0) > 0 && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        {t("common.shipping", "Shipping")}
                      </Typography>
                      <Typography variant="body2">
                        {order?.currency} {order?.shipping_amount || "0.00"}
                      </Typography>
                    </Box>
                  )}

                  {Number(order?.tax_amount || 0) > 0 && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        {t("common.tax", "Tax")}
                      </Typography>
                      <Typography variant="body2">
                        {order?.currency} {order?.tax_amount || "0.00"}
                      </Typography>
                    </Box>
                  )}

                  <Divider />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography variant="subtitle2">
                      {t("common.total", "Total")}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {order?.currency} {order?.total_amount || "0.00"}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Payment Status Sub-section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("common.paymentStatus", "Payment Status")}
                </Typography>

                <Chip
                  label={
                    order?.payment_status === "PAID"
                      ? t("common.paid", "Paid")
                      : t("common.pending", "Pending")
                  }
                  color={
                    order?.payment_status === "PAID" ? "success" : "warning"
                  }
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />

                {/* Order Number & Date Info */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t("admin.orders.detail.orderNumber", "Order Number")}
                  </Typography>
                  <Typography variant="body2">
                    {order?.order_id || "-"}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ mt: 1 }} gutterBottom>
                    {t("admin.orders.detail.orderDate", "Order Date")}
                  </Typography>
                  <Typography variant="body2">
                    {order?.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : "-"}
                  </Typography>
                </Box>

                {/* Shipping Method */}
                {order?.shipping_method_name && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t(
                        "admin.orders.detail.shippingMethod",
                        "Shipping Method"
                      )}
                    </Typography>
                    <Typography variant="body2">
                      {order.shipping_method_name}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
