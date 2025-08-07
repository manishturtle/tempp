import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAuthHeaders } from "../../../hooks/api/auth";
import { GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';

import UserStatCard from './UserStatCard';
import ContentCard from '../../../components/common/ContentCard';
import CustomDataGrid from '../../../components/common/CustomDataGrid';
import AddTenantUserForm from '../../../components/TenantAdmin/user_management/AddTenantUserForm';
import EditTenantUserForm from '../../../components/TenantAdmin/user_management/EditTenantUserForm';
import { COCKPIT_API_BASE_URL } from '../../../../utils/constants';
import { approveUser } from '../../../services/userService';

// Define filter option types
interface FilterOption {
  id: string;
  label: string;
}

// Define user interface
export interface User {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: "active" | "inactive" | "suspended";
  role: string;
  applications: Array<{
    id: string | number;
    name: string;
    icon: React.ReactNode;
    color: string;
  }>;
  is_verified?: boolean;
  // lastLogin?: string;
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
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [superUsers, setSuperUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0); // Add state for inactive users
  
  // Modals state
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [openEditUserModal, setOpenEditUserModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filter states
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  
  // ContentCard filter options
  const filterOptions = [
    {
      field: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        // { value: 'invited', label: 'Invited' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      field: 'role',
      label: 'Role',
      type: 'select' as const,
      options: [
        { value: 'Tenant Admin', label: 'Tenant Admin' },
        { value: 'Member', label: 'Member' }
      ]
    },
    {
      field: 'application',
      label: 'Application',
      type: 'select' as const,
      options: [
        { value: 'CRM', label: 'CRM' },
        { value: 'Analytics', label: 'Analytics' },
        { value: 'Marketing', label: 'Marketing' }
      ]
    }
  ];
  
  // Tab options for ContentCard
  const tabOptions = [
    { value: 'all', label: 'All Users', count: totalCount },
    { value: 'active', label: 'Active', count: activeUsers },
    // { value: 'invited', label: 'Invited', count: pendingInvites },
    { value: 'inactive', label: 'Inactive', count: inactiveUsers }
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
      let status: 'active' | 'inactive' | 'suspended' = 'inactive';
      if (user.is_active) {
        status = 'active';
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
        // lastLogin: user.last_login || undefined,
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
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/?page=${paginationModel.page + 1}&page_size=${paginationModel.pageSize}`,
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
      const inactive = (data.results || []).filter((u: any) => !u.is_active).length;
      
      setActiveUsers(active);
      setSuperUsers(superAdmins);
      setInactiveUsers(inactive); // Set inactive users count
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching tenant users:', err);
      setError(t('errors.failedToLoadUsers'));
     

      setTotalCount(50); // mock total
      setActiveUsers(47);
      setSuperUsers(12);
      setInactiveUsers(3); // Set mock inactive users count
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters to the users
  const applyFilters = (userList: User[]) => {
    let filtered = [...userList];
    
    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(user => {
        return activeFilters.every(filter => {
          switch (filter.field) {
            case 'status':
              return user.status === filter.value;
            case 'role':
              return user.role === filter.value;
            case 'application':
              return user.applications.some(app => app.name === filter.value);
            default:
              return true;
          }
        });
      });
    }
    
    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(user => user.status === activeTab);
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
  }, [tenantSlug, paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    applyFilters(users);
  }, [activeFilters, searchQuery, activeTab]);

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

  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  };
  
  // Handle search change
  const handleSearchChange = (searchTerm: string) => {
    setSearchQuery(searchTerm);
  };
  
  // Handle filter change
  const handleFilterChange = (filters: any[]) => {
    setActiveFilters(filters);
  };
  
  // Handle view change
  const handleViewChange = (view: 'list' | 'grid') => {
    setViewMode(view);
  };
  
  // Handle tab change
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
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

  // Define the columns for the data grid
  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'User',
      flex: 1,
      // minWidth: ,
      renderCell: (params: GridRenderCellParams) => {
        const user = params.row;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
            <Avatar
              alt={`${user.firstName} ${user.lastName}`}
              src={user.avatarUrl}
              sx={{ width: 32, height: 32, mr: 1.5 }}
            />
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: '#334155' }}
              >
                {user.firstName} {user.lastName}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#64748b', fontSize: '0.75rem' }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      // width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status;
        let chipProps: {
          color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
          bg: string;
          textColor: string;
          label: string;
        } = {
          color: 'default',
          bg: '#f5f5f5',
          textColor: '#757575',
          label: 'Unknown'
        };
        
        switch (status) {
          case 'active':
            chipProps = {
              color: 'success',
              bg: '#e8f5e9',
              textColor: '#2e7d32',
              label: 'Active'
            };
            break;
          // case 'invited':
          //   chipProps = {
          //     color: 'warning',
          //     bg: '#fff8e1',
          //     textColor: '#f57f17',
          //     label: 'Invited'
          //   };
          //   break;
          case 'inactive':
            chipProps = {
              color: 'default',
              bg: '#f5f5f5',
              textColor: '#757575',
              label: 'Inactive'
            };
            break;
          case 'suspended':
            chipProps = {
              color: 'error',
              bg: '#ffebee',
              textColor: '#c62828',
              label: 'Suspended'
            };
            break;
        }
        
        return (
          <Chip
            label={chipProps.label}
            size="small"
            color={chipProps.color}
            sx={{
              bgcolor: chipProps.bg,
              color: chipProps.textColor,
              fontWeight: 500,
              borderRadius: '4px',
              textTransform: 'capitalize',
            }}
          />
        );
      },
    },
    {
      field: 'applications',
      headerName: 'Assigned Apps',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const apps = params.row.applications;
        if (!apps || apps.length === 0)
          return <Typography variant="body2">None</Typography>;

        // Show first 3 apps with avatar group for more
        const displayApps = apps.slice(0, 3);
        const hasMore = apps.length > 3;

        return (
          <Stack direction="row" spacing={1}>
            {displayApps.map((app: any) => (
              <Chip
                key={app.id}
                // icon={<Box sx={{ color: app.color, ml: 0.5 }}>{app.icon}</Box>}
                label={app.name}
                size="small"
                sx={{
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  '& .MuiChip-label': { pl: 0.5 },
                }}
              />
            ))}
            {hasMore && (
              <Tooltip
                title={apps
                  .slice(3)
                  .map((app: any) => app.name)
                  .join(', ')}
              >
                <Chip
                  label={`+${apps.length - 3}`}
                  size="small"
                  sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}
                />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'is_verified',
      headerName: 'Verified User',
      flex: 1,
      // width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.row.is_verified ? 'Verified' : 'Not Verified'}
          size="small"
          color={params.row.is_verified ? 'success' : 'error'}
          sx={{
            bgcolor: params.row.is_verified ? '#e8f5e9' : '#ffebee',
            color: params.row.is_verified ? '#2e7d32' : '#c62828',
            fontWeight: 500,
            borderRadius: '4px',
            textTransform: 'capitalize',
          }}
        />
      ),
    },
    // {
    //   field: 'lastLogin',
    //   headerName: 'Last Login',
    //   width: 150,
    //   renderCell: (params: GridRenderCellParams) => {
    //     const lastLogin = params.row.lastLogin;
    //     let displayText = 'Never';
        
    //     if (lastLogin) {
    //       const now = new Date();
    //       const loginDate = new Date(lastLogin);
    //       const diffTime = Math.abs(now.getTime() - loginDate.getTime());
    //       const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    //       const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    //       if (diffHours < 24) {
    //         displayText = diffHours > 0 ? `${diffHours} hours ago` : 'Just now';
    //       } else if (diffDays === 1) {
    //         displayText = 'Yesterday';
    //       } else if (diffDays < 30) {
    //         displayText = `${diffDays} days ago`;
    //       } else {
    //         displayText = loginDate.toLocaleDateString();
    //       }
    //     }
        
    //     return (
    //       <Typography variant="body2" sx={{ color: '#64748b' }}>
    //         {displayText}
    //       </Typography>
    //     );
    //   },
    // },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const userId = params.row.id;
        const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
        
        const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
          setAnchorEl(event.currentTarget);
        };
        
        const handleCloseMenu = () => {
          setAnchorEl(null);
        };
        
        return (
          <>
            <IconButton
              aria-label="more actions"
              onClick={handleOpenMenu}
              size="small"
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                elevation: 2,
                sx: { minWidth: 150 },
              }}
            >
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  handleOpenEditUserModal(userId);
                }}
              >
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
              
              {!params.row.is_verified && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    handleApproveUser(userId, true);
                  }}
                >
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText>Approve User</ListItemText>
                </MenuItem>
              )}
              
              {params.row.is_verified && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    handleApproveUser(userId, false);
                  }}
                >
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Unapprove User</ListItemText>
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  handleOpenDeleteDialog(userId);
                }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
              </MenuItem>
            </Menu>
          </>
        );
      },
    },
  ];

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
            mr: 2,
            px: 2
          }}
        >
          {t('userManagement.inviteNewUser')}
         </Button> 
      </Box>
      
      {/* Stats cards */}
      {/* <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <UserStatCard
            icon={<GroupIcon />}
            iconBgColor="#e8f5e9"
            iconColor="#2e7d32"
            value={activeUsers}
            label={t('userManagement.stats.activeUsers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <UserStatCard
            icon={<SupervisorAccountIcon />}
            iconBgColor="#e3f2fd"
            iconColor="#1976d2"
            value={superUsers}
            label={t('userManagement.stats.superUsers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <UserStatCard
            icon={<PendingActionsIcon />}
            iconBgColor="#fff8e1"
            iconColor="#f57f17"
            value={pendingInvites}
            label={t('userManagement.stats.pendingInvitations')}
          />
        </Grid>
      </Grid> */}
      
      {/* Content Card with DataGrid */}
      <ContentCard
        onSearch={handleSearchChange}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        tabOptions={tabOptions}
        activeTab={activeTab}
      >
        <CustomDataGrid
          rows={filteredUsers}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[5, 10, 25]}
          rowCount={totalCount}
          paginationMode="server"
          loading={loading}
          viewMode={viewMode}
        />
      </ContentCard>
      
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
