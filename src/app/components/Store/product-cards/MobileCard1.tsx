import React from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Stack,
  Typography,
  useTheme,
  Grid,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useTranslation } from "react-i18next";

interface MobileCard1Props {
  image: string;
  title: string;
  price: number;
  currencySymbol?: string;
  description?: string;
  isInWishlist?: boolean;
  onAddToCart?: () => void;
  onToggleWishlist?: ((e?: React.MouseEvent) => void) | undefined;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

/**
 * Mobile-optimized product card with row layout
 * Image on left, price/description/cart button on right, wishlist at top right
 */
export const MobileCard1: React.FC<MobileCard1Props> = ({
  image,
  title,
  price,
  currencySymbol = "₹",
  description,
  isInWishlist = false,
  onAddToCart,
  onToggleWishlist,
  stockStatus = "IN_STOCK",
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        margin: "auto",
        borderRadius: 2,
        boxShadow: "none",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "row",
        width: "100%",
        position: "relative",
        overflow: "hidden", // Changed from visible to hidden to prevent overflow
      }}
    >
      {/* Left side - Product Image */}
      <Box
        sx={{
          position: "relative",
          width: "35%",
          minWidth: "90px",
          maxWidth: "120px",
          aspectRatio: "1/1",
          p: 1,
        }}
      >
        {/* Stock status chip */}
        {stockStatus === "LOW_STOCK" && (
          <Chip
            label={t("store.product.lowStock")}
            color="warning"
            size="small"
            sx={{
              position: "absolute",
              top: theme.spacing(0.5),
              left: theme.spacing(0.5),
              zIndex: 1,
              fontSize: "0.625rem",
            }}
          />
        )}
        {stockStatus === "OUT_OF_STOCK" && (
          <Chip
            label={t("store.product.outOfStock")}
            color="error"
            size="small"
            sx={{
              position: "absolute",
              top: theme.spacing(0.5),
              left: theme.spacing(0.5),
              zIndex: 1,
              fontSize: "0.625rem",
            }}
          />
        )}
        <CardMedia
          component="img"
          image={image}
          alt={title}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: 1,
          }}
        />
      </Box>

      {/* Right side - Product Info */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          p: 1,
          pr: 3.5, // Extra padding on right for both buttons
          position: "relative",
          overflow: "hidden", // Prevent overflow issues
        }}
      >
        {/* Action buttons - top right */}
        <Box
          sx={{
            position: "absolute",
            top: theme.spacing(0.5),
            right: theme.spacing(0.5),
            bottom: theme.spacing(0.5),
            width: "32px", // Fixed width for icons column
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            zIndex: 1, // Ensure icons stay on top
          }}
        >
          {/* Wishlist button */}
          {onToggleWishlist && (
            <IconButton
              aria-label={
                isInWishlist
                  ? t("wishlist.removeFromWishlist")
                  : t("wishlist.addToWishlist")
              }
              size="small"
              sx={{
                backgroundColor: "transparent",
                padding: "4px",
                width: "28px",
                height: "28px",
                minWidth: "28px", // Ensure fixed size
                minHeight: "28px",
                transition: theme.transitions.create(["color", "transform"], {
                  duration: theme.transitions.duration.shorter,
                }),
                ...(isInWishlist && {
                  color: theme.palette.error.main,
                }),
              }}
              onClick={(e: React.MouseEvent) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                if (onToggleWishlist) onToggleWishlist(e);
              }}
            >
              {isInWishlist ? (
                <FavoriteIcon fontSize="small" />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </IconButton>
          )}
          
          {/* Cart Icon Button */}
          <IconButton
            aria-label={t("store.product.addToCart", "Add to Cart")}
            color="primary"
            size="small"
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              padding: "4px",
              width: "28px",
              height: "28px",
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
              ...(stockStatus === "OUT_OF_STOCK" && {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
                cursor: "not-allowed",
                "&:hover": {
                  backgroundColor: theme.palette.action.disabledBackground,
                },
              }),
            }}
            disabled={stockStatus === "OUT_OF_STOCK"}
            onClick={(e: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              if (onAddToCart) onAddToCart();
            }}
          >
            <ShoppingCartIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: theme.typography.fontWeightMedium,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            mb: 1,
            lineHeight: "1.2",
            pr: 5, // Add right padding to avoid text overlapping with buttons
          }}
        >
          {title}
        </Typography>

        {/* Description */}
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              mb: 1,
              lineHeight: "1.2",
            }}
          >
            {description}
          </Typography>
        )}

        {/* Price */}
        <Typography
          variant="body1"
          component="p"
          sx={{
            fontWeight: theme.typography.fontWeightBold,
            fontSize: 16,
            lineHeight: "1.2",
            mt: "auto",
          }}
        >
          {`${currencySymbol}${price.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          })}`}
        </Typography>
      </Box>
    </Card>
  );
};

export default MobileCard1;
