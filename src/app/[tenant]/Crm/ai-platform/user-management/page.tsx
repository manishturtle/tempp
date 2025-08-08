'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  TablePagination
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import { useParams } from 'next/navigation';

interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_super_role: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: Role[];
}

interface RoleOption {
  id: number;
  name: string;
}

export default function UserManagementPage() {
  const tenant_slug = useParams().tenant;
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/users-with-roles/`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSnackbar({ open: true, message: 'Failed to load users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/roles/`,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSnackbar({ open: true, message: 'Failed to load roles', severity: 'error' });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [tenant_slug]);

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles.map(role => role.id));
    setOpenRoleDialog(true);
  };

  const handleCloseRoleDialog = () => {
    setOpenRoleDialog(false);
    setSelectedUser(null);
    setSelectedRoles([]);
  };

  const handleRoleChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setSelectedRoles(typeof value === 'string' ? value.split(',').map(Number) : value as number[]);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || selectedRoles.length === 0) return;
  
    try {
      // Get the app_id from the first selected role (assuming all roles have the same app_id)
      const selectedRole = roles.find(role => role.id === selectedRoles[0]);
      if (!selectedRole) {
        throw new Error('Selected role not found');
      }
  
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/user-roles/`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'X-CSRFToken': getCookie('csrftoken') || '',
          },
          body: JSON.stringify({
            user: selectedUser.id,
            role: selectedRoles,
            app_id: selectedRole.app_id, // Use the app_id from the selected role
            description: 'Role assignment',
            is_active: true
          }),
        }
      );
  
      const responseData = await response.json();
  
      if (!response.ok) {
        // If there are errors in the response, show them
        const errorMessage = responseData.errors ? 
          responseData.errors.join(', ') : 
          'Failed to update roles';
        throw new Error(errorMessage);
      }
  
      await fetchUsers();
      setSnackbar({ 
        open: true, 
        message: responseData.message || 'Roles updated successfully', 
        severity: 'success' 
      });
      handleCloseRoleDialog();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err instanceof Error ? err.message : 'Failed to update roles', 
        severity: 'error' 
      });
    }
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - users.length) : 0;

  return (
    <Box sx={{ width: '100%'}}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>

      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell component="th" scope="row">
                      {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Chip
                              key={role.id}
                              label={role.name}
                              color="primary"
                              size="small"
                              variant="outlined"
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            No roles
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleOpenRoleDialog(user)}
                        size="small"
                        aria-label="edit roles"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Role Assignment Dialog */}
      <Dialog open={openRoleDialog} onClose={handleCloseRoleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Roles</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="roles-label">Roles</InputLabel>
            <Select
              labelId="roles-label"
              id="roles"
              multiple
              value={selectedRoles}
              onChange={handleRoleChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {roles
                    .filter(role => (selected as number[]).includes(role.id))
                    .map((role) => (
                      <Chip key={role.id} label={role.name} size="small" />
                    ))}
                </Box>
              )}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Cancel</Button>
          <Button onClick={handleSaveRoles} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity as 'success' | 'error'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}