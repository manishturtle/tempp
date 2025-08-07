"use client";

import React, { useState, useEffect } from "react";
import { Box, Grid, CardMedia, Paper, useTheme, Snackbar, Alert } from "@mui/material";
import { IconButton } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/storeapi";
import AuthService from "@/app/auth/services/authService";
import { useAuth } from "@/app/contexts/AuthContext";
import { useWishlist } from "@/app/hooks/api/store/useWishlist";

interface ProductImageGalleryProps {
  mainImage: string;
  thumbnails?: string[];
  productSku?: string;
}

/**
 * Product image gallery component for product detail page
 * Displays main product image with thumbnails for gallery navigation
 *
 * @param props - Component props
 * @returns React component
 */
export const ProductImageGallery = ({
  mainImage,
  thumbnails = [],
  productSku,
}: ProductImageGalleryProps): React.ReactElement => {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [currentImage, setCurrentImage] = useState<string>(mainImage);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Get wishlist data to check if product is in wishlist
  const { wishlist, addToWishlist: addToWishlistMutation, removeFromWishlist } = useWishlist(isAuthenticated);
  const [isInWishlist, setIsInWishlist] = useState<boolean>(false);

  // If no thumbnails provided, create mock thumbnails from the main image
  const displayThumbnails = thumbnails.length > 0 ? thumbnails : [mainImage];
  
  // Check if product is in wishlist
  useEffect(() => {
    if (wishlist?.results && productSku) {
      console.log('Wishlist items:', wishlist.results);
      console.log('Current product SKU:', productSku);
      
      const productInWishlist = wishlist.results.some(
        (item) => item.product_sku.toLowerCase() === productSku.toLowerCase()
      );
      
      console.log('Is product in wishlist?', productInWishlist);
      setIsInWishlist(!!productInWishlist);
    }
  }, [wishlist, productSku]);
  
  // Handle toggling wishlist
  const handleToggleWishlist = (): void => {
    if (!productSku) return;
    
    const token = AuthService.getToken();
    if (!token) {
      setNotification({
        open: true,
        message: t('store.product.loginRequired', 'Please log in to manage your wishlist'),
        severity: 'info',
      });
      
      // Close notification after 3 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, open: false }));
      }, 3000);
      return;
    }
    
    if (isInWishlist) {
      // Find the wishlist item ID for this product - case insensitive comparison
      const wishlistItem = wishlist?.results?.find(
        (item) => item.product_sku.toLowerCase() === productSku.toLowerCase()
      );
      
      if (wishlistItem?.id) {
        // Remove from wishlist - convert ID to string as expected by the API
        removeFromWishlist.mutate(wishlistItem.id.toString(), {
          onSuccess: () => {
            setIsInWishlist(false);
            setNotification({
              open: true,
              message: t('store.product.removedFromWishlist', 'Product removed from wishlist'),
              severity: 'success'
            });
            
            // Close notification after 3 seconds
            setTimeout(() => {
              setNotification(prev => ({ ...prev, open: false }));
            }, 3000);
          },
          onError: () => {
            setNotification({
              open: true,
              message: t('store.product.errorRemovingFromWishlist', 'Error removing product from wishlist'),
              severity: 'error'
            });
            
            // Close notification after 5 seconds
            setTimeout(() => {
              setNotification(prev => ({ ...prev, open: false }));
            }, 5000);
          }
        });
      }
    } else {
      // Add to wishlist
      addToWishlistMutation.mutate(
        { product_sku: productSku },
        {
          onSuccess: () => {
            setIsInWishlist(true);
            setNotification({
              open: true,
              message: t('store.product.addedToWishlist', 'Product added to wishlist'),
              severity: 'success'
            });
            
            // Close notification after 3 seconds
            setTimeout(() => {
              setNotification(prev => ({ ...prev, open: false }));
            }, 3000);
          },
          onError: () => {
            setNotification({
              open: true,
              message: t('store.product.errorAddingToWishlist', 'Error adding product to wishlist'),
              severity: 'error'
            });
            
            // Close notification after 5 seconds
            setTimeout(() => {
              setNotification(prev => ({ ...prev, open: false }));
            }, 5000);
          }
        }
      );
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          width: "100%",
          maxWidth: "100%",
          alignItems: "flex-start",
        }}
      >
      {/* Thumbnail List (Shown only if more than 1 image) */}
      {displayThumbnails.length > 1 && (
        <Box
        sx={{
          order: { xs: 2, md: 1 }, // Add this line
          display: "flex",
          flexDirection: { xs: "row", md: "column" },
          gap: 1,
          overflowX: { xs: "auto", md: "hidden" },
          overflowY: { xs: "hidden", md: "auto" },
          maxHeight: { md: 400 },
          width: { xs: "100%", md: 90 },
          flexShrink: 0,
          justifyContent: { xs: "center", md: "flex-start" },
          pr: { md: 1 },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
        }}
        >
          {displayThumbnails.map((thumbnail, index) => (
            <Paper
              key={index}
              elevation={0}
              onClick={() => setCurrentImage(thumbnail)}
              sx={{
                border: `2px solid ${
                  currentImage === thumbnail
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                cursor: "pointer",
                borderRadius: 1,
                width: 80,
                height: 80,
                flexShrink: 0,
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.light,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardMedia
                component="img"
                image={thumbnail}
                alt={`Thumbnail ${index + 1}`}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Paper>
          ))}
        </Box>
      )}

      {/* Main Image */}
      <Paper
        elevation={0}
        sx={{
          order: { xs: 1, md: 2 },
          position: "relative", // ✅ Needed for positioning heart icon
          borderRadius: theme.shape.borderRadius,
          border: `1px solid #ccc`,
          height: 400,
          width: "100%",
          overflow: "hidden",
          p: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // backgroundColor: theme.palette.background.default,
        }}
      >
        <IconButton
          aria-label={isInWishlist ? t('store.product.removeFromWishlist', 'Remove from Wishlist') : t('store.product.addToWishlist', 'Add to Wishlist')}
          onClick={handleToggleWishlist}
          sx={{
            position: "absolute",
            top: 8,
            right: 10,
            zIndex: 2,
            border: `1px solid ${isInWishlist ? theme.palette.error.main : theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              backgroundColor: theme.palette.background.paper,
              transform: 'scale(1.05)',
              transition: 'transform 0.2s',
            },
          }}
        >
          {isInWishlist ? (
            <FavoriteIcon sx={{ color: theme.palette.error.main }} />
          ) : (
            <FavoriteBorderIcon />
          )}
        </IconButton>

        {/* Main Product Image */}
        <CardMedia
          component="img"
          image={currentImage}
          alt="Product"
          sx={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </Paper>
    </Box>
    
    {/* Snackbar for wishlist notifications */}
    <Snackbar
      open={notification.open}
      autoHideDuration={6000}
      onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
        severity={notification.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
    </>
  );
};
