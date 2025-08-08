'use client';

import React, { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { ThemeProvider } from '@/app/theme/ThemeContext';
import { LanguageProvider } from '@/app/i18n/LanguageContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/app/i18n/i18n-config';
import { QueryProvider } from '@/app/components/providers/QueryProvider';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import ClientLayout from '@/app/components/ClientLayout';
import { usePathname, useRouter } from 'next/navigation';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: {
    tenant: string;
  };
}

/**
 * Layout for tenant-specific routes
 * Provides all necessary context providers and styling for tenant pages
 */
export default function TenantLayout({
  children,
  params,
}: TenantLayoutProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const prevTenantRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    // Extract tenant slug from URL path
    // Example: /Atad18/crm/ -> Atad18
    const pathParts = pathname.split('/');
    const currentTenantSlug = pathParts[1]; // The tenant slug is the first part of the path
    
    // Only proceed if we have a valid tenant slug from the URL
    if (!currentTenantSlug) {
      console.warn('No tenant slug found in URL path');
      return;
    }
    
    // Check if tenant has changed
    const hasTenantChanged = prevTenantRef.current && prevTenantRef.current !== currentTenantSlug;
    
    // If tenant changed, clear the previous tenant's token
    if (hasTenantChanged) {
      const prevTokenKey = `${prevTenantRef.current}_admin_token`;
      localStorage.removeItem(prevTokenKey);
      console.log(`Cleared token for previous tenant: ${prevTenantRef.current}`, { tokenKey: prevTokenKey });
    }
    
    // Update the previous tenant reference
    prevTenantRef.current = currentTenantSlug;
    
    // Store current tenant slug in localStorage for future reference
    const tenantKey = 'admin_current_tenant_slug';
    localStorage.setItem(tenantKey, currentTenantSlug);
    
    // Get the stored token for the current tenant
    const tokenKey = `${currentTenantSlug}_admin_token`;
    const storedToken = localStorage.getItem(tokenKey);
    
    // Log token status for debugging
    if (storedToken) {
      console.log(`Found token for tenant: ${currentTenantSlug}`, { tokenKey });
    } else {
      console.log(`No token found for tenant: ${currentTenantSlug}`, { tokenKey });
    }
  }, [pathname]);
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <LanguageProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </LanguageProvider>
          </I18nextProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

/**
 * Component that conditionally wraps content in ClientLayout based on authentication status
 */
function ConditionalLayout({ 
  children 
}: { 
  children: React.ReactNode 
}): React.ReactElement {
  const { token, isLoading } = useAuth();
  const pathname = usePathname();
  const pathParts = pathname.split('/');
  const currentTenantSlug = pathParts[1];
  
  // Get the token from localStorage for the current tenant
  const storedToken = currentTenantSlug 
    ? localStorage.getItem(`${currentTenantSlug}_admin_token`)
    : null;
  
  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If no token exists for the current tenant, render children directly without ClientLayout
  if (!storedToken) {
    return <>{children}</>;
  }
  
  // If token exists, wrap children in ClientLayout
  return <ClientLayout>{children}</ClientLayout>;
}
