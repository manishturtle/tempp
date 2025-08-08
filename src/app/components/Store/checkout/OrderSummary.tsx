"use client";

import { FC, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Divider,
  Button,
  Skeleton,
  Alert,
  Link,
  IconButton,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { ShippingMethod, PromoCodeData } from "@/app/types/store/checkout";
import { useCart } from "@/app/hooks/api/store/useCart";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { ClearOutlined } from "@mui/icons-material";

interface OrderSummaryProps {
  selectedShippingMethod?: ShippingMethod | null;
  appliedWalletAmount?: number;
  appliedLoyaltyDiscount?: number;
  onApplyPromo?: (code: string) => void;
  isApplyingPromo?: boolean;
  promoCode?: string;
  setPromoCode?: (code: string) => void;
}

export const OrderSummary: FC<OrderSummaryProps> = ({
  selectedShippingMethod,
  onApplyPromo,
  promoCode = "",
}) => {
  const router = useRouter();
  // Get the tenant slug from the URL
  const tenantSlug =
    typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "";
  // Fetch cart data from the cart hook
  const { cart, isLoading, isError, removeFromCart, isRemovingFromCart } = useCart();
  const estimatedTax = 0;

  // Local calculation of totals based on cart data and other applied amounts
  const calculateTotals = () => {
    if (!cart)
      return {
        subtotal: 0,
        shipping: 0,
        tax: 0,
        discount: 0,
        wallet: 0,
        loyalty: 0,
        total: 0,
      };

    // Parse string amounts from the new cart structure
    const subtotal = parseFloat(cart.subtotal_amount || "0");
    const shipping = selectedShippingMethod?.price || 0;
    const tax = parseFloat(cart.total_tax || "0");
    
    // Use total_amount from cart if available, otherwise calculate
    const total = cart.total_amount ? parseFloat(cart.total_amount) : Math.max(subtotal + shipping + tax);

    return {
      subtotal,
      shipping,
      tax,
      total,
    };
  };

  const totals = calculateTotals();
  const { t } = useTranslation();
  const theme = useTheme();

  const formatCurrency = (value: number): string => {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`;
  };

  return (
    <Box
      sx={{
        position: "sticky",
        top: theme.spacing(2),
      }}
    >
      <Typography variant="h6" gutterBottom>
        {t("common:store.checkout.orderSummary")}
      </Typography>

      {isLoading ? (
        // Loading state
        <Box sx={{ mt: theme.spacing(2), mb: theme.spacing(3) }}>
          {[1, 2].map((item) => (
            <Box
              key={item}
              sx={{
                py: theme.spacing(2),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Skeleton
                  variant="rectangular"
                  width={60}
                  height={60}
                  sx={{ mr: theme.spacing(2) }}
                />
                <Box>
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={80} />
                </Box>
              </Box>
              <Skeleton variant="text" width={60} />
            </Box>
          ))}
        </Box>
      ) : isError ? (
        // Error state
        <Alert
          severity="error"
          sx={{ mt: theme.spacing(2), mb: theme.spacing(3) }}
        >
          {t("common:error.loadingCart")}
        </Alert>
      ) : (
        // Cart items
        <Box sx={{ mt: theme.spacing(2), mb: theme.spacing(3) }}>
          {cart?.items && cart.items.length > 0 ? (
            cart.items.map((item) => (
              <Box
                key={item.id.toString()}
                sx={{
                  py: theme.spacing(2),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: `2px solid ${theme.palette.grey[600]}`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    component="img"
                    src={
                      item.product_details.images?.find(img => img.is_default)?.image ||
                      item.product_details.images?.[0]?.image ||
                      "/placeholder-product.jpg"
                    }
                    alt={item.product_details.name}
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      bgcolor: theme.palette.grey[200],
                      borderRadius: 1,
                      mr: theme.spacing(2),
                    }}
                  />
                  <Box>
                    <Link
                      href={`/${tenantSlug}/store/product/${item.product_sku}/`}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(
                          `/${tenantSlug}/store/product/${item.product_sku}/`
                        );
                      }}
                      sx={{
                        textDecoration: "none",
                        color: "inherit",
                        "&:hover": {
                          color: "primary.main",
                          textDecoration: "underline",
                        },
                        cursor: "pointer",
                        display: "inline-block",
                      }}
                    >
                      <Typography variant="body1" fontWeight="medium">
                        {item.product_details.name}
                      </Typography>
                    </Link>
                    {item.product_details.delivery_eligible === false ? (
                      <>
                        <Typography
                          variant="body2"
                          color="error.main"
                          sx={{ mt: 0.5, fontWeight: 500 }}
                        >
                          {item.product_details.delivery_error ||
                            "Not available for delivery"}
                        </Typography>
                        <IconButton
                          onClick={() => {
                            if (!isRemovingFromCart) removeFromCart(item.id.toString());
                          }}
                          aria-label={t("cart.removeItem")}
                          disabled={isRemovingFromCart}
                          sx={{
                            color: "error.main",
                            fontSize: 20,
                            cursor: isRemovingFromCart ? "not-allowed" : "pointer",
                            opacity: isRemovingFromCart ? 0.5 : 1,
                            ml: 1,
                          }}
                          size="small"
                        >
                          <ClearOutlined fontSize="inherit" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {t("common:store.checkout.qty")}: {item.quantity}{" "}
                          {item.product_details.unit_name &&
                            `(${item.product_details.unit_name})`}
                        </Typography>
                        {item.product_details.quantity_error && (
                          <Typography
                            variant="body2"
                            color="error.main"
                            sx={{ mt: 0.5, fontWeight: 500 }}
                          >
                            ⚠️ {item.product_details.quantity_error}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                {item.product_details.delivery_eligible !== false && (
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(parseFloat(item.product_details.price || "0") * item.quantity)}
                  </Typography>
                )}
              </Box>
            ))
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: theme.spacing(2) }}
            >
              {t("common:store.cart.emptyCart")}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ mt: theme.spacing(3) }}>
        {/* Subtotal */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: theme.spacing(1),
          }}
        >
          <Typography variant="body1">
            {t("common:store.checkout.subtotal")}
          </Typography>
          {isLoading ? (
            <Skeleton width={80} />
          ) : (
            <Typography variant="body1">
              {formatCurrency(totals.subtotal)}
            </Typography>
          )}
        </Box>

        {/* Tax */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: theme.spacing(1),
          }}
        >
          <Typography variant="body1">
            {t("common:store.checkout.tax")}
          </Typography>
          {isLoading ? (
            <Skeleton width={80} />
          ) : (
            <Typography variant="body1">
              {formatCurrency(totals.tax)}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: theme.spacing(2), color: theme.palette.divider }} />

        {/* Total */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: theme.spacing(1),
            fontWeight: "bold",
          }}
        >
          <Typography variant="h6">
            {t("common:store.checkout.total")}
          </Typography>
          {isLoading ? (
            <Skeleton width={100} height={32} />
          ) : (
            <Typography variant="h6">{formatCurrency(totals.total)}</Typography>
          )}
        </Box>
      </Box>

      {/* Navigation buttons as shown in the image */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="text"
          color="primary"
          startIcon={<ArrowBackIosIcon />}
          sx={{ textTransform: "none" }}
          onClick={() => router.push(`/${tenantSlug}/store/cart`)}
        >
          {t("common:store.checkout.returnToCart")}
        </Button>
        <Button
          variant="text"
          color="primary"
          endIcon={<ArrowForwardIosIcon />}
          sx={{ textTransform: "none" }}
          onClick={() => router.push(`/${tenantSlug}/store`)}
        >
          {t("common:store.checkout.continueShopping")}
        </Button>
      </Box>
    </Box>
  );
};
