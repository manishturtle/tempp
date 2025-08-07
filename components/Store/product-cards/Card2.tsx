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
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useTranslation } from "react-i18next";

interface Card2Props {
  image: string;
  title: string;
  price: number;
  currencySymbol?: string;
  description: string;
  isInWishlist?: boolean;
  onAddToCart?: () => void;
  onToggleWishlist?: ((e?: React.MouseEvent) => void) | undefined;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

/**
 * Product card with image, title, description, and action buttons in a row layout
 */
export const Card2: React.FC<Card2Props> = ({
  image,
  title,
  price, // Price is now a prop, but not used in this layout. You could add it if needed.
  description,
  currencySymbol = "₹",
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
        border: `2px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        height: 400, // Total height remains fixed
      }}
    >
      {/* CHANGED: Replaced flexGrow: 1 with a fixed height for consistency */}
      <Box sx={{ position: "relative", height: 180, overflow: "hidden" }}>
        {/* Stock status chips */}
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
            height: "100%",
            width: "100%",
            objectFit: "contain",
            p: 1,
          }}
        />
        {onToggleWishlist && (
          <IconButton
            aria-label={
              isInWishlist
                ? t("wishlist.removeFromWishlist")
                : t("wishlist.addToWishlist")
            }
            sx={{
              position: "absolute",
              top: theme.spacing(1),
              right: theme.spacing(1),
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 1)",
              },
              transition: theme.transitions.create(["color", "transform"], {
                duration: theme.transitions.duration.shorter,
              }),
              ...(isInWishlist && {
                color: theme.palette.error.main,
                transform: "scale(1.1)",
              }),
            }}
            onClick={(e) => {
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
      </Box>

      {/* CHANGED: Consolidated Title and Description into a single CardContent */}
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          height: 160, // Adjusted height to better fit content
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: theme.typography.fontWeightMedium,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            minHeight: "48px", // Reserve space for two lines
          }}
        >
          {title}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            mt: 1,
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
          }}
        >
          {description}
        </Typography>
      </CardContent>

      <CardActions
        sx={{ px: 2, pb: 2, py: 1, justifyContent: "space-between" }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
        >
          <Typography
            variant="h6"
            component="p"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            {`${currencySymbol}${price.toFixed(2)}`}
          </Typography>
          <Button
            variant="contained"
            sx={{
              ...(stockStatus === "OUT_OF_STOCK" && {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
                "&:hover": {
                  backgroundColor: theme.palette.action.disabledBackground,
                },
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
        </Stack>
      </CardActions>
    </Card>
  );
};

export default Card2;
