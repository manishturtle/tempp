'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { CircularProgress, Box, Typography, Container, Paper, Button } from '@mui/material';
import Link from 'next/link';
import { COCKPIT_API_BASE_URL } from '@/utils/constants';

/**
 * Tenant-specific landing page that handles authentication and tenant verification
 * This page handles routes like /erp_turtle/ where erp_turtle is the tenant slug
 * 
 * @returns {React.ReactElement} The tenant landing page component
 */
export default function TenantPage(): React.ReactElement {
  const params = useParams();
  const tenant = params.tenant as string;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles authentication flow including token extraction, tenant verification, and redirects
   */
  const handleAuth = async (): Promise<void> => {
    try {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const tenant_slug = urlParams.get('tenant_slug') || tenant;
      const hasCheckedTenant = sessionStorage.getItem('hasCheckedTenant');
      const app_id = urlParams.get('app_id');

      // If we have a token in URL, we just logged in - store it and skip tenant check
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('tenant_slug', tenant_slug as string);
        localStorage.setItem('app_id', app_id || '');
        // Remove token from URL without refreshing page
        const newUrl = window.location.pathname +
          window.location.search.replace(/[?&]token=[^&]+/, '') +
          window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        setIsLoading(false);
        return;
      }

      // Only skip tenant check if we have both a token and have checked tenant before
      const storedToken = localStorage.getItem('token');
      const storedTenantSlug = localStorage.getItem('tenant_slug');
      if (storedToken && hasCheckedTenant && storedTenantSlug) {
        setIsLoading(false);
        return;
      }

      // Mark that we've checked tenant in this session
      sessionStorage.setItem('hasCheckedTenant', 'true');

      console.log("Checking tenant...", currentUrl);


      // Only check tenant if we have no token
      const checkTenantResponse = await axios.post(
        `${COCKPIT_API_BASE_URL}/platform-admin/subscription/check-tenant-exist/`,
        {
          application_url: currentUrl,
        }
      );

      const tenantData = checkTenantResponse.data;
      console.log("tenant check response:", tenantData);

      if (tenantData?.redirect_to_iam) {
        console.log("Redirecting to IAM:", tenantData.redirect_to_iam);
        window.location.href = tenantData.redirect_to_iam;
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in auth flow:", error);
      setError("Authentication error occurred. Please try again.");
      setIsLoading(false);
      
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
        localStorage.removeItem('token');
        // Instead of reloading immediately, let the user see the error
        setTimeout(() => window.location.reload(), 3000);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for token in URL or initiate tenant check
    handleAuth();
  }, []);

  useEffect(() => {
    // Clean up any reload count when component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('reloadCount');
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Verifying tenant: {tenant}...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          p: 3
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body1">
          Please check your URL or contact support.
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to {tenant}
        </Typography>
        
        <Typography variant="body1" paragraph>
          Please select a module to continue:
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 3, mt: 4 }}>
          <Paper 
            component={Link}
            href={`/${tenant}/Crm`}
            sx={{ 
              p: 3, 
              textAlign: 'center', 
              textDecoration: 'none',
              color: 'text.primary',
              transition: 'all 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <Typography variant="h6" gutterBottom>CRM</Typography>
            <Typography variant="body2">Manage customer relationships</Typography>
          </Paper>
          
          <Paper 
            component={Link}
            href={`/${tenant}/Masters`}
            sx={{ 
              p: 3, 
              textAlign: 'center', 
              textDecoration: 'none',
              color: 'text.primary',
              transition: 'all 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <Typography variant="h6" gutterBottom>Masters</Typography>
            <Typography variant="body2">Manage master data</Typography>
          </Paper>
          
          <Paper 
            component={Link}
            href={`/${tenant}/Admin`}
            sx={{ 
              p: 3, 
              textAlign: 'center', 
              textDecoration: 'none',
              color: 'text.primary',
              transition: 'all 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
          >
            <Typography variant="h6" gutterBottom>Admin</Typography>
            <Typography variant="body2">Administrative tools</Typography>
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
}
