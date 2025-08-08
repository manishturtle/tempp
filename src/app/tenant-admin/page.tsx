'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  CircularProgress, 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Modal, 
  TextField, 
  Button, 
  Alert
} from '@mui/material';
import Link from 'next/link';

/**
 * Tenant-specific landing page that handles authentication and tenant verification
 * This page handles routes like /erp_turtle/ where erp_turtle is the tenant slug
 * 
 * @returns {React.ReactElement} The tenant landing page component
 */
export default function TenantPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const tenant = params.tenant as string;
  
  // Log URL parameters from useParams - safe for SSR
  console.log('URL Parameters:', params);
  
  // Instead of accessing window directly, use usePathname and other Next.js router hooks
  // We'll log window information in a useEffect hook
  
  // Create a reference for storing window information that will be populated client-side
  const [windowInfo, setWindowInfo] = useState<{
    pathname: string;
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    search: string;
    hash: string;
    origin: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTenantModal, setShowTenantModal] = useState<boolean>(false);
  const [tenantSchema, setTenantSchema] = useState<string>('');
  const [tenantModalError, setTenantModalError] = useState<string | null>(null);

  /**
   * Handles authentication flow including token extraction, tenant verification, and redirects
   */
  const handleAuth = async (): Promise<void> => {
    try {
      // Safety check for server-side rendering
      if (typeof window === 'undefined') {
        console.log('Server-side rendering, skipping auth check');
        return;
      }
      
      // Set loading state only on client side
      setIsLoading(true);

      // For testing - direct token setting
      // This ensures tokens and user data are always available for API calls
      // Remove this in production and rely on the server response
      const testAccessToken = '';
      const testRefreshToken = '';
      
      // Test user data matching the token payload
      const testUserData = {
        id: 2,
        username: 'admin',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        client_id: 1,
        account_id: 29,
        contact_id: 35,
        is_staff: true,
        is_superuser: true
      };
      
      // Store tokens
      localStorage.setItem('token', testAccessToken);
      localStorage.setItem('access_token', testAccessToken); // Legacy format
      localStorage.setItem('refresh_token', testRefreshToken);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(testUserData));
      
      console.log('Set test tokens and user data for development');
      
      // If we're showing the modal and have tenant input, verify it
      if (showTenantModal && tenantSchema) {
        try {
          // Determine API URL based on environment - with safety check for SSR
          // let apiBaseUrl = '/api'; // Default for production
          let origin = '';
          
          // Safe access to window properties
          if (typeof window !== 'undefined') {
            const isLocalDev = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
            origin = window.location.origin; // e.g. 'http://localhost:3000'
            console.log('Using dynamic origin for application_url:', origin);
          }
          
          const checkTenantEndpoint = `https://bedevcockpit.turtleit.in/api/platform-admin/subscription/check-tenant-exist/`;
          console.log('Verifying tenant with schema:', tenantSchema);
          
          // Send API request with the tenant schema from modal
          const checkTenantResponse = await axios.post(
            checkTenantEndpoint,
            {
              application_url: `${origin}/${tenantSchema}`
            }
          );

          const tenantData = checkTenantResponse.data;
          console.log("Tenant verification response:", tenantData);

          if (tenantData?.redirect_to_iam) {
            console.log("Redirecting to IAM:", tenantData.redirect_to_iam);
            // Use Next.js router for navigation if possible, fallback to direct location change
            // when external URL or reload is needed
            if (typeof window !== 'undefined') {
              window.location.href = tenantData.redirect_to_iam;
            }
            return;
          } else {
            // Store tenant data on successful verification
            try {
              // Store tenant information
              localStorage.setItem('tenant_schema', tenantSchema);
              localStorage.setItem('tenant_slug', tenantSchema); // Also store as slug for consistency
              sessionStorage.setItem('hasCheckedTenant', 'true');
              
              // Store authentication token if provided in the response
              if (tenantData?.access_token) {
                console.log("Storing authentication token");
                localStorage.setItem('token', tenantData.access_token);
                // Also store in legacy format for backward compatibility
                localStorage.setItem('access_token', tenantData.access_token);
              } else {
                console.warn("No authentication token received from server");
                // If token not in response, you might need to make a separate auth call here
                // For example: const authResponse = await axios.post('/auth/login/'...)
              }
              
              // Close modal and refresh page to apply changes
              setShowTenantModal(false);
              setIsLoading(false);
              // Safely refresh the page only on client side
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
              return;
            } catch (e) {
              console.warn('Error storing tenant data:', e);
              setTenantModalError('Error saving tenant information');
              setIsLoading(false);
            }
          }
        } catch (verifyError) {
          console.error("Error verifying tenant:", verifyError);
          setTenantModalError('Failed to verify tenant. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // First load - show the modal for tenant verification
      setIsLoading(false);
      setShowTenantModal(true);
      
    } catch (error) {
      console.error("Error in auth flow:", error);
      setError("Authentication error occurred. Please try again.");
      setIsLoading(false);
      
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
        try {
          localStorage.removeItem('token');
        } catch (e) {
          console.warn('Error removing token from localStorage:', e);
        }
        // Instead of reloading immediately, let the user see the error
        // Only attempt to reload if we're on the client side
        if (typeof window !== 'undefined') {
          setTimeout(() => window.location.reload(), 3000);
        }
      }
    }
  };

  /**
   * Closes the tenant schema modal
   */
  const handleCloseModal = (): void => {
    setShowTenantModal(false);
    setTenantModalError(null);
  };

  useEffect(() => {
    let isMounted = true;
    // Safety check for server-side rendering
    if (typeof window === 'undefined') {
      console.log('Server-side rendering, skipping effect');
      return;
    }
    
    // Now that we're on the client side, we can safely capture window information
    setWindowInfo({
      pathname: window.location.pathname,
      href: window.location.href,
      protocol: window.location.protocol,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin
    });
    
    // Log client-side information
    console.log('Current URL path:', window.location.pathname);
    console.log('Full URL:', window.location.href);
    console.log('Full URL components:', {
      protocol: window.location.protocol,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin
    });
    
    // Initialize auth flow
    const initAuth = async () => {
      try {
        await handleAuth();
      } catch (error) {
        console.error('Error in auth initialization:', error);
        if (isMounted) {
          setError('Authentication error occurred');
          setIsLoading(false);
        }
      }
    };
    
    initAuth();

    // Add error handling for uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      setError('An unexpected error occurred. Please try refreshing the page.');
    };

    window.addEventListener('error', handleError);
    return () => {
      isMounted = false;
      window.removeEventListener('error', handleError);
    };
  }, []);

  // During server-side rendering, show a minimal loading state
  if (typeof window === 'undefined') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

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
          {showTenantModal ? 'Verifying tenant...' : 'Loading...'}
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
    <>
      <Modal
        open={showTenantModal}
        onClose={handleCloseModal}
        aria-labelledby="tenant-schema-modal-title"
        aria-describedby="tenant-schema-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2
        }}>
          <Typography id="tenant-schema-modal-title" variant="h6" component="h2" gutterBottom>
            Tenant Verification
          </Typography>
          
          <Typography id="tenant-schema-modal-description" variant="body2" sx={{ mb: 3 }}>
            Please enter the tenant name to verify
          </Typography>
          
          {tenantModalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {tenantModalError}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Tenant Name"
            value={tenantSchema}
            onChange={(e) => setTenantSchema(e.target.value)}
            margin="normal"
            variant="outlined"
            autoFocus
            placeholder="e.g. erp_turtle"
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handleCloseModal}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Proceed'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
}
