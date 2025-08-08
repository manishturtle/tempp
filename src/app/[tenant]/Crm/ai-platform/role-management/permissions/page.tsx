'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  AlertTitle,
  Paper,
  Chip,
  Stack,
  Divider,
  Button
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import PermissionsTable from './PermissionsTable';

import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Types
interface Permission {
  id: number;
  is_active: boolean;
  components: any[];
  conditions: any[];
  permission_key: string;
  permission_name: string;
  permission_description: string;
}

interface Feature {
  id: number;
  feature_key: string;
  name: string;
  description: string;
  permissions: Permission[];
  requires_upgrade: boolean;
  read_only: boolean;
}

interface Module {
  id: number | null;
  module_key: string;
  name: string;
  features: Feature[];
}

interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  permissions: Array<{
    id: number;
    is_active: boolean;
    components: Array<{
      id: number;
      name: string;
      description: string;
      is_active: boolean;
    }>;
    conditions: any[];
    permission_key: string;
    permission_name: string;
    permission_description: string;
    read_only?: boolean;
    category?: string;
    feature_name?: string;
  }>;
  created_at: string;
  updated_at: string;
  modules: Module[];
}

/**
 * PermissionsPage component displays detailed permissions for a specific role
 */
export default function PermissionsPage() {
  const tenant_slug = useParams().tenant;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const roleId = searchParams ? parseInt(searchParams.get('roleId') || '0', 10) : 0;

  const fetchRoleData = useCallback(async () => {
    if (!roleId || !tenant_slug) {
      setError('Invalid role or tenant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/role-data/${roleId}/`,
        {
          method: 'GET',
          headers: {
            ...getAuthHeaders(),
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || 
          errorData.message || 
          `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      
      // Transform the data to match the expected structure
      const formattedRole = {
        ...data,
        // Ensure permissions is always an array
        permissions: Array.isArray(data.permissions) 
          ? data.permissions 
          : data.modules?.flatMap((module: any) => 
              module.features?.flatMap((feature: any) => 
                feature.permissions?.map((perm: any) => ({
                  ...perm,
                  feature_name: feature.name
                })) || []
              ) || []
            ) || []
      };
      
      setRole(formattedRole);
    } catch (err) {
      console.error('Error fetching role data:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching role data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [roleId, tenant_slug]);

  useEffect(() => {
    if (roleId > 0) {
      fetchRoleData();
    } else {
      setLoading(false);
      setError('No role ID provided');
    }
  }, [roleId, fetchRoleData]);

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box mt={3}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!role) {
    return (
      <Box mt={3}>
        <Alert severity="info">
          <AlertTitle>No Role Selected</AlertTitle>
          Please select a role to view its permissions
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            {role.name} Permissions
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => router.push(`/${tenant_slug}/Crm/ai-platform/role-management/${roleId}`)}
              disabled={role.is_default}
              sx={{ mr: 1 }}
              size="small"
            >
              Edit Role
            </Button>
            <Chip 
              label={role.is_active ? 'Active' : 'Inactive'} 
              color={role.is_active ? 'success' : 'default'} 
              size="small"
              variant="outlined"
            />
            {role.is_default && (
              <Chip 
                label="Default Role" 
                color="primary" 
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Stack>
        
        {role.description && (
          <Typography variant="body1" color="text.secondary" paragraph>
            {role.description}
          </Typography>
        )}
        
        <Box mt={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Role ID: {role.id} • Created: {new Date(role.created_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>
      
      <Divider sx={{ my: 3 }} />
      
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>
          Permission Details
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Below are all the permissions assigned to this role. Expand each section to view detailed permissions.
        </Typography>
      </Box>
      
      <PermissionsTable role={role} />
    </Box>
  );
}
