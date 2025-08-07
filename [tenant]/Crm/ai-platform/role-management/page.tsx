'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Tooltip,
  Alert,
  TablePagination,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  app_id: number;
  created_at: string;
  updated_at: string;
  permissions_count?: number;
  users_count?: number;
}

const RoleManagementPage: React.FC = (): React.ReactElement => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenant_slug = params.tenant;
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchRoles = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/roles/?page=${page + 1}&page_size=${rowsPerPage}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [tenant_slug, page, rowsPerPage]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleViewPermissions = useCallback((roleId: number): void => {
    router.push(`/${tenant_slug}/Crm/ai-platform/role-management/permissions?roleId=${roleId}`);
  }, [router, tenant_slug]);

  const handleEditRole = useCallback((roleId: number): void => {
    router.push(`/${tenant_slug}/Crm/ai-platform/role-management/${roleId}`);
  }, [router, tenant_slug]);

  const handleAddRole = useCallback((): void => {
    router.push(`/${tenant_slug}/Crm/ai-platform/role-management/add`);
  }, [router, tenant_slug]);

  const handleChangePage = useCallback((_: unknown, newPage: number): void => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box mt={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          {t('Roles')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddRole}
          size="small"
          sx={{ textTransform: 'none' }}
        >
          Add Role
        </Button>
      </Box>

      <Card variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>ROLE NAME</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>DESCRIPTION</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>PERMISSIONS</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow 
                  key={role.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {role.name}
                      </Typography>
                      {role.is_default && (
                        <Chip
                          label="Default"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {role.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${role.permissions_count || 0} Permissions`}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1, height: 24 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={role.is_active ? 'Active' : 'Inactive'}
                      color={role.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{
                        borderRadius: 1,
                        height: 24,
                        bgcolor: role.is_active ? 'success.light' : 'action.selected',
                        color: role.is_active ? 'success.dark' : 'text.secondary',
                        '& .MuiChip-label': { px: 1.5 }
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="View Permissions">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPermissions(role.id)}
                          sx={{ color: 'primary.main' }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditRole(role.id)}
                          disabled={role.is_default}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          disabled={role.is_default}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('roleManagement.noRolesFound')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
              color: 'text.secondary'
            }
          }}
        />
      </Card>
    </>
  );
};

export default RoleManagementPage;
