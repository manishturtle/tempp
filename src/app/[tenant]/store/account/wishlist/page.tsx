'use client';

import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Box, 
  Paper, 
  Alert, 
  CircularProgress,
  Button,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useNotification from '@/app/hooks/useNotification';
import api from '@/lib/api';
import { useWishlist } from '@/app/hooks/api/store/useWishlist';
import { useCart } from '@/app/hooks/api/store/useCart';
import { WishlistItemCard } from '@/app/components/Store/wishlist/WishlistItemCard';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Notification from '@/app/components/common/Notification';
import Link from 'next/link';

/**
 * Wishlist page component
 * 
 * @returns React component
 */
export default function WishlistPage(): React.ReactElement {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const { notification, showNotification, hideNotification } = useNotification();
  
  // For demo purposes, we'll assume the user is authenticated
  const isAuthenticated = true;
  
  // Fetch wishlist data
  const { 
    wishlist, 
    isLoading, 
    isError, 
    removeFromWishlist 
  } = useWishlist(isAuthenticated);
  
  // Get cart functionality
  const { addToCart } = useCart();
  
  // For demo purposes, we'll always show the wishlist
  // In a real app, this would check authentication status
  const showLoginPrompt = false;
  
  // Not authenticated
  if (showLoginPrompt) {
    return (
      <Container maxWidth="lg" sx={{ py: theme.spacing(8) }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: theme.spacing(6), 
            textAlign: 'center',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <Typography variant="h5" gutterBottom>
            {t('store.wishlist.loginRequired')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: theme.spacing(4) }}>
            {t('store.wishlist.loginMessage')}
          </Typography>
          <Button 
            component={Link} 
            href="/auth/login" 
            variant="contained" 
            color="primary"
          >
            {t('auth.signIn')}
          </Button>
        </Paper>
      </Container>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: theme.spacing(8) }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: theme.spacing(8) }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: theme.spacing(2) }}>
            {t('common:wishlist.loading')}
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // Error state
  if (isError || !wishlist) {
    return (
      <Container maxWidth="lg" sx={{ py: theme.spacing(8) }}>
        <Alert severity="error" sx={{ mb: theme.spacing(4) }}>
          {t('store.wishlist.errorFetching')}
        </Alert>
      </Container>
    );
  }
  
  // Empty wishlist or no items yet
  if (!wishlist?.results || wishlist.results.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ p: theme.spacing(8) }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: theme.spacing(6), 
            textAlign: 'center',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius
          }}
        >
          <FavoriteBorderIcon 
            sx={{ 
              fontSize: 60, 
              color: theme.palette.grey[400], 
              mb: theme.spacing(2) 
            }} 
          />
          <Typography variant="h5" gutterBottom>
            {t('store.wishlist.empty')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: theme.spacing(4) }}>
            {t('store.wishlist.emptyMessage')}
          </Typography>
          <Button 
            component={Link} 
            href="/store" 
            variant="contained" 
            color="primary"
          >
            {t('store.wishlist.continueShopping')}
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <>
      <Container maxWidth="xl" sx={{ p: theme.spacing(2) }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          {t('common:wishlist.title')}
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: theme.spacing(2) }}>
          {wishlist?.results?.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <WishlistItemCard item={item} />
            </Grid>
          ))}
        </Grid>
      </Container>
      
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
