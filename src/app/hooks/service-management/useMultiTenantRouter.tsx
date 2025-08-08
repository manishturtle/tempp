"use client";

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * A custom router hook that automatically prepends the tenant slug to navigation paths
 */
export function useMultiTenantRouter() {
  const router = useRouter();
  const tenantSlug = useParams().tenant as string || localStorage.getItem('tenant_slug');

  /**
   * Navigate to a route with the tenant slug automatically prepended
   * @param path The path to navigate to (without the tenant slug)
   */
  const push = useCallback((path: string) => {
    // Get tenant slug from context or fallback to localStorage
    let slug = tenantSlug;
    
    if (typeof window !== 'undefined' && !slug) {
      slug = localStorage.getItem('tenant_slug');
    }
    
    if (!slug) {
      console.error('No tenant slug available for navigation');
      return;
    }

    // Handle query parameters properly
    let [basePath, queryString] = path.split('?');
    
    // Remove leading slash if it exists
    if (basePath.startsWith('/')) {
      basePath = basePath.substring(1);
    }
    
    // Construct the full path with tenant slug
    const fullPath = `/${slug}/${basePath}${queryString ? `?${queryString}` : ''}`;
    
    router.push(fullPath);
  }, [router, tenantSlug]);

  /**
   * Replace the current route with a new one with the tenant slug automatically prepended
   * @param path The path to navigate to (without the tenant slug)
   */
  const replace = useCallback((path: string) => {
    // Get tenant slug from context or fallback to localStorage
    let slug = tenantSlug;
    
    if (typeof window !== 'undefined' && !slug) {
      slug = localStorage.getItem('tenant_slug');
    }
    
    if (!slug) {
      console.error('No tenant slug available for navigation');
      return;
    }

    // Handle query parameters properly
    let [basePath, queryString] = path.split('?');
    
    // Remove leading slash if it exists
    if (basePath.startsWith('/')) {
      basePath = basePath.substring(1);
    }
    
    // Construct the full path with tenant slug
    const fullPath = `/${slug}/${basePath}${queryString ? `?${queryString}` : ''}`;
    
    router.replace(fullPath);
  }, [router, tenantSlug]);

  /**
   * Navigate back
   */
  const back = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Force a refresh of the current route
   */
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  /**
   * Create a complete URL with the tenant prefix for links
   * @param path The path without tenant prefix
   * @returns The complete URL with tenant prefix
   */
  const createHref = useCallback((path: string) => {
    // Get tenant slug from context or fallback to localStorage
    let slug = tenantSlug;
    
    if (typeof window !== 'undefined' && !slug) {
      slug = localStorage.getItem('tenant_slug');
    }
    
    if (!slug) {
      console.error('No tenant slug available for navigation');
      return path;
    }

    // Handle query parameters properly
    let [basePath, queryString] = path.split('?');
    
    // Remove leading slash if it exists
    if (basePath.startsWith('/')) {
      basePath = basePath.substring(1);
    }
    
    // Construct the full path with tenant slug
    return `/${slug}/${basePath}${queryString ? `?${queryString}` : ''}`;
  }, [tenantSlug]);

  return {
    push,
    replace,
    back,
    refresh,
    createHref
  };
}
