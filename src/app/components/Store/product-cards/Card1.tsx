import React from 'react';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useTranslation } from 'react-i18next';

interface Card1Props {
  image: string;
  title: string;
  price: number;
  currencySymbol?: string;
  isInWishlist?: boolean;
  onAddToCart?: () => void;
  onToggleWishlist?: ((e?: React.MouseEvent) => void) | undefined;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

/**
 * Compact product card with image, title, price and action buttons
 */
export const Card1: React.FC<Card1Props> = ({
  image,
  title,
  price,
  currencySymbol = '₹',
  isInWishlist = false,
  onAddToCart,
  onToggleWishlist,
  stockStatus = 'IN_STOCK',
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        margin: 'auto',
        borderRadius: 2,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        border: `2px solid ${theme.palette.divider}`,
        height: 300,
      }}
    >
      <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        {/* Stock status chip */}
        {stockStatus === 'LOW_STOCK' && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: theme.spacing(1),
              left: theme.spacing(1),
              zIndex: 1,
              color: theme.palette.error.main,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.85)',
              px: 1,
              borderRadius: 1,
            }}
          >
            {t('store.product.fewLeft', 'Only few left')}
          </Typography>
        )}
        {stockStatus === 'OUT_OF_STOCK' && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: theme.spacing(1),
              left: theme.spacing(1),
              zIndex: 1,
              color: theme.palette.error.main,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.85)',
              px: 1,
              borderRadius: 1,
            }}
          >
            {t('store.product.outOfStock', 'Out of Stock')}
          </Typography>
        )}
        <CardMedia
          component="img"
          image={image}
          alt={title}
          sx={{
            height: '100%',
            width: '100%',
            objectFit: 'contain',
            p: 1,
          }}
        />
        {onToggleWishlist && (
        <IconButton
          aria-label={isInWishlist ? t('wishlist.removeFromWishlist') : t('wishlist.addToWishlist')}
          sx={{
            position: 'absolute',
            top: theme.spacing(1),
            right: theme.spacing(1),
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
            },
            transition: theme.transitions.create(['color', 'transform'], {
              duration: theme.transitions.duration.shorter,
            }),
            ...(isInWishlist && {
              color: theme.palette.error.main,
              transform: 'scale(1.1)',
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

      {/* CHANGED: Set a fixed height for CardContent for consistent alignment */}
      <CardContent sx={{ pt: 1, height: 60 }}>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: theme.typography.fontWeightMedium,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2, // Allows up to 2 lines of text
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </Typography>
      </CardContent>

      <CardActions>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
        >
          <Typography variant="h6" component="p" sx={{ fontWeight: theme.typography.fontWeightBold }}>
            {`${currencySymbol}${price.toFixed(2)}`}
          </Typography>
          <IconButton
            aria-label={t('wishlist.addToCart')}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
              ...(stockStatus === 'OUT_OF_STOCK' && {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
                cursor: 'not-allowed',
                '&:hover': {
                  backgroundColor: theme.palette.action.disabledBackground,
                }
              }),
            }}
            disabled={stockStatus === 'OUT_OF_STOCK'}
            onClick={(e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              if (onAddToCart) onAddToCart();
            }}
          >
            <ShoppingCartIcon />
          </IconButton>
        </Stack>
      </CardActions>
    </Card>
  );
};

export default Card1;