/**
 * Cart API service
 * Handles all cart-related API calls with proper cookie handling
 */
import axios, { AxiosInstance } from 'axios';

/**
 * Cart Service with session management
 */
const CartService = {
  _api: null as unknown as AxiosInstance,
  _tenantSchema: null as string | null,
  
  /**
   * Get tenant schema from localStorage with tenant prefix
   */
  _getTenantSchema(): string {
    if (typeof window === 'undefined') {
      throw new Error('Cannot determine tenant schema on server side');
    }
    
    // First try to get tenant slug from URL or localStorage
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    let tenantSlug = pathSegments[0];
    
    if (!tenantSlug) {
      tenantSlug = localStorage.getItem('currentTenantSlug') || '';
    }
    
    if (tenantSlug) {
      // Try to get tenant info from localStorage with tenant prefix (case insensitive)
      const tenantKeys = Object.keys(localStorage);
      const tenantInfoKey = tenantKeys.find(key => 
        key.toLowerCase() === `${tenantSlug.toLowerCase()}_tenantinfo`
      );
      
      if (tenantInfoKey) {
        try {
          const tenantInfoStr = localStorage.getItem(tenantInfoKey);
          if (tenantInfoStr) {
            const tenantInfo = JSON.parse(tenantInfoStr);
            if (tenantInfo?.tenant_schema) {
              return tenantInfo.tenant_schema;
            }
          }
        } catch (e) {
          console.error('Error parsing tenant info from localStorage:', e);
          // Continue to fallback methods
        }
      }
    }
    
    // Fallback to session storage (for backward compatibility)
    const sessionData = sessionStorage.getItem('tenantInfo');
    if (sessionData) {
      try {
        const tenantInfo = JSON.parse(sessionData);
        if (tenantInfo?.tenant_schema) {
          return tenantInfo.tenant_schema;
        }
      } catch (e) {
        console.error('Error parsing tenant info from session:', e);
      }
    }
    
    // Try environment variable as last resort
    if (process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA) {
      return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA;
    }
    
    throw new Error('Tenant schema could not be determined. Please ensure you are properly authenticated and tenant information is available.');
  },
  
  /**
   * Initialize API instance for cart operations
   */
  _init() {
    if (!this._api) {
      const tenantSchema = this._getTenantSchema();
      this._api = axios.create({
        baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8045/api/v1'}/${tenantSchema}/`,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true, // Always include credentials for cookie handling
      });
    }
    return this._api;
  },
  
  /**
   * Add item to cart
   * @param productSku Product SKU
   * @param quantity Quantity to add
   * @returns Promise with cart data
   */
  async addToCart(productSku: string, quantity: number = 1) {
    try {
      const api = this._init();
      const sanitizedSku = productSku.trim().replace(/[^\w\-]/g, '');
      
      const payload = {
        product_sku: sanitizedSku,
        quantity
      };
      console.log('Sanitized SKU:', sanitizedSku);
      
      console.log('Adding to cart with payload:', payload);
      
      const response = await api.post('/om/cart/items/', payload);
      console.log('Add to cart response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('Add to cart error:', error.response?.data || error.message);
      
      // Extract validation errors from the response if available
      if (error.response?.data) {
        throw new Error(JSON.stringify(error.response.data));
      }
      throw error;
    }
  },
  
  /**
   * Get cart contents
   * @param params Optional delivery parameters
   * @returns Promise with cart data
   */
  async getCart(params?: {
    pincode?: string;
    country?: string;
    state?: string;
    customer_group_selling_channel_id?: string | number;
    tenant_country?: string;
    tenant_state?: string;
  }) {
    try {
      const api = this._init();
      
      // Build query string if parameters are provided
      let url = '/om/cart/';
      if (params) {
        const queryParams = new URLSearchParams();
        
        if (params.pincode) {
          queryParams.append('pincode', params.pincode);
        }
        if (params.country) {
          queryParams.append('country', params.country);
        }
        if (params.state) {
          queryParams.append('state', params.state);
        }
        if (params.customer_group_selling_channel_id) {
          queryParams.append('customer_group_selling_channel_id', String(params.customer_group_selling_channel_id));
        }
        if (params.tenant_country) {
          queryParams.append('tenant_country', params.tenant_country);
        }
        if (params.tenant_state) {
          queryParams.append('tenant_state', params.tenant_state);
        }
        
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Get cart error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Remove item from cart
   * @param itemId Cart item ID
   * @returns Promise with cart data
   */
  async removeFromCart(itemId: string) {
    try {
      const api = this._init();
      const response = await api.delete(`/om/cart/items/${itemId}/`);
      return response.data;
    } catch (error: any) {
      console.error('Remove from cart error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Update cart item quantity
   * @param itemId Cart item ID
   * @param quantity New quantity
   * @returns Promise with cart data
   */
  async updateCartItemQuantity(itemId: string, quantity: number) {
    try {
      const api = this._init();
      const response = await api.put(`/om/cart/items/${itemId}/`, { quantity });
      return response.data;
    } catch (error: any) {
      console.error('Update cart item error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Clear all items from cart
   * @returns Promise with empty cart
   */
  async clearCart(): Promise<any> {
    try {
      const api = this._init();
      const response = await api.post('/om/cart/clear/');
      return response.data;
    } catch (error: any) {
      console.error('Clear cart error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default CartService;
