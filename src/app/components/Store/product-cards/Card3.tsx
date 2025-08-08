import React from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface Card3Props {
  image: string;
  title: string;
  price: number;
  originalPrice?: number;
  keyFeatures?: string;
  currencySymbol?: string;
  isInWishlist?: boolean;
  onAddToCart?: () => void;
  onToggleWishlist?: ((e?: React.MouseEvent) => void) | undefined;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}
const parseKeyFeatures = (
  features: string | string[] | undefined
): string[] => {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  try {
    // Handle stringified array format
    if (features.startsWith("[") && features.endsWith("]")) {
      return JSON.parse(features.replace(/'/g, '"'));
    }
    // Handle comma-separated string
    return features.split(",").map((f) => f.trim());
  } catch (e) {
    console.error("Error parsing key features:", e);
    return [];
  }
};

/**
 * Horizontal layout product card with detailed information
 */
export const Card3: React.FC<Card3Props> = ({
  image,
  title,
  price,
  originalPrice,
  keyFeatures,
  currencySymbol = "₹",
  isInWishlist = false,
  onAddToCart,
  stockStatus = "IN_STOCK",
  onToggleWishlist,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // Calculate discount percentage if both price and originalPrice are provided
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <Card
      sx={{
        p: 2,
        borderRadius: 2,
        boxShadow: "none",
        border: `1px solid #ccc`, // Reverted to use theme color
        width: "100%",
      }}
    >
      <Grid container spacing={3} alignItems="flex-start">
        {/* Left Column: Image */}
        {/* On small (sm) screens & up, this takes 4 columns. On extra-small (xs), it takes 12 (full-width). */}
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <Box sx={{ position: "relative" }}>
            {/* Stock status chip */}
            {stockStatus === "LOW_STOCK" && (
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  top: theme.spacing(1),
                  left: theme.spacing(1),
                  zIndex: 1,
                  color: theme.palette.error.main,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.85)",
                  px: 1,
                  borderRadius: 1,
                }}
              >
                {t("store.product.fewLeft", "Only few left")}
              </Typography>
            )}
            {stockStatus === "OUT_OF_STOCK" && (
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  top: theme.spacing(1),
                  left: theme.spacing(1),
                  zIndex: 1,
                  color: theme.palette.error.main,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.85)",
                  px: 1,
                  borderRadius: 1,
                }}
              >
                {t("store.product.outOfStock", "Out of Stock")}
              </Typography>
            )}
            <CardMedia
              component="img"
              image={image}
              alt={title}
              sx={{
                height: 250,
                width: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Grid>

        {/* Right Column: Details & Actions */}
        {/* On small (sm) screens & up, this takes 8 columns. On extra-small (xs), it takes 12 (full-width). */}
        <Grid size={{ xs: 12, sm: 8, md: 9 }}>
          <Grid container>
            {/* Details Section */}
            <Grid size={{ xs: 12, sm: 7, md: 7, lg: 7 }}>
              <Typography
                sx={{
                  fontSize: "16px",
                  fontWeight: theme.typography.fontWeightMedium,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  minHeight: "48px", // Helps prevent layout shifts
                }}
              >
                {title}
              </Typography>
              {parseKeyFeatures(keyFeatures).length > 0 && (
                <List
                  sx={{
                    p: 0,
                    mt: 1,
                    "& .MuiListItem-root": {
                      p: 0,
                      py: 0.5,
                      display: "flex",
                      alignItems: "flex-start",
                    },
                    "& .MuiListItemText-root": {
                      m: 0,
                    },
                  }}
                >
                  {parseKeyFeatures(keyFeatures).map((feature, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemText
                        primary={
                          <Typography
                            component="span"
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              fontSize: "0.8rem",
                              lineHeight: 1.3,
                            }}
                          >
                            <Box component="span" sx={{ mr: 1 }}>
                              •
                            </Box>
                            <Box component="span" sx={{ flex: 1 }}>
                              {feature}
                            </Box>
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>

            {/* Price & Actions Section */}
            <Grid size={{ xs: 12, sm: 5, md: 5, lg: 5 }}>
              <Stack
                sx={{
                  height: "100%",
                  alignItems: {
                    xs: "flex-start",
                    lg: "flex-end",
                    md: "flex-end",
                    sm: "flex-end",
                  },
                  mt: { xs: 2, sm: 0 }, // Add top margin on mobile
                }}
              >
                <Typography
                  variant="h5"
                  component="p"
                  sx={{ fontWeight: theme.typography.fontWeightBold }}
                >
                  {currencySymbol}
                  {price.toLocaleString("en-IN")}
                </Typography>

                {originalPrice && originalPrice > price && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: "line-through" }}
                    >
                      {currencySymbol}
                      {originalPrice.toLocaleString("en-IN")}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="success.main"
                      sx={{ fontWeight: theme.typography.fontWeightBold }}
                    >
                      {discount}% {t("common.off")}
                    </Typography>
                  </Stack>
                )}

                {/* Spacer to push buttons to the bottom */}
                <Box sx={{ flexGrow: 1 }} />

                <Stack
                  spacing={1}
                  sx={{ mt: 2, width: { xs: "100%", sm: "auto" } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      ...(stockStatus === "OUT_OF_STOCK" && {
                        backgroundColor:
                          theme.palette.action.disabledBackground,
                        color: theme.palette.action.disabled,
                      }),
                    }}
                    onClick={(e) => {
                      if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      if (onAddToCart) onAddToCart();
                    }}
                    disabled={stockStatus === "OUT_OF_STOCK"}
                  >
                    {stockStatus === "OUT_OF_STOCK"
                      ? t("store.product.outOfStock")
                      : t("wishlist.addToCart")}
                  </Button>
                  {onToggleWishlist && (
                    <Button
                      variant="outlined"
                      size="large"
                      color={isInWishlist ? "error" : "primary"}
                      onClick={(e) => {
                        if (e) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                        if (onToggleWishlist) onToggleWishlist(e);
                      }}
                    >
                      {isInWishlist
                        ? t("wishlist.removeFromWishlist")
                        : t("wishlist.addToWishlist")}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
};

export default Card3;
