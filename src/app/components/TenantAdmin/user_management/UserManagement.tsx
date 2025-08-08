import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { getAuthHeaders } from '@/app/hooks/api/auth';

import UserStatCard from './UserStatCard';
import UserFilterBar from './UserFilterBar';
import UserTable, { User } from './UserTable';
import AddTenantUserForm from './AddTenantUserForm';
import EditTenantUserForm from './EditTenantUserForm';
import { COCKPIT_API_BASE_URL } from '../../../../utils/constants';
import { approveUser } from '../../../../services/userService';

// Define filter option types
interface FilterOption {
  id: string;
  label: string;
}

interface UserManagementProps {
  /**
   * The slug of the current tenant
   */
  tenantSlug: string;
}

/**
 * UserManagement component that provides a comprehensive user management interface
 */
export const UserManagement: React.FC<UserManagementProps> = ({ tenantSlug }) => {
  // Use hardcoded strings instead of translations for now
  const t = (key: string, options?: any): string => {
    const translations: Record<string, string> = {
      'userManagement.title': 'User Management',
      'userManagement.subtitle': 'Invite and manage users for your tenant',
      'userManagement.inviteNewUser': 'Add User',
      'userManagement.stats.activeUsers': 'Active Users',
      'userManagement.stats.superUsers': 'Tenant Admins',
      'userManagement.stats.pendingInvitations': 'Pending Invites',
      'userManagement.deleteUser.title': 'Delete User',
      'userManagement.deleteUser.confirmMessage': `Are you sure you want to delete user ${options?.email || ''}? This action cannot be undone.`,
      'errors.authTokenNotFound': 'Authentication token not found',
      'errors.failedToFetchUsers': 'Failed to fetch users',
      'errors.failedToLoadUsers': 'Failed to load users',
      'errors.failedToDeleteUser': 'Failed to delete user',
      'common.showing': 'Showing',
      'common.to': 'to',
      'common.of': 'of',
      'common.users': 'users',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete'
    };
    
    return translations[key] || key;
  };
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [superUsers, setSuperUsers] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  
  // Modals state
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [openEditUserModal, setOpenEditUserModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [appFilter, setAppFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample filter options (should be fetched from API in a real application)
  const statusOptions: FilterOption[] = [
    { id: 'all', label: 'All Status' },
    { id: 'active', label: 'Active' },
    { id: 'invited', label: 'Invited' },
    { id: 'inactive', label: 'Inactive' }
  ];

  const roleOptions: FilterOption[] = [
    { id: 'all', label: 'All Roles' },
    { id: 'admin', label: 'Tenant Admin' },
    { id: 'member', label: 'Member' }
  ];

  const appOptions: FilterOption[] = [
    { id: 'all', label: 'All Applications' },
    { id: 'crm', label: 'CRM' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'hr', label: 'HR' }
  ];

  // Create a mock for application icons
  const getApplicationIcon = (appName: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
      'CRM': { icon: <GroupIcon fontSize="small" />, color: '#1976d2' },
      'Analytics': { icon: <SupervisorAccountIcon fontSize="small" />, color: '#4caf50' },
      'Marketing': { icon: <PendingActionsIcon fontSize="small" />, color: '#ff9800' }
    };

    return iconMap[appName] || { icon: <GroupIcon fontSize="small" />, color: '#757575' };
  };

  // Transform API users to our User format
  const transformApiUsers = (apiUsers: any[]): User[] => {
    return apiUsers.map(user => {
      // Map applications with icons
      const apps = (user.applications || []).map((app: any) => {
        const appName = app.application__application_name;
        const { icon, color } = getApplicationIcon(appName);
        return {
          id: app.id,
          name: appName,
          icon,
          color
        };
      });

      // Get user status
      let status: 'active' | 'inactive' | 'invited' | 'suspended' = 'inactive';
      if (user.is_active) {
        status = 'active';
      } else if (!user.last_login) {
        status = 'invited';
      }

      return {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        avatarUrl: `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`,
        status,
        role: user.is_super_admin ? 'Tenant Admin' : 'Member',
        applications: apps,
        lastLogin: user.last_login || undefined,
        is_verified: user.is_verified || false
      };
    });
  };

  // Load users from API or use mock data
  const loadUsers = async () => {
    setLoading(true);
    try {
      const authHeader = getAuthHeaders();
      
      if (!Object.keys(authHeader).length) {
        throw new Error(t('errors.authTokenNotFound'));
      }

      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/?page=${page}&page_size=${rowsPerPage}`,
        {
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(t('errors.failedToFetchUsers'));
      }

      const data = await response.json();
      const transformedUsers = transformApiUsers(data.results || []);
      
      setUsers(transformedUsers);
      applyFilters(transformedUsers);
      setTotalCount(data.count || 0);
      
      // Calculate stats
      const active = (data.results || []).filter((u: any) => u.is_active).length;
      const superAdmins = (data.results || []).filter((u: any) => u.is_super_admin).length;
      const pending = (data.results || []).filter((u: any) => !u.last_login).length;
      
      setActiveUsers(active);
      setSuperUsers(superAdmins);
      setPendingInvites(pending);
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching tenant users:', err);
      setError(t('errors.failedToLoadUsers'));
      
      // Use mock data for display
      const mockUsers: User[] = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@company.com',
          avatarUrl: 'https://ui-avatars.com/api/?name=John+Smith&background=random',
          status: 'active',
          role: 'Tenant Admin',
          applications: [
            { id: '1', name: 'CRM', icon: getApplicationIcon('CRM').icon, color: getApplicationIcon('CRM').color },
            { id: '2', name: 'Analytics', icon: getApplicationIcon('Analytics').icon, color: getApplicationIcon('Analytics').color },
            { id: '3', name: 'Marketing', icon: getApplicationIcon('Marketing').icon, color: getApplicationIcon('Marketing').color }
          ],
          lastLogin: new Date().toISOString()
        },
        {
          id: '2',
          firstName: 'Sarah',
          lastName: 'Wilson',
          email: 'sarah.wilson@company.com',
          avatarUrl: 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=random',
          status: 'active',
          role: 'Member',
          applications: [
            { id: '2', name: 'Analytics', icon: getApplicationIcon('Analytics').icon, color: getApplicationIcon('Analytics').color },
            { id: '3', name: 'Marketing', icon: getApplicationIcon('Marketing').icon, color: getApplicationIcon('Marketing').color }
          ],
          lastLogin: new Date(Date.now() - 86400000).toISOString() // yesterday
        },
        {
          id: '3',
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@company.com',
          avatarUrl: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=random',
          status: 'invited',
          role: 'Member',
          applications: [
            { id: '1', name: 'CRM', icon: getApplicationIcon('CRM').icon, color: getApplicationIcon('CRM').color }
          ],
          lastLogin: undefined
        },
        {
          id: '4',
          firstName: 'Emily',
          lastName: 'Davis',
          email: 'emily.davis@company.com',
          avatarUrl: 'https://ui-avatars.com/api/?name=Emily+Davis&background=random',
          status: 'invited',
          role: 'Member',
          applications: [
            { id: '3', name: 'Marketing', icon: getApplicationIcon('Marketing').icon, color: getApplicationIcon('Marketing').color }
          ],
          lastLogin: new Date(Date.now() - 1209600000).toISOString() // 2 weeks ago
        }
      ];
      
      setUsers(mockUsers);
      applyFilters(mockUsers);
      setTotalCount(50); // mock total
      setActiveUsers(47);
      setSuperUsers(12);
      setPendingInvites(5);
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters to the users
  const applyFilters = (userList: User[]) => {
    let filtered = [...userList];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      const isAdmin = roleFilter === 'admin';
      filtered = filtered.filter(user => 
        (isAdmin && user.role === 'Tenant Admin') || (!isAdmin && user.role === 'Member')
      );
    }
    
    // Apply app filter
    if (appFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.applications.some(app => app.name.toLowerCase() === appFilter)
      );
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(query) || 
        user.lastName.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
    }
    
    setFilteredUsers(filtered);
  };

  useEffect(() => {
    if (tenantSlug) {
      loadUsers();
    }
  }, [tenantSlug, page, rowsPerPage]);

  useEffect(() => {
    applyFilters(users);
  }, [statusFilter, roleFilter, appFilter, searchQuery]);

  // Modal handlers
  const handleOpenAddUserModal = () => setOpenAddUserModal(true);
  const handleCloseAddUserModal = () => setOpenAddUserModal(false);

  const handleOpenEditUserModal = (userId: string | number) => {
    setSelectedUserId(userId);
    setOpenEditUserModal(true);
  };
  
  const handleCloseEditUserModal = () => {
    setSelectedUserId(null);
    setOpenEditUserModal(false);
  };

  const handleOpenDeleteDialog = (userId: string | number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setSelectedUserId(userId);
      setOpenDeleteDialog(true);
    }
  };
  
  const handleCloseDeleteDialog = () => {
    setSelectedUser(null);
    setSelectedUserId(null);
    setOpenDeleteDialog(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      const authHeader = getAuthHeaders();
      
      if (!Object.keys(authHeader).length) {
        throw new Error(t('errors.authTokenNotFound'));
      }

      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/${selectedUserId}/`,
        {
          method: 'DELETE',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(t('errors.failedToDeleteUser'));
      }

      // Reload users after successful deletion
      loadUsers();
      handleCloseDeleteDialog();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(t('errors.failedToDeleteUser'));
    }
  };

  const handleUserCreated = () => {
    loadUsers();
    handleCloseAddUserModal();
  };

  const handleUserUpdated = () => {
    loadUsers();
    handleCloseEditUserModal();
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleApproveUser = async (userId: string | number, approve: boolean) => {
    try {
      setLoading(true);
      await approveUser(tenantSlug, userId, approve);
      
      // Reload users after successful approval/unapproval
      await loadUsers();
      
      // Show success message (you can implement a toast/snackbar here)
      console.log(`User ${approve ? 'approved' : 'unapproved'} successfully`);
    } catch (error) {
      console.error(`Error ${approve ? 'approving' : 'unapproving'} user:`, error);
      setError(`Failed to ${approve ? 'approve' : 'unapprove'} user`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="fontWeightSemibold" color="text.primary">
            {t('userManagement.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {t('userManagement.subtitle')}
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddUserModal}
          sx={{ 
            textTransform: 'none',
            borderRadius: 1,
            py: 1,
            px: 2
          }}
        >
          {t('userManagement.inviteNewUser')}
        </Button>
      </Box>
      
      {/* Stats cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <UserStatCard
            icon={<GroupIcon />}
            iconBgColor="#e8f5e9"
            iconColor="#2e7d32"
            value={activeUsers}
            label={t('userManagement.stats.activeUsers')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <UserStatCard
            icon={<SupervisorAccountIcon />}
            iconBgColor="#e3f2fd"
            iconColor="#1976d2"
            value={superUsers}
            label={t('userManagement.stats.superUsers')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <UserStatCard
            icon={<PendingActionsIcon />}
            iconBgColor="#fff8e1"
            iconColor="#f57f17"
            value={pendingInvites}
            label={t('userManagement.stats.pendingInvitations')}
          />
        </Grid>
      </Grid>
      
      {/* Filters */}
      <UserFilterBar
        onStatusFilterChange={setStatusFilter}
        onRoleFilterChange={setRoleFilter}
        onAppFilterChange={setAppFilter}
        onSearchChange={setSearchQuery}
        statusOptions={statusOptions}
        roleOptions={roleOptions}
        appOptions={appOptions}
      />
      
      {/* Users table */}
      <Box sx={{ mb: 3 }}>
        <UserTable 
          users={filteredUsers}
          onEditUser={handleOpenEditUserModal}
          onDeleteUser={handleOpenDeleteDialog}
          onApproveUser={handleApproveUser}
        />
      </Box>
      
      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t('common.showing')} {Math.min((page - 1) * rowsPerPage + 1, totalCount)} {t('common.to')} {Math.min(page * rowsPerPage, totalCount)} {t('common.of')} {totalCount} {t('common.users')}
        </Typography>
        <Pagination 
          count={Math.ceil(totalCount / rowsPerPage)}
          page={page}
          onChange={handlePageChange}
          color="primary"
          shape="rounded"
        />
      </Box>
      
      {/* Modals */}
      <AddTenantUserForm
        open={openAddUserModal}
        onClose={handleCloseAddUserModal}
        onUserCreated={handleUserCreated}
      />
      
      {selectedUserId && (
        <EditTenantUserForm
          open={openEditUserModal}
          onClose={handleCloseEditUserModal}
          onUserUpdated={handleUserUpdated}
          userId={selectedUserId}
        />
      )}
      
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-user-dialog-title"
      >
        <DialogTitle id="delete-user-dialog-title">
          {t('userManagement.deleteUser.title')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('userManagement.deleteUser.confirmMessage', { 
              email: selectedUser?.email 
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDeleteUser} color="error">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
