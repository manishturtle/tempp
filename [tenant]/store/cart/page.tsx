"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Link,
  Divider,
  useTheme,
  Button,
  useMediaQuery,
  Backdrop,
} from "@mui/material";
import { LocationPopover } from "@/app/components/common/LocationPopover";
import { useTranslation } from "react-i18next";
import useNotification from "@/app/hooks/useNotification";
import Notification from "@/app/components/common/Notification";
import { useCart } from "@/app/hooks/api/store/useCart";
import { CartItem } from "@/app/components/Store/cart/CartItem";
import { CartSummary } from "@/app/components/Store/cart/CartSummary";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CartService from "@/app/auth/services/cartService";
import { Cart } from "@/app/types/store/cart";
import { formatCurrency } from "@/app/utils/currency";
import { useStoreConfig } from "../layout";
import { useAuthRefresh } from "@/app/contexts/AuthRefreshContext";
import { COCKPIT_API_BASE_URL } from "@/utils/constants";

/**
 * Cart page component
 *
 * @returns React component
 */
export default function CartPage(): React.ReactElement {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { checkout_configuration } = useStoreConfig();
  const router = useRouter();

  // Ref to track if add to cart operation is in progress
  const isAddingToCartRef = useRef(false);

  // Fetch cart data using the useCart hook
  const {
    cart,
    isLoading,
    isError,
    refetch: refetchCart,
    isUpdatingCart,
    isAddingToCart,
    isRemovingFromCart,
    isClearingCart,
  } = useCart();

  // Combine all loading states
  const searchParams = useSearchParams();
  const isProcessing =
    isUpdatingCart || isAddingToCart || isRemovingFromCart || isClearingCart;

  // Track processed operations to prevent duplicates
  const processedParamsRef = useRef<string>("");

  // Location state
  const [location, setLocation] = useState<{
    pincode: string;
    country: string;
    countryCode?: string;
    state?: string;
  } | null>(null);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);

  // Load location from localStorage
  useEffect(() => {
    const tenantSlug = window.location.pathname.split("/")[1];
    if (typeof window !== "undefined" && tenantSlug) {
      try {
        const loc = JSON.parse(
          localStorage.getItem(`${tenantSlug}_location`) || "null"
        );
        if (loc && loc.pincode && loc.country) {
          setLocation(loc);
        }
      } catch {}
    }
  }, []);

  // Handle location change
  const handleLocationSave = (data: { country: any; pincode: string }) => {
    const tenantSlug = window.location.pathname.split("/")[1];
    if (typeof window !== "undefined" && tenantSlug) {
      try {
        const loc = JSON.parse(
          localStorage.getItem(`${tenantSlug}_location`) || "null"
        );
        setLocation(loc);
        // Refetch cart data with new location parameters
        refetchCart();
      } catch {}
    }
    setLocationPopoverOpen(false);
  };

  // Verify tenant and handle adding product to cart from URL parameters
  useEffect(() => {
    const productSku = searchParams.get("product_sku");
    const quantity = searchParams.get("quantity");
    const currentParams = `${productSku}-${quantity}`;

    // Skip if no product or quantity, or if already processing this exact operation
    if (
      !productSku ||
      !quantity ||
      isAddingToCartRef.current ||
      processedParamsRef.current === currentParams
    ) {
      return;
    }

    // Mark these params as being processed
    processedParamsRef.current = currentParams;
    isAddingToCartRef.current = true;

    const verifyAndAddToCart = async () => {
      try {
        // Extract tenant slug from URL
        const tenantSlug = window.location.pathname.split("/")[1];
        if (!tenantSlug) {
          throw new Error("Tenant slug not found in URL");
        }

        // Check if tenant info exists in localStorage with tenant prefix
        const tenantInfoKey = `${tenantSlug}_tenantInfo`;
        let tenantInfo = localStorage.getItem(tenantInfoKey);
        let tenantData = null;

        if (!tenantInfo) {
          // If no tenant info, we need to verify the tenant first
          const baseUrl = `${window.location.origin}/${tenantSlug}/store/`;
          const apiUrl = new URL(
            `${COCKPIT_API_BASE_URL}/platform-admin/api/tenant-by-url/`
          );
          apiUrl.searchParams.append("default_url", baseUrl);

          console.log("Verifying tenant with URL:", baseUrl);
          const response = await fetch(apiUrl.toString(), {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            throw new Error("Tenant verification failed");
          }

          tenantData = await response.json();
          if (!tenantData) {
            throw new Error("Invalid tenant data received");
          }

          // Store tenant info in localStorage with tenant prefix
          localStorage.setItem(tenantInfoKey, JSON.stringify(tenantData));
          tenantInfo = JSON.stringify(tenantData);

          // Also store in sessionStorage for backward compatibility
          // sessionStorage.setItem('tenantInfo', tenantInfo);
        }

        // Fetch tenant configuration data if not already in localStorage
        const configKey = `${tenantSlug}_tenantConfig`;
        if (!localStorage.getItem(configKey)) {
          try {
            const configResponse = await fetch(
              `${COCKPIT_API_BASE_URL}/api/${tenantSlug}/tenant-admin/tenant-login-config/`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            if (configResponse.ok) {
              const configData = await configResponse.json();
              console.log("Tenant config data:", configData);

              // Store the complete config with tenant prefix
              localStorage.setItem(configKey, JSON.stringify(configData));

              // Extract and store specific configuration values individually with tenant prefix
              if (configData) {
                // Store localization settings
                const localization = configData.localization_config || {};
                localStorage.setItem(
                  `${tenantSlug}_appLanguage`,
                  localization.default_language || "en"
                );

                // Store branding configuration
                const branding = configData.branding_config || {};
                localStorage.setItem(
                  `${tenantSlug}_fontFamily`,
                  branding.default_font_style || "roboto"
                );
                localStorage.setItem(
                  `${tenantSlug}_themeColor`,
                  branding.primary_brand_color || ""
                );
                localStorage.setItem(
                  `${tenantSlug}_secondaryColor`,
                  branding.secondary_brand_color || ""
                );
                localStorage.setItem(
                  `${tenantSlug}_themeMode`,
                  branding.default_theme_mode || "system"
                );

                // Store logo information - both dark and light versions with tenant prefix
                if (
                  branding.company_logo_dark &&
                  branding.company_logo_dark.url
                ) {
                  localStorage.setItem(
                    `${tenantSlug}_logoDark`,
                    branding.company_logo_dark.url
                  );
                }
                if (
                  branding.company_logo_light &&
                  branding.company_logo_light.url
                ) {
                  localStorage.setItem(
                    `${tenantSlug}_logoLight`,
                    branding.company_logo_light.url
                  );
                }
                if (branding.company_logo) {
                  // Fallback to the main logo if specific logos aren't available
                  localStorage.setItem(
                    `${tenantSlug}_logo`,
                    branding.company_logo.url || ""
                  );
                }

                // Also store brand name with tenant prefix
                if (branding.company_name) {
                  localStorage.setItem(
                    `${tenantSlug}_brandName`,
                    branding.company_name
                  );
                }

                // Store company details in a single object
                const companyInfo = configData.company_info || {};
                const companyDetails = {
                  name: companyInfo.company_name || "",
                  address1:
                    companyInfo.registered_address?.address_line_1 || "",
                  address2:
                    companyInfo.registered_address?.address_line_2 || "",
                  city: companyInfo.registered_address?.city || "",
                  state: companyInfo.registered_address?.state || "",
                  country: companyInfo.registered_address?.country || "",
                  pincode: companyInfo.registered_address?.postal_code || "",
                  gstin: companyInfo.tax_id || "",
                  phone: companyInfo.primary_contact_phone || "",
                  email: companyInfo.primary_contact_email || "",
                };

                // Store as a single JSON string with tenant prefix
                localStorage.setItem(
                  `${tenantSlug}_companyDetails`,
                  JSON.stringify(companyDetails)
                );
                // Keep backward compatibility
              }

              // Store tenant specific information with tenant prefix in localStorage
              localStorage.setItem(`${tenantSlug}_tenant_slug`, tenantSlug);

              const app_id = localStorage.getItem("app_id") || "5";
              // Store app_id with tenant prefix in localStorage
              localStorage.setItem(`${tenantSlug}_app_id`, app_id);
            } else {
              console.error("Failed to fetch tenant configuration");
            }
          } catch (configErr) {
            console.error("Error fetching tenant configuration:", configErr);
          }

          // Store tenant info in localStorage with tenant prefix
          if (tenantData) {
            localStorage.setItem(tenantInfoKey, JSON.stringify(tenantData));
          }
        }

        try {
          // Now that we have tenant info, add to cart
          await CartService.addToCart(productSku, parseInt(quantity, 10) || 1);

          // Refresh cart data
          await refetchCart();

          // Show success message
          showNotification(t("wishlist.addToCart"), "success");

          // Remove query parameters to prevent duplicate additions
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.delete("product_sku");
          newSearchParams.delete("quantity");

          // Update URL without the query parameters
          const newUrl = `${window.location.pathname}${
            newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""
          }`;
          window.history.replaceState({}, "", newUrl);
        } finally {
          // Reset the ref when done or on error
          isAddingToCartRef.current = false;
        }
      } catch (error) {
        console.error("Error in cart operation:", error);
        showNotification(
          error instanceof Error ? error.message : t("store.cart.addError"),
          "error"
        );
      }
    };

    verifyAndAddToCart();
  }, [searchParams, refetchCart, showNotification, t]);

  // Handle quantity changes for cart items
  const handleQuantityChange = (itemId: number, quantity: number): void => {
    CartService.updateCartItemQuantity(itemId.toString(), quantity)
      .then(() => {
        showNotification(t("store.cart.updateSuccess"), "success");
        // Refresh cart data
        refetchCart();
      })
      .catch((error) => {
        console.error("Error updating cart item:", error);
        showNotification(t("store.cart.updateError"), "error");
      });
  };

  // Handle removing items from the cart
  const handleRemoveItem = (itemId: number): void => {
    CartService.removeFromCart(itemId.toString())
      .then(() => {
        showNotification(t("store.cart.removeSuccess"), "success");
        // Refresh cart data
        refetchCart();
      })
      .catch((error) => {
        console.error("Error removing item from cart:", error);
        showNotification(t("store.cart.removeError"), "error");
      });
  };

  // Handle clearing the cart
  const handleClearCart = (): void => {
    CartService.clearCart()
      .then(() => {
        showNotification(t("store.cart.clearSuccess"), "success");
        refetchCart();
      })
      .catch((error) => {
        console.error("Error clearing cart:", error);
        showNotification(t("store.cart.clearError"), "error");
      });
  };

  // Show loading state while data is being fetched or when cart is being processed
  if (isLoading || isProcessing || !cart) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            {t("common.cart")}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Render error state
  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {t("store.cart.errorFetching")}
        </Alert>
      </Container>
    );
  }

  // Render empty cart state
  if (cart.items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          }}
        >
          <ShoppingCartIcon
            sx={{
              fontSize: 60,
              color: theme.palette.grey[400],
              mb: 2,
            }}
          />
          <Typography variant="h5" gutterBottom>
            {t("store.cart.emptyCart")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t("store.cart.emptyCartMessage")}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ width: "100%", p: 1.5, mt: isMobile ? 5 : 0 }}
      >
        <Grid container spacing={2}>
          {/* Cart Items */}
          <Grid size={{ xs: 12, md: 9 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: "white",
                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Deliver to:
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold">
                  {location
                    ? `${location.country}${location.state ? `, ${location.state}` : ''} - ${location.pincode}`
                    : "Select Location"}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setLocationPopoverOpen(true)}
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                Change
              </Button>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: "white",
                // backgroundColor: (theme) => theme.palette.grey[50],
                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
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
                <Typography
                  variant="h6"
                  component="h1"
                  sx={{ fontWeight: theme.typography.fontWeightBold }}
                >
                  {t("store.cart.title")}
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleClearCart}
                  disabled={isProcessing}
                >
                  {t("store.cart.clearCart")}
                </Button>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Array.isArray(cart.items) &&
                  cart.items.map((item, index) => (
                    <Box key={item.id}>
                      <CartItem
                        item={item}
                        onQuantityChange={handleQuantityChange}
                        onRemove={handleRemoveItem}
                      />
                      {/* {index < cart.items.length - 1 && (
                        <Divider sx={{ mt: 2 }} />
                      )} */}
                    </Box>
                  ))}
              </Box>
            </Paper>
          </Grid>

          {/* Order Summary */}
          {/* Order Summary - Desktop View */}
          {!isMobile && (
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: "white",
                  border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                }}
              >
                <CartSummary
                  summary={{
                    subtotal_amount: parseFloat(cart.subtotal_amount || "0"),
                    total_tax: parseFloat(cart.total_tax || "0"),
                    total_amount: parseFloat(cart.total_amount || "0"),
                    cart: cart,
                  }}
                  onMinimumOrderError={(minValue) => {
                    // Show error notification about minimum order requirement
                    showNotification({
                      title: t("store.cart.minimumOrderNotMet"),
                      message: `${t(
                        "store.cart.minimumOrderRequired"
                      )} ${formatCurrency(minValue)}`,
                      type: "error",
                    });
                  }}
                  onDeliveryError={(undeliverableItems) => {
                    // Show error notification about undeliverable items
                    showNotification({
                      title: "Products Not Deliverable",
                      message: undeliverableItems
                        .map(
                          (item) =>
                            `${item.product_details?.name || ""}: ${
                              item.product_details?.delivery_error ||
                              "Product not available for delivery to this location"
                            }`
                        )
                        .join("\n"),
                      type: "error",
                    });
                  }}
                  onQuantityError={(itemsWithQuantityError) => {
                    // Show error notification about quantity errors
                    showNotification({
                      title: t("store.cart.invalidQuantity", "Invalid Quantity in Cart"),
                      message: itemsWithQuantityError
                        .map(
                          (item) =>
                            `${item.product_details?.name || ""}: ${
                              item.product_details?.quantity_error ||
                              t("store.cart.invalidQuantityMessage", "Quantity is not allowed for this item.")
                            }`
                        )
                        .join("\n"),
                      type: "error",
                    });
                  }}
                />
              </Paper>
            </Grid>
          )}

          {/* Sticky Mobile Checkout Bar - stays visible when scrolling */}
          {isMobile && (
            <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {t("store.cart.orderTotal")}:
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {formatCurrency(parseFloat(cart.total_amount || cart.subtotal_amount || "0"))}
                </Typography>
              </Box>
              <Button
                onClick={(e) => {
                  // Parse min_order_value as number for comparison only if it exists
                  const minOrderValue = checkout_configuration?.min_order_value
                    ? parseFloat(checkout_configuration.min_order_value)
                    : null;
                  const cartSubtotal = parseFloat(cart.subtotal_amount || "0");

                  // Only validate if a minimum order value is set
                  if (minOrderValue !== null && cartSubtotal < minOrderValue) {
                    e.preventDefault();
                    // Show error notification about minimum order requirement
                    showNotification({
                      title: t("store.cart.minimumOrderNotMet"),
                      message: `${t(
                        "store.cart.minimumOrderRequired"
                      )} ${formatCurrency(minOrderValue)}`,
                      type: "error",
                    });
                    return;
                  }

                  // If no minimum required or minimum is met, navigate to checkout
                  const tenantSlug = window.location.pathname.split("/")[1];
                  router.push(`/${tenantSlug}/store/checkout`);
                }}
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                {t("store.cart.continueCheckout")}
              </Button>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Location Popover with Backdrop */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
        open={locationPopoverOpen}
        onClick={() => setLocationPopoverOpen(false)}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            width: "100%",
            position: "fixed",
            zIndex: (theme) => theme.zIndex.modal + 1,
          }}
        >
          <LocationPopover
            tenantSlug={
              typeof window !== "undefined"
                ? window.location.pathname.split("/")[1]
                : ""
            }
            open={locationPopoverOpen}
            onClose={() => setLocationPopoverOpen(false)}
            initialPincode={location?.pincode}
            onSave={(newLocation) => {
              handleLocationSave(newLocation);
              // window.location.reload();
            }}
          />
        </Box>
      </Backdrop>

      {/* Notification component */}
      <Notification
        open={notification.open}
        message={notification.message}
        title={notification.title}
        severity={notification.severity}
        onClose={hideNotification}
        autoHideDuration={5000}
      />
    </>
  );
}
