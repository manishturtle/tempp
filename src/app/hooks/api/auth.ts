/**
 * Authentication related constants and utilities
 */

/**
 * Interface for JWT token payload
 */
export interface JwtPayload {
  token_type: string;
  exp: number;
  iat: number;
  jti: string;
  user_id: number;
  client_id?: number;
  account_id?: number;
  contact_id?: number;
  username?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

/**
 * Get the current tenant slug from localStorage
 * @returns The current tenant slug or null if not found
 */
const getCurrentTenantSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_current_tenant_slug');
};

/**
 * Get the token from localStorage for the current tenant
 * @returns The JWT token or null if not found
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const tenantSlug = getCurrentTenantSlug();
  if (!tenantSlug) {
    console.warn('No tenant slug found in localStorage');
    return null;
  }
  
  // Get token using tenant-specific key
  const tokenKey = `${tenantSlug}_admin_token`;
  const token = localStorage.getItem(tokenKey);
  
  if (!token) {
    console.warn(`No token found for tenant: ${tenantSlug}`);
    return null;
  }
  
  return token;
};

/**
 * Parse JWT token to extract payload
 * @param token - JWT token string
 * @returns Parsed token payload or null if invalid
 */
export const parseJwt = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return null;
  }
};

/**
 * Get JWT payload from stored token
 * @returns Parsed token payload or null if no valid token exists
 */
export const getTokenPayload = (): JwtPayload | null => {
  const token = getToken();
  if (!token) return null;
  return parseJwt(token);
};

/**
 * Get authorization headers with bearer token from localStorage
 * @returns Authorization headers object
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  
  if (!token) {
    const tenantSlug = getCurrentTenantSlug();
    console.warn(`No authentication token found for tenant: ${tenantSlug || 'unknown'}`);
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
};

/**
 * Clear the authentication token for the current tenant
 */
export const clearAuthToken = (): void => {
  const tenantSlug = getCurrentTenantSlug();
  if (tenantSlug) {
    const tokenKey = `${tenantSlug}_admin_token`;
    localStorage.removeItem(tokenKey);
    console.log(`Cleared auth token for tenant: ${tenantSlug}`);
  }
};
