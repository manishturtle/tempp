'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { HeaderNavigation } from '@/app/components/Store/HeaderNavigation';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Container, Typography, Paper, Grid, Button, styled, CircularProgress, Alert } from '@mui/material';
// Import the LandingPage component
import { LandingPage } from '@/app/components/Store/Landingpage/LandingPage';
import SlugNotFound from '@/app/components/Store/storeError/SlugNotFound';
import { COCKPIT_API_BASE_URL } from '@/utils/constants';


interface TenantInfo {
  tenant_id: number;
  tenant_schema: string;
  default_url: string;
}

/**
 * Client component that uses useSearchParams
 * This component is wrapped in Suspense to handle the client-side rendering
 */
function HomeContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated and verify tenant
  useEffect(() => {
    const verifyTenant = async () => {
      try {
        // Log full URL information
        console.log('Current URL:', {
          fullUrl: window.location.href,
          pathname: window.location.pathname,
          origin: window.location.origin,
          host: window.location.host,
          search: window.location.search,
          hash: window.location.hash,
          params: Object.fromEntries(searchParams.entries())
        });

        // Get full current URL including store slug
        const fullUrl = window.location.href;
        
        // Extract tenant slug from URL
        const tenantSlug = window.location.pathname.split('/')[1];
        
        // Call tenant verification API
        const apiUrl = new URL(`${COCKPIT_API_BASE_URL}/platform-admin/tenant-by-url/`);
        apiUrl.searchParams.append('default_url', fullUrl);
        
        const response = await fetch(apiUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Tenant verification failed');
        }

        const tenantInfo: TenantInfo = await response.json();
        
        if (tenantInfo) {
          // Store tenant info in local storage with tenant prefix
          localStorage.setItem(`${tenantSlug}_tenantInfo`, JSON.stringify(tenantInfo));
          // http://localhost:8000/api/kumar_manish/tenant-admin/tenant-login-config/
          // Fetch tenant configuration data before navigation
          try {
            const configResponse = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/tenant-login-config/`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (configResponse.ok) {
              const configData = await configResponse.json();
              console.log('Tenant config data:', configData);
              
              // Extract and store specific configuration values individually
              if (configData) {
                // Store localization settings with tenant prefix
                const localization = configData.localization_config || {};
                localStorage.setItem(`${tenantSlug}_appLanguage`, localization.default_language || 'en');
                
                // Store branding configuration with tenant prefix
                const branding = configData.branding_config || {};
                localStorage.setItem(`${tenantSlug}_fontFamily`, branding.default_font_style || 'roboto');
                localStorage.setItem(`${tenantSlug}_themeColor`, branding.primary_brand_color || '');
                localStorage.setItem(`${tenantSlug}_secondaryColor`, branding.secondary_brand_color || '');
                localStorage.setItem(`${tenantSlug}_themeMode`, branding.default_theme_mode || 'system');
                
                // Store logo information with tenant prefix - both dark and light versions
                if (branding.company_logo_dark && branding.company_logo_dark.url) {
                  localStorage.setItem(`${tenantSlug}_logoDark`, branding.company_logo_dark.url);
                }
                if (branding.company_logo_light && branding.company_logo_light.url) {
                  localStorage.setItem(`${tenantSlug}_logoLight`, branding.company_logo_light.url);
                }
                
                // Store company details in a single object
                const companyInfo = configData.company_info || {};
                const companyDetails = {
                  name: companyInfo.company_name || '',
                  address1: companyInfo.registered_address?.address_line_1 || '',
                  address2: companyInfo.registered_address?.address_line_2 || '',
                  city: companyInfo.registered_address?.city || '',
                  state: companyInfo.registered_address?.state || '',
                  country: companyInfo.registered_address?.country || '',
                  pincode: companyInfo.registered_address?.postal_code || '',
                  gstin: companyInfo.tax_id || '',
                  phone: companyInfo.primary_contact_phone || '',
                  email: companyInfo.primary_contact_email || ''
                };
                
                // Store as a single JSON string with tenant prefix
                localStorage.setItem(`${tenantSlug}_companyDetails`, JSON.stringify(companyDetails));
              }
              
              // Store tenant specific information with tenant prefix
              localStorage.setItem('currentTenantSlug', tenantSlug);
              const app_id = localStorage.getItem(`${tenantSlug}_app_id`) || '';
              localStorage.setItem(`${tenantSlug}_app_id`, app_id);
            } else {
              console.error('Failed to fetch tenant configuration');
            }
          } catch (configErr) {
            console.error('Error fetching tenant configuration:', configErr);
          }
          
          // Redirect to product page with tenant slug
          // router.push(`/${tenantSlug}/store/product`);
          return;
        }
        
        setError('Tenant verification failed. Please contact support.');
      } catch (err) {
        console.error('Tenant verification error:', err);
        setError('Failed to verify tenant. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyTenant();
  }, [router, searchParams]);
  


  // Show loading state while verifying tenant
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error if tenant verification failed
  if (error) {
    return (
        <SlugNotFound />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh'}}>
      <HeaderNavigation />
      <LandingPage pageId={1} />
    </Box>
  );
}

/**
 * Home page component for the multi-tenant application
 * Provides entry points to tenant-specific instances
 * 
 * @returns {React.ReactElement} The home page component
 */
export default function Home(): React.ReactElement {
  // Render fallback while HomeContent is loading
  const fallback = (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
  
  return (
    <Suspense fallback={fallback}>
      <HomeContent />
      
    </Suspense>
  );
}
