"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Grid,
  Chip,
  Button,
  Avatar,
  Link as MuiLink,
  useTheme,
  Divider,
  useMediaQuery,
} from "@mui/material";
import Image from "next/image";
import {
  OrderStatus,
  OrderSummary,
  type OrderItemPreview,
} from "@/app/types/store/orderTypes";
import { useTranslation } from "react-i18next";
import { useOrderDetailContext } from "@/app/contexts/OrderDetailContext";
import { useRouter } from "next/navigation";

/**
 * Props for the OrderHistoryItem component
 */
interface OrderHistoryItemProps {
  /** Order summary information */
  order: OrderSummary;
  /** Flag to indicate if the component should be rendered in grid view mode */
  isGridView?: boolean;
}

/**
 * Maps order status to MUI color for Chip component
 *
 * @param status - Order status
 * @returns MUI color property
 */
const getStatusChipColor = (
  status: OrderStatus
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" => {
  switch (status) {
    case "delivered":
      return "success";
    case "shipped":
      return "info";
    case "processing_return":
    case "returned":
      return "warning";
    case "cancelled":
      return "error";
    case "processing":
      return "secondary";
    case "pending":
    default:
      return "default";
  }
};

/**
 * Component to display a single order item in the order history list
 *
 * @param {OrderHistoryItemProps} props - Component props
 * @returns {React.ReactElement} The OrderHistoryItem component
 */
export function OrderHistoryItem({
  order,
  isGridView = false,
}: OrderHistoryItemProps): React.ReactElement {
  const { t } = useTranslation("common");
  const { setOrderDetailId } = useOrderDetailContext();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Prepare item description text
  const getItemsText = (): string => {
    const itemCountText = t("orderHistory.itemCount", {
      count: order.itemsPreview.count,
    });
    const primaryItemText = order.itemsPreview.primaryItemName || "";

    let text = `${itemCountText}${
      primaryItemText ? ": " + primaryItemText : ""
    }`;

    if (
      order.itemsPreview.additionalItemsCount &&
      order.itemsPreview.additionalItemsCount > 0
    ) {
      text +=
        " " +
        t("orderHistory.andMoreItems", {
          count: order.itemsPreview.additionalItemsCount,
        });
    }

    return text;
  };

  if (isMobile) {
    return (
      <Paper
        elevation={0}
        sx={{
          mb: theme.spacing(2),
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          overflow: "hidden",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow: theme.shadows[2],
            borderColor: theme.palette.primary.light,
          },
        }}
      >
        {/* Order Date */}
        <Box
          sx={{
            p: theme.spacing(2),
            pb: theme.spacing(1),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {order.date}
          </Typography>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            px: theme.spacing(2),
            display: "flex",
            gap: 2,
          }}
        >
          {/* Images Section */}
          <Box sx={{ display: "flex", my: 1 }}>
            {order.itemsPreview.items && order.itemsPreview.items.length > 0 ? (
              // Show up to 3 images
              order.itemsPreview.items.slice(0, 3).map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    position: "relative",
                    width: 60,
                    height: 60,
                    marginRight:
                      index < Math.min(order.itemsPreview.items!.length, 3) - 1
                        ? "-15px"
                        : 0,
                    zIndex: 3 - index,
                    "&:hover": {
                      zIndex: 4,
                      transform: "scale(1.1)",
                      transition: "transform 0.2s ease-in-out",
                    },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: "100%",
                      height: "100%",
                      bgcolor: theme.palette.grey[100],
                      borderRadius: theme.shape.borderRadius,
                      border: `2px solid ${theme.palette.background.paper}`,
                      boxSizing: "border-box",
                    }}
                  >
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={60}
                      height={60}
                      style={{ objectFit: "contain" }}
                    />
                  </Avatar>
                </Box>
              ))
            ) : order.itemsPreview.primaryItemImage ? (
              <Avatar
                variant="rounded"
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: theme.palette.grey[100],
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                <Image
                  src={order.itemsPreview.primaryItemImage}
                  alt={order.itemsPreview.primaryItemName || "Product image"}
                  width={70}
                  height={70}
                  style={{ objectFit: "contain" }}
                />
              </Avatar>
            ) : (
              <Avatar
                variant="rounded"
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: theme.palette.grey[100],
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                <Typography variant="subtitle2">
                  {t("orderHistory.noImage", "No Image")}
                </Typography>
              </Avatar>
            )}
          </Box>
          <Box>
            {/* Order ID */}
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              color="primary"
              sx={{ mt: 1.5 }}
            >
              {order.displayId}
            </Typography>

            {/* Number of Items */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("orderHistory.itemCount", { count: order.itemsPreview.count })}
              {/* {order.itemsPreview.additionalItemsCount &&
                order.itemsPreview.additionalItemsCount > 0 && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    {` + ${order.itemsPreview.additionalItemsCount} more ${
                      order.itemsPreview.additionalItemsCount === 1
                        ? "item"
                        : "items"
                    }`}
                  </Typography>
                )} */}
            </Typography>

            {/* Order Total */}
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5 }}>
              {order.totalAmountFormatted}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Status and Actions */}
        <Box
          sx={{
            px: theme.spacing(2),
            pb: theme.spacing(1),
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Status Chip */}
          <Chip
            label={t(order.statusTextKey)}
            color={getStatusChipColor(order.status)}
            size="small"
            sx={{
              borderRadius: "4px",
              height: "24px",
              fontSize: "0.75rem",
            }}
          />

          {/* View Details Button */}
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={() => {
              setOrderDetailId(order.id.toString());
              router.push(`/${tenantSlug}/store/account/orders/order-detail`);
            }}
            sx={{ fontWeight: 500 }}
          >
            {t("common.viewDetails", "View Details")}
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb: theme.spacing(2),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        height: isGridView ? "100%" : "auto",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          boxShadow: theme.shadows[2],
          borderColor: theme.palette.primary.light,
        },
      }}
    >
      {/* Order Header - Order ID and Date */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isGridView ? "column" : { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: isGridView
            ? "flex-start"
            : { xs: "flex-start", sm: "center" },
          gap: { xs: theme.spacing(1), sm: 0 },
          p: theme.spacing(2),
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.grey[50],
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Link
            href={order.actions.viewDetailsUrl}
            passHref
            style={{ textDecoration: "none" }}
          >
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              color="primary"
              sx={{ mr: theme.spacing(1) }}
            >
              {order.displayId}
            </Typography>
          </Link>

          <Chip
            label={t(order.statusTextKey)}
            size="small"
            color={getStatusChipColor(order.status)}
            sx={{
              fontSize: "0.75rem",
              textTransform: "capitalize",
            }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          {order.date}
        </Typography>
      </Box>

      {/* Order Content */}
      <Box
        sx={{
          p: theme.spacing(2),
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Grid container spacing={2}>
          {/* Left Column - Order Information */}
          <Grid size={{ xs: 12, md: isGridView ? 12 : 7 }}>
            <Stack
              direction={isGridView ? { xs: "column", sm: "row" } : "row"}
              spacing={2}
              alignItems={
                isGridView ? { xs: "flex-start", sm: "center" } : "center"
              }
              sx={isGridView ? { mb: theme.spacing(2) } : {}}
            >
              {/* Product Thumbnails - Horizontal Stack with Overlap */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row-reverse",
                  justifyContent: "flex-end",
                  position: "relative",
                  height: 60,
                  width: order.itemsPreview.items
                    ? `${60 + (order.itemsPreview.items.length - 1) * 15}px`
                    : "60px",
                }}
              >
                {order.itemsPreview.items ? (
                  order.itemsPreview.items.map(
                    (item: OrderItemPreview, index: number) => (
                      <Box
                        key={`${item.id}-${index}`}
                        sx={{
                          position: "relative",
                          width: 60,
                          height: 60,
                          marginRight:
                            index < order.itemsPreview.items!.length - 1
                              ? "-15px"
                              : 0,
                          zIndex: order.itemsPreview.items!.length - index,
                          "&:hover": {
                            zIndex: order.itemsPreview.items!.length + 1,
                            transform: "scale(1.1)",
                            transition: "transform 0.2s ease-in-out",
                          },
                        }}
                      >
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: "100%",
                            height: "100%",
                            bgcolor: theme.palette.grey[100],
                            borderRadius: theme.shape.borderRadius,
                            border: `2px solid ${theme.palette.background.paper}`,
                            boxSizing: "border-box",
                          }}
                        >
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={60}
                            height={60}
                            style={{ objectFit: "contain" }}
                          />
                        </Avatar>
                      </Box>
                    )
                  )
                ) : order.itemsPreview.primaryItemImage ? (
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: theme.palette.grey[100],
                      borderRadius: theme.shape.borderRadius,
                    }}
                  >
                    <Image
                      src={order.itemsPreview.primaryItemImage}
                      alt={
                        order.itemsPreview.primaryItemName || "Product image"
                      }
                      width={60}
                      height={60}
                      style={{ objectFit: "contain" }}
                    />
                  </Avatar>
                ) : (
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: theme.palette.grey[100],
                      borderRadius: theme.shape.borderRadius,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No image
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Item Details */}
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {`${order.itemsPreview.count} ${
                    order.itemsPreview.count === 1 ? "item" : "items"
                  }`}
                </Typography>

                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {order.itemsPreview.primaryItemName}
                  {order.itemsPreview.additionalItemsCount &&
                    order.itemsPreview.additionalItemsCount > 0 && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {` + ${order.itemsPreview.additionalItemsCount} more ${
                          order.itemsPreview.additionalItemsCount === 1
                            ? "item"
                            : "items"
                        }`}
                      </Typography>
                    )}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Right Column - Price and Actions */}
          <Grid size={{ xs: 12, md: isGridView ? 12 : 5 }}>
            <Stack
              alignItems={
                isGridView ? "flex-start" : { xs: "flex-start", md: "flex-end" }
              }
              height="100%"
              justifyContent="space-between"
              sx={{
                mt: isGridView
                  ? theme.spacing(1)
                  : { xs: theme.spacing(2), md: 0 },
                borderTop: isGridView
                  ? `1px solid ${theme.palette.divider}`
                  : "none",
                pt: isGridView ? theme.spacing(2) : 0,
              }}
            >
              {/* Order Total */}
              <Typography variant="h6" fontWeight="bold">
                {order.totalAmountFormatted}
              </Typography>

              {/* Action Buttons */}
              <Stack
                direction={isGridView ? "row" : { xs: "column", sm: "row" }}
                spacing={1}
                mt={2}
                width="100%"
                justifyContent={
                  isGridView
                    ? "flex-start"
                    : { xs: "flex-start", md: "flex-end" }
                }
                alignItems={
                  isGridView ? "center" : { xs: "flex-start", sm: "center" }
                }
              >
                {/* View Details Button */}
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  fullWidth={false}
                  onClick={() => {
                    setOrderDetailId(order.id.toString());
                    // Navigate to the order detail page with tenant slug
                    router.push(
                      `/${tenantSlug}/store/account/orders/order-detail`
                    );
                  }}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontWeight: 500,
                  }}
                >
                  {t("common.viewDetails", "View Details")}
                </Button>

                {/* Track Order Button */}
                {order.actions.trackUrl && (
                  <Link
                    href={order.actions.trackUrl}
                    passHref
                    style={{ textDecoration: "none" }}
                  >
                    <Button variant="outlined" size="small" color="primary">
                      {t("orderHistory.trackOrder", "Track")}
                    </Button>
                  </Link>
                )}

                {/* Track Return Button */}
                {order.actions.trackReturnUrl && (
                  <Link
                    href={order.actions.trackReturnUrl}
                    passHref
                    style={{ textDecoration: "none" }}
                  >
                    <Button variant="outlined" size="small" color="warning">
                      {t("orderHistory.trackReturn", "Track Return")}
                    </Button>
                  </Link>
                )}

                {/* Request Return Button */}
                {order.actions.requestReturnUrl && (
                  <Link
                    href={order.actions.requestReturnUrl}
                    passHref
                    style={{ textDecoration: "none" }}
                  >
                    <Button variant="outlined" size="small" color="secondary">
                      {t("orderHistory.requestReturn", "Request Return")}
                    </Button>
                  </Link>
                )}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}

export default OrderHistoryItem;
