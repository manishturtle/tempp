/**
 * Extracts the tenant slug from the current URL
 * Example: For URL 'https://example.com/tenant-slug/dashboard', returns 'tenant-slug'
 * @returns {string} The tenant slug from the URL
 */
import { COCKPIT_API_BASE_URL } from "../../../utils/constants";

export const getTenantFromUrl = (): string => {
  // In a browser environment
  if (typeof window !== 'undefined') {
    // Get the pathname (e.g., "/tenant-slug/dashboard")
    const pathname = window.location.pathname;
    
    // Split the pathname by '/' and filter out empty strings
    const pathSegments = pathname.split('/').filter(segment => segment);
    
    // The first segment should be the tenant slug
    // If no tenant slug is found, return a default or throw an error
    return pathSegments[0] || 'default-tenant';
  }
  
  // For server-side rendering or other environments
  return 'default-tenant';
};

/**
 * Gets the base URL for API requests based on the current tenant
 * @returns {string} The base API URL with the tenant prefix
 */
export const getTenantApiBaseUrl = (): string => {
  const tenant = getTenantFromUrl();
  return `${COCKPIT_API_BASE_URL}/${tenant}`;
};