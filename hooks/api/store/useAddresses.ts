'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/storeapi';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import AuthService from '@/app/auth/services/authService';
import { Address, ApiAddress } from '@/app/types/store/addressTypes';
import { useAuthRefresh } from '@/app/contexts/AuthRefreshContext';
import { SavedAddress, SaveShippingAddressPayload, SaveBillingAddressPayload } from '@/app/types/store/checkout';
// Using the notification system that's already in place in your application
// Replace this with your actual notification system if different

/**
 * Service functions for address operations
 */
export interface UpdateAddressPayload {
  id: number | string;
  full_name?: string;
  business_name?: string;
  gst_number?: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface UpdatedAddressResponse {
  id: string;
  full_name: string;
  type: string;
  business_name: string;
  gst_number: string;
  phone_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export const AddressService = {
  /**
   * PATCH update an address using the new backend endpoint
   * @param tenantSlug - The tenant slug for multi-tenant API
   * @param payload - The address update payload (must include id)
   * @returns Promise with the updated address response
   */
  patchUpdateAddress: async (
    tenantSlug: string,
    payload: UpdateAddressPayload
  ): Promise<UpdatedAddressResponse> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.patch(
      `/om/checkout/update-address/`,
      { address_data: payload },
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }
    );
    return response.data;
  },
  /**
   * Get all addresses for the current user
   * 
   * @returns Promise with the list of addresses
   */
  getAddresses: async (): Promise<Address[]> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.get('/om/checkout/addresses', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    
    // Map the snake_case API response to camelCase Address objects
    // but preserve the address_type property
    return Array.isArray(response.data) ? response.data.map((item: any) => ({
      id: item.id.toString(),
      // Keep the original snake_case fields
      address_type: item.address_type,
      full_name: item.full_name || '',
      address_line1: item.address_line1 || '',
      address_line2: item.address_line2 || '',
      postal_code: item.postal_code || '',
      phone_number: item.phone_number || '',
      is_default: item.is_default,
      business_name: item.business_name || '',
      gst_number: item.gst_number || '',
      // Also include camelCase versions for backward compatibility
      fullName: item.full_name || '',
      addressLine1: item.address_line1 || '',
      addressLine2: item.address_line2 || '',
      city: item.city || '',
      state: item.state || '',
      postalCode: item.postal_code || '',
      country: item.country || '',
      phoneNumber: item.phone_number || '',
      isDefaultShipping: item.address_type === 'SHIPPING' && item.is_default === true,
      isDefaultBilling: item.address_type === 'BILLING' && item.is_default === true
    })) : [];
  },

  /**
   * Add a new address
   * 
   * @param addressData - The address data to add
   * @returns Promise with the created address
   */
  addAddress: async (addressData: Omit<Address, 'id' | 'isDefaultShipping' | 'isDefaultBilling'>): Promise<Address> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.post('/addresses', addressData, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  },
  getAddress: async (): Promise<ApiAddress[]> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.get(`/addresses/my-addresses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true
    });
    
    // Handle the paginated response format
    const results = response.data?.results || [];
    
    return results.map((item: any) => {
      // Convert the API response to match our ApiAddress interface
      const address: ApiAddress = {
        id: item.id.toString(),
        address_type: item.address_type,
        fullName: item.full_name || '',
        addressLine1: item.street_1 || '',
        addressLine2: item.street_2 || '',
        city: item.city || '',
        state: item.state_province || '',
        postalCode: item.postal_code || '',
        country: item.country || '',
        phoneNumber: item.phone_number || '',
        isDefaultShipping: item.is_primary_shipping || false,
        isDefaultBilling: item.is_primary_billing || false
      };
      
      return address;
    });
  },

  /**
   * Update an existing address
   * 
   * @param addressData - The address data to update
   * @returns Promise with the updated address
   */
  updateAddress: async (addressData: Address): Promise<Address> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.put(`/addresses/${addressData.id}`, addressData, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Delete an address
   * 
   * @param addressId - The ID of the address to delete
   * @returns Promise indicating success
   */
  deleteAddress: async (addressId: string): Promise<void> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    await api.delete(`/addresses/${addressId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  },

  /**
   * Set an address as the default shipping address
   * 
   * @param addressId - The ID of the address to set as default
   * @returns Promise with the updated address
   */
  setDefaultShippingAddress: async (addressId: string): Promise<Address> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.post(`/api/v1/addresses/${addressId}/default-shipping`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Set an address as the default billing address
   * 
   * @param addressId - The ID of the address to set as default
   * @returns Promise with the updated address
   */
  setDefaultBillingAddress: async (addressId: string): Promise<Address> => {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const token = AuthService.getToken();
    const response = await api.post(`/api/v1/addresses/${addressId}/default-billing`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  }
};

/**
 * Hook for fetching user addresses
 * 
 * @returns Query results for addresses
 */
export function useGetAddresses() {
  return useQuery<Address[], Error>({
    queryKey: ['addresses'],
    queryFn: AddressService.getAddresses,
    enabled: isAuthenticated()
  });
}
  
/**
 * Hook for adding a new address
 * 
 * @returns Mutation for adding a new address
 */
export function useAddAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AddressService.addAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // Use your application's notification system here
      // toast.success('Address added successfully');
    },
    onError: (error: Error) => {
      console.error('Error adding address:', error);
      // Use your application's notification system here
      // toast.error(`Error adding address: ${error.message}`);
    }
  });
}

/**
 * Hook for updating an existing address
 * 
 * @returns Mutation for updating an address
 */
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AddressService.updateAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // Use your application's notification system here
      // toast.success('Address updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error updating address:', error);
      // Use your application's notification system here
      // toast.error(`Error updating address: ${error.message}`);
    }
  });
}

/**
 * Hook for deleting an address
 * 
 * @returns Mutation for deleting an address
 */
export function useDeleteAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AddressService.deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // Use your application's notification system here
      // toast.success('Address deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting address:', error);
      // Use your application's notification system here
      // toast.error(`Error deleting address: ${error.message}`);
    }
  });
}

/**
 * Hook for setting an address as the default shipping address
 * 
 * @returns Mutation for setting default shipping address
 */
export function useSetDefaultShipping() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AddressService.setDefaultShippingAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // Use your application's notification system here
      // toast.success('Default shipping address updated');
    },
    onError: (error: Error) => {
      console.error('Error setting default shipping address:', error);
      // Use your application's notification system here
      // toast.error(`Error setting default shipping address: ${error.message}`);
    }
  });
}

/**
 * Hook for setting an address as the default billing address
 * 
 * @returns Mutation for setting default billing address
 */
/**
 * React Query mutation hook for PATCH updating an address via the new endpoint
 * @returns Mutation for patch updating address
 */
export function usePatchUpdateAddress(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation<UpdatedAddressResponse, Error, UpdateAddressPayload>({
    mutationFn: (payload: UpdateAddressPayload) =>
      AddressService.patchUpdateAddress(tenantSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // toast.success('Address updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error patch updating address:', error);
      // toast.error(`Error updating address: ${error.message}`);
    },
  });
}

export function useSetDefaultBilling() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: AddressService.setDefaultBillingAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // Use your application's notification system here
      // toast.success('Default billing address updated');
    },
    onError: (error: Error) => {
      console.error('Error setting default billing address:', error);
      // Use your application's notification system here
      // toast.error(`Error setting default billing address: ${error.message}`);
    }
  });
}

// Keep the existing checkout-related hooks for backward compatibility
/**
 * Legacy hook for checkout address operations
 * 
 * @param userId - The user ID to fetch addresses for
 * @returns Saved addresses data and mutations
 */
export function useAddresses(userId?: string) {
  const queryClient = useQueryClient();
  const { refreshAuthState } = useAuthRefresh();
  // Use a consistent query key for addresses to prevent duplicate queries
  const addressesQueryKey = ['savedAddresses'];
  
  // Fetch saved addresses
  const {
    data: savedAddresses,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<SavedAddress[]>({
    queryKey: addressesQueryKey,
    queryFn: async () => {
      try {
        // if (!isAuthenticated()) {
        //   throw new Error('User not authenticated');
        // }
        const token = AuthService.getToken();
        const response = await api.get('/om/checkout/addresses/', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        console.error('Error fetching addresses:', error.response?.data || error.message);
        
        // Get the error message from the response
        const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
        
        // Check if token has expired or is invalid (checking both 401 and 403 status codes)
        if ((error.response?.status === 401 || error.response?.status === 403) && 
            (errorMessage.includes('Token has expired') || 
             errorMessage.includes('Invalid token') || 
             errorMessage.includes('Token is invalid') ||
             errorMessage.includes('Authentication credentials were not provided'))) {
          // Clear the expired/invalid token
          AuthService.clearTokens();
          refreshAuthState();
          // Log the user out and redirect to login
          console.log('Authentication error, logging out:', errorMessage);
        }
        
        throw error;
      }
    },
    enabled: isAuthenticated(), // Run if authenticated, don't require userId
  });
  
  // Save shipping address to checkout session
  const saveShippingAddress = useMutation({
    mutationFn: async (payload: SaveShippingAddressPayload) => {
      try {
        if (isAuthenticated()) {
          // For logged-in users, send to backend
          const token = AuthService.getToken();
          const response = await api.post('/om/checkout/shipping-address/', payload, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            withCredentials: true
          });
          return response.data;
        } else {
        }
      } catch (error: any) {
        console.error('Error saving shipping address:', error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // For logged-in users, invalidate address cache if saving for future
      if (isAuthenticated() && variables.save_address) {
        queryClient.invalidateQueries({ queryKey: addressesQueryKey });
      }
    }
  });
  
  // Create a new address
  const createAddress = useMutation({
    mutationFn: async (addressData: Omit<SavedAddress, 'id'>) => {
      try {
        if (!isAuthenticated()) {
          throw new Error('User not authenticated');
        }
        const token = AuthService.getToken();
        const response = await api.post('/om/account/addresses/', addressData, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        return response.data;
      } catch (error: any) {
        console.error('Error creating address:', error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressesQueryKey });
    }
  });
  
  // Save billing address to checkout session
  const saveBillingAddress = useMutation({
    mutationFn: async (payload: SaveBillingAddressPayload) => {
      try {
        if (isAuthenticated()) {
          // For logged-in users, send to backend
          const token = AuthService.getToken();
          const response = await api.post('/om/checkout/billing-address/', payload, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            withCredentials: true
          });
          return response.data;
        } else {}
  
      } catch (error: any) {
        console.error('Error saving billing address:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // For logged-in users, invalidate address cache if saving a new address
      if (isAuthenticated() && !variables.use_shipping_address && variables.address_data?.save_for_future) {
        queryClient.invalidateQueries({ queryKey: addressesQueryKey });
      }
    }
  });

  return {
    savedAddresses,
    isLoading,
    isError,
    error,
    refetch,
    saveShippingAddress,
    saveBillingAddress,
    createAddress
  };
}
