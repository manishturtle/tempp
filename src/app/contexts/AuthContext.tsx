'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { apiEndpoints, setAuthToken } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  currentTenant: string | null;
  login: (credentials: { email: string; password: string }, tenantSlug?: string) => Promise<void>;
  logout: (tenantSlug?: string) => Promise<void>;
  checkAuth: (tenantSlug?: string) => Promise<void>;
  setCurrentTenant: (tenantSlug: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(() => {
    // Initialize with the current tenant from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_current_tenant_slug');
    }
    return null;
  });

  /**
   * Get the token for a specific tenant
   * @param tenantSlug - The tenant slug (defaults to current tenant)
   * @returns The stored token or null if not found
   */
  const getTenantToken = (tenantSlug: string | null = currentTenant): string | null => {
    if (!tenantSlug) return null;
    const tokenKey = `${tenantSlug}_admin_token`;
    return localStorage.getItem(tokenKey);
  };
  
  /**
   * Set the token for a specific tenant
   * @param tenantSlug - The tenant slug
   * @param token - The token to store
   */
  const setTenantToken = (tenantSlug: string, token: string): void => {
    const tokenKey = `${tenantSlug}_admin_token`;
    localStorage.setItem(tokenKey, token);
  };

  // Set the current tenant and initialize auth state
  useEffect(() => {
    if (currentTenant) {
      const tenantToken = getTenantToken(currentTenant);
      if (tenantToken) {
        setToken(tenantToken);
        setAuthToken(tenantToken);
        checkAuth(currentTenant);
      } else {
        setToken(null);
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    }
  }, [currentTenant]);

  const login = async (credentials: { email: string; password: string }, tenantSlug: string | null = currentTenant) => {
    if (!tenantSlug) {
      throw new Error('Tenant slug is required for login');
    }

    try {
      setIsLoading(true);
      // Include tenant slug in the login endpoint
      const response = await api.post(`${apiEndpoints.auth.login}${tenantSlug}/`, credentials);
      
      // If token is returned from the API, store it with tenant prefix
      if (response.data.token) {
        setToken(response.data.token);
        setTenantToken(tenantSlug, response.data.token);
        setAuthToken(response.data.token);
        
        // Set current tenant after successful login
        setCurrentTenant(tenantSlug);
        localStorage.setItem('admin_current_tenant_slug', tenantSlug);
      }
      
      // Set user data from response
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (tenantSlug: string | null = currentTenant) => {
    try {
      setIsLoading(true);
      
      if (tenantSlug) {
        // Clear tenant-specific token
        const tokenKey = `${tenantSlug}_admin_token`;
        localStorage.removeItem(tokenKey);
        
        // If logging out from current tenant, clear auth state
        if (tenantSlug === currentTenant) {
          setToken(null);
          setAuthToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setCurrentTenant(null);
          localStorage.removeItem('admin_current_tenant_slug');
        }
        
        try {
          // Try to call logout API if possible
          await api.post(apiEndpoints.auth.logout);
        } catch (apiError) {
          console.warn('Logout API call failed, proceeding with client-side cleanup', apiError);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async (tenantSlug: string | null = currentTenant) => {
    try {
      setIsLoading(true);
      
      if (!tenantSlug) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      
      // Get token from localStorage using tenant-specific key
      const tokenKey = `${tenantSlug}_admin_token`;
      const storedToken = localStorage.getItem(tokenKey);
      
      if (!storedToken) {
        // No token found for this tenant, user is not authenticated
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      
      // Parse the JWT token to get user information instead of making an API call
      try {
        // Extract the payload part of the JWT token (second part)
        const base64Url = storedToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        
        const payload = JSON.parse(jsonPayload);
        
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < currentTime) {
          // Token is expired
          throw new Error('Token expired');
        }
        
        // Set user information from token payload
        setUser({
          id: payload.user_id?.toString() || '',
          email: payload.email || '',
          name: payload.username || '',
          // Add other user properties as needed
        });
        
        setToken(storedToken);
        setAuthToken(storedToken);
        setIsAuthenticated(true);
      } catch (tokenError) {
        console.error('Error parsing token:', tokenError);
        // Invalid token, remove it
        if (tenantSlug) {
          localStorage.removeItem(`${tenantSlug}_admin_token`);
        }
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setCurrentTenant(null);
        localStorage.removeItem('currentTenant');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear tokens on authentication failure
      setToken(null);
      if (currentTenant) {
        localStorage.removeItem(`${currentTenant}_admin_token`);
      }
      setAuthToken(null);
      
      setUser(null);
      setIsAuthenticated(false);
      setCurrentTenant(null);
      localStorage.removeItem('currentTenant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        token,
        currentTenant,
        login,
        logout,
        checkAuth,
        setCurrentTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
