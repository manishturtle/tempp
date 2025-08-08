'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/storeapi';
import AuthService from '@/app/auth/services/authService';
import { Wishlist, AddToWishlistPayload } from '@/app/types/store/wishlist';
import { useAuthRefresh } from '@/app/contexts/AuthRefreshContext';

/**
 * Hook for fetching and manipulating wishlist data
 * 
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Wishlist data and mutation functions
 */
export function useWishlist(isAuthenticated: boolean = true) {
  const queryClient = useQueryClient();
  const wishlistQueryKey = ['wishlist'];
  const { refreshAuthState } = useAuthRefresh();

// Helper function to handle authentication errors
const handleApiError = (error: any): never => {
  const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
  
  if ((error.response?.status === 401 || error.response?.status === 403) && 
      (errorMessage.includes('Token has expired') || 
       errorMessage.includes('Invalid token') || 
       errorMessage.includes('Token is invalid') ||
       errorMessage.includes('Authentication credentials were not provided'))) {
    // Clear the expired/invalid token
    AuthService.clearTokens();
    refreshAuthState();
    console.log('Authentication error, tokens cleared:', errorMessage);
  }
  
  console.error('API Error:', error.response?.data || error.message);
  throw error;
};

  // Fetch wishlist data
  const {
    data: wishlist,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Wishlist>({
    queryKey: wishlistQueryKey,
    queryFn: async () => {
      try {
        const token = AuthService.getToken();
        const response = await api.get('om/wishlist/', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        handleApiError(error);
      }
    },
    enabled: isAuthenticated, // Only fetch if the user is authenticated
  });

  // Add item to wishlist
  const addToWishlist = useMutation({
    mutationFn: async (payload: AddToWishlistPayload) => {
      try {
        const token = AuthService.getToken();
        const response = await api.post('om/wishlist/', payload, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        handleApiError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    }
  });

  // Remove item from wishlist
  const removeFromWishlist = useMutation({
    mutationFn: async (itemId: string) => {
      try {
        const token = AuthService.getToken();
        const response = await api.delete(`om/wishlist/${itemId}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        handleApiError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    }
  });

  return {
    wishlist,
    isLoading,
    isError,
    error,
    refetch,
    addToWishlist,
    removeFromWishlist
  };
}
