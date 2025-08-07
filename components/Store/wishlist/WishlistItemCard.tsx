'use client';

import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Image from 'next/image';
import { WishlistItem } from '@/app/types/store/wishlist';
import api from '@/lib/storeapi';
import AuthService from '@/app/auth/services/authService';
import CartService from '@/app/auth/services/cartService';
import useNotification from '@/app/hooks/useNotification';
import { formatCurrency } from '@/app/utils/currency';

interface WishlistItemCardProps {
  item: WishlistItem;
}

/**
 * Component to display a single wishlist item
 * 
 * @param props - Component props
 * @returns React component
 */
export const WishlistItemCard: FC<WishlistItemCardProps> = ({ item }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  const { 
    id, 
    product_sku,
    product_details,
    created_at
  } = item;
  
  const {
    name,
    price,
    image_url,
    description,
    category
  } = product_details;
  
  // Default values for missing fields
  const stockStatus = 'in_stock' as const;

  // Add to Cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      try {
        // Use the dedicated CartService to ensure consistent session handling
        return CartService.addToCart(product_details.sku, 1);
      } catch (error: any) {
        console.error('Error adding to cart:', error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate cart query to refresh cart data
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Show success notification
      showNotification({
        message: t('common:wishlist.addedToCart'),
        type: 'success'
      });
      
      // Optionally remove from wishlist after adding to cart
      // Uncomment this if you want to remove items from wishlist after adding to cart
      // removeFromWishlistMutation.mutate();
    },
    onError: (error: any) => {
      showNotification({
        message: t('common:wishlist.errorAddingToCart'),
        type: 'error'
      });
    }
  });

  // Remove from Wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      try {
        const token = AuthService.getToken();
        const response = await api.delete(`om/wishlist/${id}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          withCredentials: true
        });
        
        return response.data;
      } catch (error: any) {
        console.error('Error removing from wishlist:', error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate wishlist query to refresh wishlist data
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      // Show success notification
      showNotification({
        message: t('common:wishlist.itemRemoved'),
        type: 'success'
      });
    },
    onError: (error: any) => {
      showNotification({
        message: t('common:wishlist.errorRemoving'),
        type: 'error'
      });
    }
  });

  const handleAddToCart = () => {
    // Always allow adding to cart since we don't have stock status
    // In a real app, you would check stock status here
    addToCartMutation.mutate();
  };

  const handleRemove = () => {
    removeFromWishlistMutation.mutate();
  };
  
  const getStockStatusDisplay = () => {
    // Always return in stock for now
    return { 
      label: t('inventory.inStock'), 
      color: 'success' as const 
    };
  };
  
  const stockStatusDisplay = getStockStatusDisplay();
  
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: 'none',
      borderRadius: theme.shape.borderRadius,
      transition: theme.transitions.create(['box-shadow']),
      '&:hover': {
        boxShadow: theme.shadows[2]
      }
    }}>
      {/* Product Image */}
      <Box sx={{ 
        position: 'relative', 
        pt: '75%', // 4:3 aspect ratio 
        bgcolor: theme.palette.grey[100]
      }}>
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme.palette.grey[100]
          }}
        >
          {image_url ? (
            <Image
              src={image_url}
              alt={name}
              fill
              style={{ objectFit: 'cover' }}
              onError={(e) => {
                // If image fails to load, show placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('store.product.noImage')}
            </Typography>
          )}
        </Box>
      </Box>
      
      <CardContent sx={{ flexGrow: 1, pt: theme.spacing(2) }}>
        <Typography 
          variant="subtitle1" 
          component="div" 
          fontWeight="medium"
          gutterBottom
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            height: '2.5em'
          }}
        >
          {name}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ mb: 1 }}
        >
          {t('store.product.category')}: {category}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: theme.spacing(1) }}>
          <Typography variant="h6" fontWeight="bold">
            {price ? formatCurrency(price) : t('store.product.priceUnavailable')}
          </Typography>
          
          <Chip 
            label={stockStatusDisplay.label} 
            color={stockStatusDisplay.color}
            size="small"
            sx={{ fontWeight: 'medium' }}
          />
        </Box>
      </CardContent>
      
      <CardActions sx={{ px: theme.spacing(2), pb: theme.spacing(2), pt: 0, gap: theme.spacing(1) }}>
        <Button 
          variant="contained" 
          color="primary"
          fullWidth
          onClick={handleAddToCart}
        >
          {t('common:wishlist.addToCart')}
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary"
          fullWidth
          onClick={handleRemove}
        >
          {t('common:wishlist.remove')}
        </Button>
      </CardActions>
    </Card>
  );
};
