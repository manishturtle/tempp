/**
 * Authentication state management store
 */
import { create } from 'zustand';
import { AuthState } from '@/app/types/auth';
import AuthService from '@/app/auth/services/authService';

/**
 * Extended AuthState to include customer_group_id
 */
interface AuthStateWithCustomerGroup extends AuthState {
  customer_group_id: number | null;
}

interface AuthStore extends AuthStateWithCustomerGroup {
  login: (access: string, refresh: string, user: any) => void;
  logout: () => void;
  initialize: () => void;
}

/**
 * Auth store for managing authentication state
 */
export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  user: null,
  customer_group_id: null,
  
  /**
   * Initialize auth state from localStorage with tenant prefix
   */
  initialize: () => {
    const token = AuthService.getToken();
    const refreshToken = AuthService.getRefreshToken();

    // Get tenant slug from URL
    let tenantSlug = '';
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      tenantSlug = pathParts[0] || '';
    }

    // Get user from localStorage with tenant prefix if available
    const userKey = tenantSlug ? `${tenantSlug}_auth_user` : 'auth_user';
    const customerGroupKey = tenantSlug ? `${tenantSlug}_customer_group_id` : 'customer_group_id';
    const userJson = typeof window !== 'undefined' ? localStorage.getItem(userKey) : null;
    const customerGroupIdStr = typeof window !== 'undefined' ? localStorage.getItem(customerGroupKey) : null;
    const user = userJson ? JSON.parse(userJson) : null;
    const customer_group_id = customerGroupIdStr ? parseInt(customerGroupIdStr, 10) : null;

    set({
      isAuthenticated: !!token,
      token,
      refreshToken,
      user,
      customer_group_id,
    });
  },
  
  /**
   * Login user and set authentication state with tenant prefix
   */
  login: (access: string, refresh: string, user: any, customer_group_id?: number) => {
    // Get tenant slug from URL
    let tenantSlug = '';
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      tenantSlug = pathParts[0] || '';
    }

    // Store user with tenant prefix
    const userKey = `${tenantSlug}_auth_user`;
    const customerGroupKey = `${tenantSlug}_customer_group_id`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(userKey, JSON.stringify(user));
      if (typeof customer_group_id !== 'undefined' && customer_group_id !== null) {
        localStorage.setItem(customerGroupKey, customer_group_id.toString());
      }
    }
    // Store tokens
    AuthService.setToken(access);
    AuthService.setRefreshToken(refresh);

    // Store user in localStorage (legacy/global)
    if (user && typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      }));
    }
    set({
      isAuthenticated: true,
      token: access,
      refreshToken: refresh,
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      } : null,
      customer_group_id: typeof customer_group_id !== 'undefined' ? customer_group_id : null,
    });
  },
  
  /**
   * Logout user and clear authentication state
   */
  logout: () => {
    // Get tenant slug from URL
    let tenantSlug = '';
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      tenantSlug = pathParts[0] || '';

      // Clear tenant-specific auth data
      if (tenantSlug) {
        localStorage.removeItem(`${tenantSlug}_auth_user`);
        localStorage.removeItem(`${tenantSlug}_customer_group_id`);
      }
    }

    // Clear global/legacy keys
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('customer_group_id');
    }

    // Clear all auth tokens
    AuthService.clearTokens();
    set({
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      user: null,
      customer_group_id: null,
    });
  },
}));
