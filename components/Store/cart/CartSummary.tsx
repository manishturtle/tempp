"use client";

import React from "react";
import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
  Stack,
  useTheme,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { CartSummary as CartSummaryType } from "@/app/types/store/cart";
import { formatCurrency } from "@/app/utils/currency";
import { useStoreConfig } from "@/app/[tenant]/store/layout";

interface CartSummaryProps {
  summary: {
    subtotal_amount: number;
    total_tax: number;
    total_amount: number;
    cart?: any; // Cart object containing items
  };
  isMobileDrawer?: boolean;
  onMinimumOrderError?: (minValue: number) => void;
  onDeliveryError?: (undeliverableItems: any[]) => void;
  onQuantityError?: (itemsWithQuantityError: any[]) => void;
}
/**
 * Component to display the cart order summary
 *
 * @param props - Component props
 * @returns React component
 */
export const CartSummary = ({
  summary,
  isMobileDrawer = false,
  onMinimumOrderError,
  onDeliveryError,
  onQuantityError,
}: CartSummaryProps): React.ReactElement => {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const params = useParams();
  const router = useRouter();
  const { checkout_configuration } = useStoreConfig();
  const tenantSlug = (params?.tenant as string) || "";
  // Extract the 3 simple values from API
  const { subtotal_amount, total_tax, total_amount,cart } = summary;

 console.log("cartttttttt",cart)
  // In mobile drawer, we only show summary and checkout button
  if (isMobileDrawer) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom fontWeight="medium">
          {t("store.cart.orderSummary")}
        </Typography>

        <Stack spacing={2} sx={{ mt: 3 }}>
          {/* Subtotal */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">{t("store.cart.subtotal")} (API: {subtotal_amount})</Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(subtotal_amount)}
            </Typography>
          </Box>

          {/* Tax Estimate */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">{t("store.cart.taxEstimate")} (API: {total_tax})</Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(total_tax)}
            </Typography>
          </Box>

          <Divider />

          {/* Order Total */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {t("store.cart.orderTotal")} (API: {total_amount})
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {formatCurrency(total_amount)}
            </Typography>
          </Box>
        </Stack>

        {/* Checkout Button */}
        <Button
          onClick={() => {
            // Check for undeliverable items
            const cartItems = (summary as any)?.cart?.items || [];
            const undeliverableItems = cartItems.filter(
              (item: any) => item.product_details?.delivery_eligible === false
            );
            if (undeliverableItems.length > 0) {
              // Notify parent component about delivery error
              if (onDeliveryError) {
                onDeliveryError(undeliverableItems);
              }
              return;
            }

            // Parse min_order_value as number for comparison only if it exists
            const minOrderValue = checkout_configuration?.min_order_value
              ? parseFloat(checkout_configuration.min_order_value)
              : null;
            const cartSubtotal = summary?.subtotal_amount || 0;

            // Only validate if a minimum order value is set
            if (minOrderValue !== null && cartSubtotal < minOrderValue) {
              // Notify parent component about minimum order error
              if (onMinimumOrderError) {
                onMinimumOrderError(minOrderValue);
              }
              return;
            }

            // Navigate to checkout if minimum order requirement is met
            router.push(`/${tenantSlug}/store/checkout`);
          }}
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          sx={{ mt: 4 }}
        >
          {t("store.cart.checkout")}
        </Button>
      </Box>
    );
  }

  // Desktop view
  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="medium">
        {t("store.cart.orderSummary")}
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        {/* Subtotal */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2">{t("store.cart.subtotal")}</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(subtotal_amount)}
          </Typography>
        </Box>

        {/* Tax Estimate */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2">{t("store.cart.taxEstimate")}</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(total_tax)}
          </Typography>
        </Box>

        <Divider />

        {/* Order Total */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t("store.cart.orderTotal")}
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {formatCurrency(total_amount)}
          </Typography>
        </Box>
      </Stack>

      {/* Checkout Button */}
      <Button
        onClick={() => {
          // Check for undeliverable items
          const cartItems = (summary as any)?.cart?.items || [];
          const undeliverableItems = cartItems.filter(
            (item: any) => item.product_details?.delivery_eligible === false
          );
          if (undeliverableItems.length > 0) {
            // Notify parent component about delivery error
            if (onDeliveryError) {
              onDeliveryError(undeliverableItems);
            }
            return;
          }

          // Check for items with quantity errors
          const itemsWithQuantityError = cartItems.filter(
            (item: any) => !!item.product_details?.quantity_error
          );
          if (itemsWithQuantityError.length > 0) {
            // Notify parent component about quantity error
            if (typeof onQuantityError === 'function') {
              onQuantityError(itemsWithQuantityError);
            } else {
              // Fallback: show alert if no handler provided
              alert('Some items in your cart have invalid quantities. Please fix them before proceeding.');
            }
            return;
          }

          // Parse min_order_value as number for comparison only if it exists
          const minOrderValue = checkout_configuration?.min_order_value
            ? parseFloat(checkout_configuration.min_order_value)
            : null;
          const cartSubtotal = summary?.subtotal_amount || 0;

          // Only validate if a minimum order value is set
          if (minOrderValue !== null && cartSubtotal < minOrderValue) {
            // Notify parent component about minimum order error
            if (onMinimumOrderError) {
              onMinimumOrderError(minOrderValue);
            }
            return;
          }

          // Navigate to checkout if minimum order requirement is met
          router.push(`/${tenantSlug}/store/checkout`);
        }}
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        sx={{ mt: 4 }}
      >
        {t("store.cart.checkout")}
      </Button>
    </Box>
  );
};
