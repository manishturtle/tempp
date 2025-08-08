"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Container,
  useTheme,
  Snackbar,
  useMediaQuery,
  Theme,
  Backdrop,
  Paper,
} from "@mui/material";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import { useTranslation } from "react-i18next";
import { useProduct } from "@/app/hooks/api/store/useProduct";
import { ProductImageGallery } from "@/app/components/Store/pdp/ProductImageGallery";
import { ProductTabs } from "@/app/components/Store/pdp/ProductTabs";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import CartService from "@/app/auth/services/cartService";
import { Breadcrumbs } from "@/app/components/Store/pdp/Breadcrumbs";
import { HeaderNavigation } from "@/app/components/Store/HeaderNavigation";
import { ProductDetailMobileCarousel } from "@/app/components/Store/pdp/ProductDetailMobileCarousel";
import { LocationPopover } from "@/app/components/common/LocationPopover";

/**
 * Product Detail Page (PDP) component
 * Displays detailed information about a product and allows adding to cart
 *
 * @returns React component
 */
export default function ProductDetailPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const productSku = params?.sku as string;
  const { t } = useTranslation("common");
  const theme = useTheme();
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );
  const queryClient = useQueryClient();

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Location state
  const [location, setLocation] = useState<{
    address?: string;
    country?: string;
    countryCode?: string;
    pincode?: string;
  } | null>(null);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);

  // Redirect to product listing if no product SKU is in URL
  useEffect(() => {
    if (!productSku) {
      router.push("/store/product/");
    }
  }, [productSku, router]);

  // Fetch product data
  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useProduct(
    productSku || "",
    location?.pincode && location?.country
      ? (() => {
          let customerGroupSellingChannelId: string | undefined = undefined;
          if (typeof window !== "undefined") {
            const pathParts = window.location.pathname.split("/");
            const tenantSlug = pathParts[1] || "";
            const segmentKey = `${tenantSlug}_segmentdetails`;
            const segmentRaw = localStorage.getItem(segmentKey);
            if (segmentRaw) {
              try {
                const segmentObj = JSON.parse(segmentRaw);
                customerGroupSellingChannelId = segmentObj.id || undefined;
              } catch (e) {
                // Ignore parse error
              }
            }
          }
          return {
            pincode: location.pincode,
            country: location.country,
            customer_group_selling_channel_id: customerGroupSellingChannelId,
          };
        })()
      : undefined
  );

  // Compute selected variant details
  // Process product images to get main image and thumbnails
  const getProductImages = useMemo(() => {
    if (!product) {
      return {
        mainImage: "",
        thumbnails: [],
      };
    }

    // If product has images array (including fallback images from API)
    if (product.images && product.images.length > 0) {
      // Find the default image (is_default: true) for main image
      const defaultImage = product.images.find(
        (img) => img.is_default === true
      );
      const mainImage = defaultImage
        ? defaultImage.image
        : product.images[0].image;

      // Use all images as thumbnails, sorted by sort_order
      const sortedImages = [...product.images].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      const thumbnails = sortedImages.map((img) => img.image);

      return {
        mainImage,
        thumbnails,
      };
    }

    // Final fallback: Return empty (API handles fallback images now)
    return {
      mainImage: "",
      thumbnails: [],
    };
  }, [product]);

  // Process stock status based on API data
  const inStock = product?.stock_status === "IN_STOCK";
  const lowStock = product
    ? product.quantity_on_hand <= 5 && product.quantity_on_hand > 0
    : false;
  const stockStatusText = inStock
    ? lowStock
      ? t("store.product.lowStock", "Low Stock")
      : t("store.product.inStock", "In Stock")
    : t("store.product.outOfStock", "Out of Stock");
  const stockStatusColor = inStock
    ? lowStock
      ? "warning"
      : "success"
    : "error";

  // Add to cart mutation
  const addToCart = useMutation({
    mutationFn: async ({
      sku,
      quantity,
    }: {
      sku: string;
      quantity: number;
    }) => {
      // Use the dedicated CartService to ensure consistent session handling
      return CartService.addToCart(sku, quantity);
    },
    onSuccess: () => {
      // Invalidate cart queries to update cart count - use stronger invalidation
      queryClient.invalidateQueries({ queryKey: ["cart"], refetchType: "all" });
      // Force refresh to ensure header updates
      queryClient.refetchQueries({ queryKey: ["cart"] });

      // Show success notification
      setNotification({
        open: true,
        message: t("store.product.addedToCart", "Product added to cart"),
        severity: "success",
      });

      // Close notification after 3 seconds
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, open: false }));
      }, 3000);
    },
    onError: (error: any) => {
      // Handle error and show notification
      let errorMessage = t(
        "store.product.errorAddingToCart",
        "Error adding product to cart"
      );

      // Try to parse the error message if it's a validation error
      try {
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.product_sku && Array.isArray(errorData.product_sku)) {
            errorMessage = `${t(
              "store.product.invalidSku",
              "Invalid product SKU"
            )}: ${errorData.product_sku[0]}`;
          }
        }
      } catch (e) {
        console.error("Error parsing API error:", e);
      }

      setNotification({
        open: true,
        message: errorMessage,
        severity: "error",
      });

      // Close notification after 5 seconds
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, open: false }));
      }, 5000);
    },
  });

  // Price formatting helper
  const formatPrice = (price: number): string => {
    return `₹${price.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`;
  };

  // Handle add to cart
  const handleAddToCart = async (redirectToCheckout = false): Promise<void> => {
    if (!product) return;

    // Use the product's SKU if no variant is selected
    const skuToAdd = product.sku;

    if (!skuToAdd) {
      return;
    }

    // Use the existing mutation to add to cart
    addToCart.mutate(
      { sku: skuToAdd, quantity },
      {
        onSuccess: (data) => {
          if (redirectToCheckout) {
            // Redirect to checkout after successful add to cart
            router.push(`/${params.tenant}/store/checkout/`);
          }
          return data;
        },
      }
    );
  };

  // Handle buy now (add to cart and go to checkout)
  const handleBuyNow = (): void => {
    handleAddToCart(true);
  };

  // Load location from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/");
      const tenantSlug = pathParts[1];
      if (tenantSlug) {
        const locationKey = `${tenantSlug}_location`;
        const savedLocation = localStorage.getItem(locationKey);
        if (savedLocation) {
          try {
            setLocation(JSON.parse(savedLocation));
          } catch (error) {
            console.error("Error parsing location from localStorage:", error);
          }
        }
      }
    }
  }, []);

  // Handle location save
  const handleLocationSave = (newLocation: {
    address: string;
    country: string;
    countryCode?: string;
    pincode: string;
  }) => {
    setLocation(newLocation);
    setLocationPopoverOpen(false);
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // If error, show error message
  if (isError || !product) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
          p: 2,
        }}
      >
        <Alert
          severity="error"
          sx={{
            maxWidth: 600,
            width: "100%",
          }}
        >
          {t("common.error", "An error occurred")}:{" "}
          {error?.message ||
            t("store.product.productNotFound", "Product not found")}
        </Alert>
      </Box>
    );
  }

  // Show notification if open
  const renderNotification = (): React.ReactElement | null => {
    if (!notification.open) return null;

    return (
      <Alert
        severity={notification.severity}
        sx={{
          position: "fixed",
          top: theme.spacing(2),
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1400,
          boxShadow: theme.shadows[4],
          minWidth: 300,
          maxWidth: "90%",
          textAlign: "center",
          "& .MuiAlert-message": {
            width: "100%",
            textAlign: "center",
          },
        }}
      >
        {notification.message}
      </Alert>
    );
  };

  return (
    <>
      <HeaderNavigation />

      <Container
        maxWidth={false}
        disableGutters
        sx={{
          width: "100%",
          pt: 2,
          pl: 3,
          pr: 3,
          pb: 3,
          backgroundColor: "white",
        }}
      >
        {/* Main Product Content - Two Column Layout */}
        <Grid container spacing={4} sx={{ mt: 0.5 }}>
          {/* Left Column - Product Gallery */}
          <Grid size={{ xs: 12, md: 6 }}>
            {isMobile ? (
              <ProductDetailMobileCarousel
                mainImage={getProductImages.mainImage}
                thumbnails={getProductImages.thumbnails}
                productSku={product?.sku}
              />
            ) : (
              <ProductImageGallery
                mainImage={getProductImages.mainImage}
                thumbnails={getProductImages.thumbnails}
                productSku={product?.sku}
              />
            )}
          </Grid>

          {/* Right Column - Product Info & Actions */}
          <Grid size={{ xs: 12, md: 6 }}>
            {!isMobile && <Breadcrumbs productName={product.name} />}
            {/* Product Title and Rating */}
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 1,
              }}
            >
              {product.name}
            </Typography>

            {/* Product Price */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mr: 2,
                }}
              >
                {formatPrice(parseFloat(product.display_price) || 0)}
              </Typography>
            </Box>

            {/* Stock Status - Show for out of stock or low stock */}
            {!inStock || lowStock ? (
              <Box sx={{ mb: 3, display: "flex", alignItems: "center" }}>
                <Chip
                  label={stockStatusText}
                  color={stockStatusColor}
                  size="small"
                  sx={{ mr: 2 }}
                />

                {/* Show items left when quantity is low but still in stock */}
                {lowStock && inStock && product.atp_quantity !== undefined && (
                  <Typography variant="body2" color="text.secondary">
                    ({product.atp_quantity}{" "}
                    {t("store.product.itemsLeft", "items left")})
                  </Typography>
                )}
              </Box>
            ) : null}

            {/* Short Description */}
            <Typography
              variant="body1"
              sx={{ mb: 3, color: theme.palette.text.secondary }}
            >
              {product.short_description}
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: isMobile ? 0 : 2,
                mt: 3,
                mb: 4,
                ...(isMobile && {
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  // py: 2,
                  // px: 2,
                  mt: 0,
                  mb: 0,
                  bgcolor: theme.palette.background.paper,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }),
              }}
            >
              <Button
                variant={isMobile ? "outlined" : "contained"}
                size={isMobile ? "medium" : "large"}
                startIcon={<ShoppingCartOutlined />}
                disabled={!inStock ||product?.delivery_eligible === false}
                onClick={() => handleAddToCart()}
                sx={{
                  flex: 1,
                  py: isMobile ? 1.2 : 1.5,
                  borderRadius: isMobile ? 0 : theme.shape.borderRadius,
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                {addToCart.isPending
                  ? t("common.loading.addToCart", "Adding to cart...")
                  : t("store.product.addToCart", "Add to Cart")}
              </Button>

              <Button
                variant="contained"
                size={isMobile ? "medium" : "large"}
                disabled={!inStock ||product?.delivery_eligible === false}
                onClick={handleBuyNow}
                sx={{
                  flex: 1,
                  py: 1.5,
                  borderRadius: isMobile ? 0 : theme.shape.borderRadius,
                  textTransform: "none",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {t("common.loading.buyNow", "Buy Now")}
              </Button>
            </Box>
            {/* Delivery Location Section */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: "white",
                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Deliver to:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {location
                      ? `${location.country} - ${location.pincode}`
                      : "Select Location"}
                  </Typography>
                </Box>
                {/* Show delivery error if not eligible */}
                {product?.delivery_eligible === false &&
                  product?.delivery_error && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                    >
                      {product.delivery_error}
                    </Typography>
                  )}
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setLocationPopoverOpen(true)}
                sx={{ color: "primary.main", fontWeight: "bold" }}
              >
                {t("common.change", "Change")}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* Product Tabs */}
        <ProductTabs product={product} />
      </Container>
      {/* Notification Alert */}
      {/* {renderNotification()} */}

      {/* Location Popover Modal */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(1px)",
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
            anchorEl={null}
            open={locationPopoverOpen}
            onClose={() => setLocationPopoverOpen(false)}
            initialPincode={location?.pincode}
            onSave={handleLocationSave}
          />
        </Box>
      </Backdrop>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: 2 }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
}
