"use client";

import React from "react";
import {
  Box,
  Grid,
  Typography,
  IconButton,
  useTheme,
  Link,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { CartItem as CartItemType, ProductImage, ProductDetails } from "@/app/types/store/cart";
import { QuantitySelector } from "@/app/components/Store/pdp/QuantitySelector";
import { formatCurrency } from "@/app/utils/currency";
import VerticalQuantitySelector from "../pdp/VerticalQuantitySelector";

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
}

/**
 * Component to display a single cart item
 *
 * @param props - Component props
 * @returns React component
 */
export const CartItem = ({
  item,
  onQuantityChange,
  onRemove,
}: CartItemProps): React.ReactElement => {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { id, product_sku, quantity, product_details } = item;
  console.log("product_details", product_details);

  // Get the tenant slug from the URL
  const tenantSlug =
    typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "";

  // Provide default values for product details
  const {
    name = t("store.product.unknownProduct"),
    images = [],
    price = "0",
    delivery_eligible = true,
    delivery_error = null,
  } = (product_details || {}) as Partial<ProductDetails>;

  // Get the primary image based on sort_order or is_default
  const getPrimaryImage = (): ProductImage | null => {
    if (!images || images.length === 0) return null;
    
    // First try to find the default image
    const defaultImage = images.find((img: ProductImage) => img.is_default);
    if (defaultImage && defaultImage.image) return defaultImage;
    
    // If no default, sort by sort_order and get the first one
    const sortedImages = [...images].sort((a: ProductImage, b: ProductImage) => a.sort_order - b.sort_order);
    const firstImage = sortedImages.find((img: ProductImage) => img.image);
    return firstImage || null;
  };

  const primaryImage = getPrimaryImage();

  // Handle price conversion to number
  const safePrice =
    typeof price === "string" ? parseFloat(price) || 0 : Number(price) || 0;
  const lineTotal = safePrice * quantity;

  const handleQuantityChange = (newQuantity: number): void => {
    onQuantityChange(id, newQuantity);
  };

  const handleRemove = (): void => {
    onRemove(id);
  };

  // We don't have stock_status in the new API response
  // Default to in-stock for now
  const stockStatusMessage = (): string => {
    return t("inventory.inStock");
  };

  return (
    <>
      <Box
        sx={{
          position: "relative",
          border: (theme) => `1px solid ${theme.palette.grey[500]}`,
          borderRadius: 1,
          p: 2,
        }}
      >
        {/* Show close icon only on desktop */}
        {!isMobile && (
          <IconButton
            onClick={handleRemove}
            size="small"
            sx={{
              position: "absolute",
              top: theme.spacing(1),
              right: theme.spacing(1),
              zIndex: 1,
              color: theme.palette.error.main,
              "&:hover": {
                color: theme.palette.error.main,
              },
            }}
            aria-label={t("store.cart.removeItem")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}

        <Grid container spacing={2} alignItems="center">
          {/* Product Image */}
          <Grid size={{ xs: 3, sm: 2 }}>
            <Box
              sx={{
                position: "relative",
                height: { xs: 80, sm: 100 },
                width: "100%",
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: theme.palette.grey[100],
              }}
            >
              {/* Mobile delete button overlaid on image */}
              {isMobile && (
                <IconButton
                  onClick={handleRemove}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: "4px",
                    left: "4px",
                    zIndex: 2,
                    backgroundColor: "white",
                    color: theme.palette.error.main,
                    width: "24px",
                    height: "24px",
                    padding: "2px",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      color: theme.palette.error.dark,
                    },
                  }}
                  aria-label={t("store.cart.removeItem")}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              )}
              {primaryImage && primaryImage.image ? (
                <Image
                  src={primaryImage.image}
                  alt={primaryImage.alt_text || name}
                  fill
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t("store.product.noImage")}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Product Details */}
          {isMobile ? (
            <>
              <Grid size={{ xs: 7 }}>
                <Box>
                  <Link
                    href={`/${tenantSlug}/store/product/${product_sku}/`}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(
                        `/${tenantSlug}/store/product/${product_sku}/`
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
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      sx={{ fontSize: "0.9rem" }}
                    >
                      {name}
                    </Typography>
                  </Link>

                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ mt: 0.5 }}
                  >
                    {formatCurrency(safePrice)}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mt: 0.5,
                      color: "success.main",
                      fontSize: "0.75rem",
                    }}
                  >
                    {stockStatusMessage()}
                  </Typography>
                </Box>
              </Grid>

              {/* Vertical Quantity Selector for mobile */}
              <Grid
                size={{ xs: 2 }}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <VerticalQuantitySelector
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                  maxQuantity={typeof product_details.max_count === "number" && product_details.max_count > 0 ? product_details.max_count : 99}
                  minQuantity={typeof product_details.min_count === "number" && product_details.min_count > 0 ? product_details.min_count : 1}
                />
              </Grid>
            </>
          ) : (
            <>
              <Grid size={{ xs: 9, sm: 4 }}>
                <Box>
                  <Link
                    href={`/${tenantSlug}/store/product/${product_sku}/`}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(
                        `/${tenantSlug}/store/product/${product_sku}/`
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
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {name}
                      </Typography>
                      {delivery_eligible === false && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{
                            fontWeight: "medium",
                            mt: 0.5,
                            display: 'block'
                          }}
                        >
                          ⚠️ {delivery_error}
                        </Typography>
                      )}
                  
                    </Box>
                  </Link>
                  {delivery_eligible === true && (
                    <>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{ mt: 1 }}
                      >
                        {formatCurrency(safePrice)}
                      </Typography>
                    </>
                  )}
                      {product_details.quantity_error && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{
                            fontWeight: "medium",
                            mt: 0.5,
                            display: 'block'
                          }}
                        >
                          ⚠️ {product_details.quantity_error}
                        </Typography>
                      )}
                </Box>
              </Grid>
              {delivery_eligible == true && (

              <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ maxWidth: 120 }}>
                <QuantitySelector
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                  maxQuantity={typeof product_details.max_count === "number" && product_details.max_count > 0 ? product_details.max_count : 99}
                  minQuantity={typeof product_details.min_count === "number" && product_details.min_count > 0 ? product_details.min_count : 1}
                />
                  </Box>
                
              </Grid>
              )}

              {/* Line Total and Remove */}
              <Grid size={{ xs: 6, sm: 3 }} sx={{ textAlign: "right" }}>
                {delivery_eligible === true && (
                  <Typography variant="subtitle1" fontWeight="medium">
                    {formatCurrency(lineTotal)}
                  </Typography>
                )}
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </>
  );
};
