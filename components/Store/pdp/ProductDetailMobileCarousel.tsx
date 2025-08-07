"use client";

import React, { useState, useEffect } from "react";
import { Box, CardMedia, IconButton, useTheme, Snackbar, Alert } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import AuthService from "@/app/auth/services/authService";
import { useAuth } from "@/app/contexts/AuthContext";
import { useWishlist } from "@/app/hooks/api/store/useWishlist";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface ProductDetailMobileCarouselProps {
  mainImage: string;
  thumbnails: string[];
  productSku: string;
}

export const ProductDetailMobileCarousel: React.FC<ProductDetailMobileCarouselProps> = ({
  mainImage,
  thumbnails,
  productSku,
}) => {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
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
  
  // Use thumbnails if available, otherwise use just the main image
  const images = thumbnails.length > 0 ? thumbnails : [mainImage];
  
  // Check if product is in wishlist
  useEffect(() => {
    if (wishlist?.results && productSku) {
      const productInWishlist = wishlist.results.some(
        (item) => item.product_sku.toLowerCase() === productSku.toLowerCase()
      );
      
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
        setNotification((prev) => ({ ...prev, open: false }));
      }, 3000);
      return;
    }
    
    if (isInWishlist) {
      // Find the wishlist item ID for this product - case insensitive comparison
      const wishlistItem = wishlist?.results?.find(
        (item: { product_sku: string; id: number }) => (
          item.product_sku.toLowerCase() === productSku.toLowerCase()
        )
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
              setNotification((prev) => ({ ...prev, open: false }));
            }, 3000);
          },
          onError: () => {
            setNotification({
              open: true,
              message: t('common.error', 'An error occurred. Please try again.'),
              severity: 'error'
            });
            
            // Close notification after 3 seconds
            setTimeout(() => {
              setNotification((prev) => ({ ...prev, open: false }));
            }, 3000);
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
              setNotification((prev) => ({ ...prev, open: false }));
            }, 3000);
          },
          onError: () => {
            setNotification({
              open: true,
              message: t('common.error', 'An error occurred. Please try again.'),
              severity: 'error'
            });
            
            // Close notification after 3 seconds
            setTimeout(() => {
              setNotification((prev) => ({ ...prev, open: false }));
            }, 3000);
          }
        }
      );
    }
  };

  return (
    <React.Fragment>
      <Box 
        sx={{ 
          position: "relative",
          width: "100%",
          height: "100%",
          "& .swiper": {
            width: "100%",
            height: "100%",
          },
          "& .swiper-pagination": {
            bottom: "2px",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            zIndex: 20,
          },
          "& .swiper-pagination-bullet": {
            backgroundColor: theme.palette.common.black,
            opacity: 0.7,
            width: '10px',
            height: '10px',
            margin: '0 4px',
            borderRadius: '50%',
            display: 'inline-block',
            transition: 'all 0.3s ease',
          //   boxShadow: '0 0 4px rgba(255,255,255,0.5)',
          },
          "& .swiper-pagination-bullet-active": {
            backgroundColor: theme.palette.common.black,
            opacity: 1,
            transform: 'scale(1.3)',
          }
        }}
      >
        <IconButton
          aria-label={
            isInWishlist
              ? t("store.product.removeFromWishlist", "Remove from Wishlist")
              : t("store.product.addToWishlist", "Add to Wishlist")
          }
          onClick={handleToggleWishlist}
          sx={{
            position: "absolute",
            top: 8,
            right: 10,
            zIndex: 10, // Higher z-index to stay above swiper
            border: `1px solid ${isInWishlist ? theme.palette.error.main : theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
            "&:hover": {
              backgroundColor: theme.palette.background.paper,
              transform: "scale(1.05)",
              transition: "transform 0.2s",
            },
          }}
        >
          {isInWishlist ? (
            <FavoriteIcon sx={{ color: theme.palette.error.main }} />
          ) : (
            <FavoriteBorderIcon />
          )}
        </IconButton>
        
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{
            clickable: true,
            bulletClass: 'swiper-pagination-bullet',
            bulletActiveClass: 'swiper-pagination-bullet-active',
            renderBullet: (index, className) => {
              return `<span class="${className}"></span>`;
            }
          }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          loop={images.length > 1}
        >
          {images.map((image, index) => (
            <SwiperSlide key={`${productSku}-image-${index}`}>
              <CardMedia
                component="img"
                image={image}
                alt={`Product image ${index + 1}`}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  aspectRatio: "1/1",
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
      
      {/* Snackbar for wishlist notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </React.Fragment>
  );
};
