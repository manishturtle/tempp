'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CartService from '@/app/auth/services/cartService';
import { Cart } from '@/app/types/store/cart';

/**
 * Hook for fetching and manipulating cart data
 */
export function useCart() {
  const queryClient = useQueryClient();
  const cartQueryKey = ['cart'];

  // Fetch cart data
  const {
    data: cart,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Cart>({
    queryKey: cartQueryKey,
    queryFn: async () => {
      // Dynamically fetch delivery parameters from localStorage
      let pincode: string | undefined = undefined;
      let country: string | undefined = undefined;
      let customer_group_selling_channel_id: string | undefined = undefined;
      // Get customer_group_selling_channel_id from localStorage
      if (typeof window !== "undefined") {
        const pathParts = window.location.pathname.split("/");
        const tenantSlug = pathParts[1] || "";
        const segmentKey = `${tenantSlug}_segmentdetails`;
        const segmentRaw = localStorage.getItem(segmentKey);
        if (segmentRaw) {
          try {
            const segmentObj = JSON.parse(segmentRaw);
            customer_group_selling_channel_id = segmentObj.id || undefined;
          } catch (e) {
            // Ignore parse error
          }
        }
      }
      let state: string | undefined = undefined;
      // Get tenantSlug from the current path
      let tenantSlug = "";
      if (typeof window !== "undefined") {
        const pathParts = window.location.pathname.split("/");
        tenantSlug = pathParts[1] || "";
        const locationKey = `${tenantSlug}_location`;
        const locationRaw = localStorage.getItem(locationKey);
        if (locationRaw) {
          try {
            const locationObj = JSON.parse(locationRaw);
            // Support both payload types
            pincode = locationObj.pincode || undefined;
            country = locationObj.country || locationObj.countryCode || undefined;
            state = locationObj.state || undefined;
          } catch (e) {
            // Ignore parse error, fallback to undefined
          }
        }
      }
      // Optionally, get customer_group_selling_channel_id from elsewhere if needed
      return await CartService.getCart({
        pincode,
        country,
        state,
        customer_group_selling_channel_id,
        tenant_country: "India",
        tenant_state: "Maharashtra"
      });
    },
    // Return empty cart if 404
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Add item to cart
  const addToCart = useMutation({
    mutationFn: async (payload: { productSku: string; quantity?: number }) => {
      return await CartService.addToCart(payload.productSku, payload.quantity || 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  // Update cart item quantity
  const updateCartItem = useMutation({
    mutationFn: async (payload: { itemId: string; quantity: number }) => {
      return await CartService.updateCartItemQuantity(payload.itemId, payload.quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  // Remove item from cart
  const removeCartItem = useMutation({
    mutationFn: async (itemId: string) => {
      return await CartService.removeFromCart(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  // Clear all items from cart
  const clearCart = useMutation({
    mutationFn: async () => {
      return await CartService.clearCart();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
    }
  });

  return {
    cart,
    isLoading,
    isError,
    error,
    refetch,
    addToCart: addToCart.mutateAsync,
    isAddingToCart: addToCart.isPending,
    updateCartItem: updateCartItem.mutateAsync,
    isUpdatingCart: updateCartItem.isPending,
    removeFromCart: removeCartItem.mutate,
    isRemovingFromCart: removeCartItem.isPending,
    clearCart: clearCart.mutate,
    isClearingCart: clearCart.isPending,
  };
}
