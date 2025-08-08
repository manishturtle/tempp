"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  CircularProgress
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Import our new UserManagement component
import UserManagement from '../../../../components/TenantAdmin/tenant_management/UserManagement';

export default function TenantUserManagementPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    // const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    // const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    
    // if (!token || !userData || !tenantSlug) {
    //   // Redirect to login if not logged in or tenant not available
    //   if (tenantSlug) {
    //     router.push(`/${tenantSlug}/tenant-admin/login`);
    //   } else {
    //     router.push('/');
    //   }
    //   return;
    // }
    
    try {
      // // Check if userData exists before parsing
      // if (!userData) {
      //   console.error('User data is undefined or null');
      //   // Redirect to login if user data is missing
      //   localStorage.removeItem('token');
      //   localStorage.removeItem('user');
      //   router.push(`/${tenantSlug}/tenant-admin/login`);
      //   return;
      // }
      
      // const parsedUser = JSON.parse(userData);
      // setUser(parsedUser);
      
      // Check if user is tenant admin
      // if (!parsedUser.is_tenant_admin) {
      //   // Redirect to login if not a tenant admin
      //   localStorage.removeItem('token');
      //   localStorage.removeItem('user');
      //   window.location.href = `/${tenantSlug}/tenant-admin/login`;
      //   return;
      // }
      
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push(`/${tenantSlug}/Crm/tenant-admin/login`);
    }
  }, [router, tenantSlug]);

  if (loading || !tenantSlug) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Breadcrumbs navigation */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm/tenant-admin/dashboard`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm/tenant-admin/dashboard`);
          }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">User Management</Typography>
      </Breadcrumbs>
      
      {/* Modern User Management component */}
      <UserManagement tenantSlug={tenantSlug} />
    </>
  );
}
