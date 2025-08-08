"use client";

/**
 * Account List Page
 * 
 * Main page component for listing, filtering, and managing customer accounts
 */
import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { Box, Typography, Container, Button, Chip, Avatar, Stack, Link, Skeleton, Alert, CircularProgress, TextField, MenuItem, Select, FormControl, InputLabel, FormControlLabel, Switch, FormHelperText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFetchAccounts, useFetchAccountStats, useFetchAccount } from '@/app/hooks/api/customers';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { Account } from '@/app/types/customers';
import { useRouter, useParams } from 'next/navigation';
import { AccountViewProvider, useAccountView } from '../view/AccountViewContext';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ContactsIcon from '@mui/icons-material/Contacts';
import HomeIcon from '@mui/icons-material/Home';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccountStatsCards from '@/app/components/admin/customers/AccountStatsCards';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import { FilterState } from '@/app/types/customers';
import ContentCard, { FilterOption } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import { GridColDef, GridRowParams, GridSortModel } from '@mui/x-data-grid';

// Wrapper component that provides the DrawerContext and AccountViewContext
export default function AccountsPageWrapper() {
  return (
    <AccountViewProvider>
      <DrawerProvider>
        <Suspense fallback={<div className="p-4">Loading accounts list...</div>}>
          <AccountsPage />
        </Suspense>
      </DrawerProvider>
    </AccountViewProvider>
  );
}

// Main component that uses the DrawerContext
function AccountsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // State for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('all');
  
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for view mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'customer_group_name', 'status', 'phone', 'email', 'is_active', 'actions'
  ]);
  
  // State for pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });
  
  // State for sorting
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  
  // State for active filters
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  
  // Fetch account statistics
  const { data: statsData, isLoading: isLoadingStats } = useFetchAccountStats();
  
  // Convert sort model to API ordering parameter
  const getOrderingParam = () => {
    if (sortModel.length === 0) return undefined;
    
    const { field, sort } = sortModel[0];
    return sort === 'desc' ? `-${field}` : field;
  };

  // Prepare API parameters based on active tab, search, and sorting
  const apiParams = useMemo(() => {
    const params: { page: number; pageSize: number; status?: string; search?: string; ordering?: string } = {
      page: paginationModel.page + 1, // API uses 1-based pagination
      pageSize: paginationModel.pageSize,
    };
    
    // Add status filter if not 'all'
    if (activeTab !== 'all') {
      params.status = activeTab;
    }
    
    // Add search term if present
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    // Add ordering if present
    const ordering = getOrderingParam();
    if (ordering) {
      params.ordering = ordering;
    }
    
    return params;
  }, [paginationModel, activeTab, searchTerm, sortModel]);
  
  // Fetch accounts data with optimized loading strategy
  const { 
    data: accountsData, 
    isLoading: isLoadingAccounts, 
    isError, 
    error,
    isFetching
  } = useFetchAccounts(apiParams);
  
  // Show loading state only on initial load, not on background updates
  const showLoading = isLoadingAccounts && !accountsData;
  
  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    // Reset pagination when changing tabs
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize,
    });
  };
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Reset pagination when searching
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize,
    });
  };
  
  // Handle view change
  const handleViewChange = (newView: 'list' | 'grid') => {
    setViewMode(newView);
  };
  
  // Handle filter change
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };
  
  // Handle columns change
  const handleColumnsChange = (columns: string[]) => {
    setVisibleColumns(columns);
  };
  
  // Handle row click to open drawer
  const handleRowClick = useCallback((params: GridRowParams | any) => {
    const account = params.row as Account;
    setSelectedAccount(account);
    setDrawerOpen(true);
  }, []);
  
  // Fetch detailed account information when an account is selected
  const { data: accountDetail, isLoading: isLoadingAccountDetail, error: accountDetailError } = useFetchAccount(
    selectedAccount ? Number(selectedAccount.id) : null
  );
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State for active content
  const [activeContent, setActiveContent] = useState<'view' | 'edit' | 'activity' | 'task' | 'contacts' | 'addresses'>('view');

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setIsEditMode(false); // Reset edit mode when drawer closes
  };
  
  // Handle sidebar item click
  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === 'edit') {
      setIsEditMode(true);
      setActiveContent('edit');
    } else if (itemId === 'view') {
      setIsEditMode(false);
      setActiveContent('view');
    }
  };
  
  // Action handlers for sidebar icons

  
  const handleViewContacts = () => {
    if (selectedAccount) {
      console.log('View Contacts for account:', selectedAccount.id);
      setActiveContent('contacts');
      // For navigation to full page view
      // router.push(`/Masters/customers/accounts/${selectedAccount.id}#contacts`);
    }
  };
  
  const handleViewAddresses = () => {
    if (selectedAccount) {
      console.log('View Addresses for account:', selectedAccount.id);
      setActiveContent('addresses');
      // For navigation to full page view
      // router.push(`/Masters/customers/accounts/${selectedAccount.id}#addresses`);
    }
  };
  
  const { setAccountId } = useAccountView();

  const handleGoToDetail = () => {
    if (selectedAccount) {
      console.log('Go to Detail view for account:', selectedAccount.id);
      // Set the account ID in context before navigating
      setAccountId(selectedAccount.id);
      // Navigate to the view page without query parameters
      router.push(`/${tenant}/Crm/Masters/customers/accounts/view`);
    }
  };
  
  // Prepare tab options for ContentCard using counts from API response
  const tabOptions = useMemo(() => [
    { value: 'all', label: t('status.all'), count: accountsData?.count || 0 },
    { value: 'Active', label: t('status.active'), count: accountsData?.active_count || 0 },
    { value: 'Inactive', label: t('status.inactive'), count: accountsData?.inactive_count || 0 },
  ], [accountsData, t]);
  
  // Prepare filter options for ContentCard
  const filterOptions: FilterOption[] = [
    { field: 'name', label: t('field.name'), type: 'text' },
    { field: 'customer_group_name', label: t('field.customerGroup'), type: 'text' },
    { field: 'status', label: t('field.status'), type: 'select', options: [
      { value: 'Active', label: t('status.active') },
      { value: 'Inactive', label: t('status.inactive') },
      { value: 'Prospect', label: t('status.prospect') },
    ]},
    { field: 'is_active', label: t('isActive'), type: 'boolean' },
  ];
  
  // Prepare column options for ContentCard
  const columnOptions = [
    { field: 'name', headerName: t('field.name') },
    { field: 'account_number', headerName: t('field.accountNumber') },
    { field: 'status', headerName: t('field.status') },
    { field: 'phone', headerName: t('field.phone') },
  ];
  
  // Define columns for the data grid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('field.name'),
      flex: 2,
      sortable: true,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'primary.main', 
            fontWeight: 500,
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
          onClick={() => handleRowClick(params)}
        >
          {params.value}
        </Typography>
      ),
    },
   
    {
      field: 'status',
      headerName: t('field.status'),
      flex: 1,
      sortable: true,
      renderCell: (params) => {
        let color = 'default';
        let bgColor = 'action.hover';
        
        // Convert to lowercase for consistent switch case handling
        const status = params.value?.toLowerCase() || '';
        
        switch (status) {
          case 'active':
            color = 'success.main';
            bgColor = 'success.lighter';
            break;
          case 'inactive':
            color = 'error.main';
            bgColor = 'error.lighter';
            break;
          case 'new':
            color = 'info.main';
            bgColor = 'info.lighter';
            break;
          case 'prospect':
            color = 'warning.main';
            bgColor = 'warning.lighter';
            break;
        }
        
        return (
          <Chip
            label={params.value || '-'}
            size="small"
            sx={{
              bgcolor: bgColor,
              color: color,
              fontSize: '0.75rem',
            }}
          />
        );
      },
    },
    {
      field: 'primary_phone',
      headerName: t('field.phone'),
      flex: 1,
      sortable: true,
      renderCell: (params) => (
        params.value ? (
          <Typography 
            variant="body2" 
            component="a" 
            href={`tel:${params.value}`} 
            sx={{ 
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            {params.value}
          </Typography>
        ) : '-'
      ),
    },
    {
      field: 'account_number',
      headerName: t('field.accountNumber'),
      flex: 1,
      sortable: true,
      renderCell: (params) => (
        params.value ? (
          <Typography variant="body2">
            {params.value}
          </Typography>
        ) : '-'
      )
    }
  ];
  
  // Process the data for the data grid
  const rows = useMemo(() => {
    if (!accountsData) return [];
    
    // Handle both array response and paginated response structure
    const accounts = Array.isArray(accountsData) ? accountsData : accountsData.results || [];
    
    return accounts.map((account: Account) => ({
      ...account,
      id: account.id,
    }));
  }, [accountsData]);
  
  // Loading state
  const isLoading = isLoadingAccounts || isLoadingStats;
  
  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {/* Page Title and Action Button Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          {t('accountListPage.title')}
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push(`/${tenant}/Crm/Masters/customers/accounts/new`)}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 1,
            bgcolor: 'theme.main',
            '&:hover': {
              bgcolor: 'theme.dark',
            },
            px: 2,
          }}
        >
          {t('accountListPage.newAccountButton')}
        </Button>
      </Box>
      
      {/* Analytics Cards */}
      <AccountStatsCards />
      
      {/* Content Card with Data Grid */}
      <ContentCard
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onColumnsChange={handleColumnsChange}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={tabOptions}
        activeTab={activeTab}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <Loader />
          </Box>
        ) : (
          <CustomDataGrid
            rows={rows}
            columns={columns}
            rowCount={accountsData?.count || 0}
            loading={isLoading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            paginationMode="server"
            viewMode={viewMode}

          />
        )}
      </ContentCard>
      
      {/* Account Detail Drawer */}
      {selectedAccount && (
        <AnimatedDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          initialWidth={550}
          expandedWidth={550}
          title={selectedAccount.name || t('accountListPage.accountDetails')}
          sidebarIcons={[
            {
              id: 'view',
              icon: <VisibilityIcon />,
              tooltip: t('accountListPage.view') || 'View',
              onClick: () => handleSidebarItemClick('view'),
            },
            {
              id: 'edit',
              icon: <EditIcon />,
              tooltip: t('accountListPage.edit') || 'Edit',
              onClick: () => {
                // Close the drawer first
                handleDrawerClose();
                // Set the account ID in context and navigate to the edit page
                if (selectedAccount?.id) {
                  setAccountId(selectedAccount.id);
                  router.push(`/${tenant}/Crm/Masters/customers/accounts/edit/${selectedAccount.id}`);
                }
              },
            },

            {
              id: 'contacts',
              icon: <ContactsIcon />,
              tooltip: t('actions.viewContacts') || 'View Contacts',
              onClick: handleViewContacts
            },
            {
              id: 'addresses',
              icon: <HomeIcon />,
              tooltip: t('actions.viewAddresses') || 'View Addresses',
              onClick: handleViewAddresses
            },
          ]}
          defaultSidebarItem={activeContent}
          footerContent={
            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                color="primary"
                size="small"
                endIcon={<OpenInNewIcon />}
                onClick={handleGoToDetail}
              >
                {t('accountListPage.view360') || 'View 360'}
              </Button>
              {isEditMode && (
                <Button 
                  variant="contained" 
                  color="primary"
                  size="small"
                  onClick={() => {
                    console.log('Save clicked for account:', selectedAccount.id);
                    // Here you would save the account data
                    setIsEditMode(false); // Return to view mode after saving
                  }}
                >
                  {t('common.save') || 'Save'}
                </Button>
              )}
            </Stack>
          }
        >
          {isLoadingAccountDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : accountDetailError ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">
                {t('common.errorLoading') || 'Error loading account details'}
              </Alert>
            </Box>

          ) : activeContent === 'contacts' ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('actions.viewContacts') || 'Contacts'}
              </Typography>
              
            
                {accountDetail?.contacts && accountDetail.contacts.length > 0 ? (
                  <Stack spacing={2}>
                    {accountDetail.contacts.map((contact) => (
                      <Box 
                        key={contact.id}
                        sx={{ 
                          p: 2, 
                          border: '2px solid', 
                          borderColor: 'divider', 
                          borderRadius: 1,
                          '&:hover': {
                            boxShadow: 1
                          }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {contact.full_name || `${contact.first_name} ${contact.last_name}`}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip 
                              label={contact.status || 'Active'} 
                              size="small"
                              color={contact.status === 'Active' ? 'success' : 'default'}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.625rem' }}
                            />
                         
                          </Stack>
                        </Stack>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">First Name:</Typography>
                          <Typography variant="body2">{contact.first_name || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Last Name:</Typography>
                          <Typography variant="body2">{contact.last_name || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Account:</Typography>
                          <Typography variant="body2">{contact.account?.name || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Email:</Typography>
                          <Typography variant="body2" component="a" href={`mailto:${contact.email}`} sx={{ color: 'primary.main' }}>
                            {contact.email || 'N/A'}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">Secondary Email:</Typography>
                          <Typography variant="body2">{contact.secondary_email || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Mobile Phone:</Typography>
                          <Typography variant="body2" component="a" href={`tel:${contact.mobile_phone}`} sx={{ color: 'primary.main' }}>
                            {contact.mobile_phone || 'N/A'}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">Work Phone:</Typography>
                          <Typography variant="body2" component="a" href={`tel:${contact.work_phone}`} sx={{ color: 'primary.main' }}>
                            {contact.work_phone || 'N/A'}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">Job Title:</Typography>
                          <Typography variant="body2">{contact.job_title || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Department:</Typography>
                          <Typography variant="body2">{contact.department || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Description:</Typography>
                          <Typography variant="body2">{contact.description || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Created At:</Typography>
                          <Typography variant="body2">{new Date(contact.created_at || '').toLocaleString()}</Typography>
                          
                          <Typography variant="body2" color="text.secondary">Updated At:</Typography>
                          <Typography variant="body2">{new Date(contact.updated_at || '').toLocaleString()}</Typography>
                        </Box>
                        <Box  sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        {contact.email_opt_out && (
                              <Chip label="Email Opt-Out" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                            )}
                            {contact.do_not_call && (
                              <Chip label="Do Not Call" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                            )}
                            {contact.sms_opt_out && (
                              <Chip label="SMS Opt-Out" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                            )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('info.noContacts') || 'No contacts found for this account. Add a contact to get started.'}
                  </Alert>
                )}
            </Box>
          ) : activeContent === 'addresses' ? (
            <Box >
              <Typography variant="h6" gutterBottom>
                {t('actions.viewAddresses') || 'Addresses'}
              </Typography>
              
               
                
                {accountDetail?.addresses && accountDetail.addresses.length > 0 ? (
                  <Stack spacing={2}>
                    {accountDetail.addresses.map((address) => (
                      <Box 
                        key={address.id}
                        sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: 'divider', 
                          borderRadius: 1,
                          '&:hover': {
                            boxShadow: 1
                          }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {t(`addressType.${address.address_type?.toLowerCase()}`) || address.address_type || 'Address'}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            {address.is_primary_billing && (
                              <Chip label="Primary Billing" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                            )}
                            {address.is_primary_shipping && (
                              <Chip label="Primary Shipping" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />
                            )}
                          </Stack>
                        </Stack>
                        
                        <Stack spacing={1}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                           
                            <Typography variant="body2" color="text.secondary">Street 1:</Typography>
                            <Typography variant="body2">{address.street_1 || 'N/A'}</Typography>
                            
                            {address.street_2 && (
                              <>
                                <Typography variant="body2" color="text.secondary">Street 2:</Typography>
                                <Typography variant="body2">{address.street_2}</Typography>
                              </>
                            )}
                            
                            {address.street_3 && (
                              <>
                                <Typography variant="body2" color="text.secondary">Street 3:</Typography>
                                <Typography variant="body2">{address.street_3}</Typography>
                              </>
                            )}
                            
                            <Typography variant="body2" color="text.secondary">City:</Typography>
                            <Typography variant="body2">{address.city || 'N/A'}</Typography>
                            
                            <Typography variant="body2" color="text.secondary">State/Province:</Typography>
                            <Typography variant="body2">{address.state || 'N/A'}</Typography>
                            
                            <Typography variant="body2" color="text.secondary">Postal Code:</Typography>
                            <Typography variant="body2">{address.postal_code || 'N/A'}</Typography>
                            
                            <Typography variant="body2" color="text.secondary">Country:</Typography>
                            <Typography variant="body2">{address.country || 'N/A'}</Typography>
                            
                            <Typography variant="body2" color="text.secondary">Created At:</Typography>
                            <Typography variant="body2">{new Date(address.created_at || '').toLocaleString()}</Typography>
                            
                            <Typography variant="body2" color="text.secondary">Updated At:</Typography>
                            <Typography variant="body2">{new Date(address.updated_at || '').toLocaleString()}</Typography>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info">
                    {t('info.noAddresses') || 'No addresses found for this account. Add an address to get started.'}
                  </Alert>
                )}
            </Box>
          ) : (
            <Box>
              {/* Account Details Content */}
              <Typography variant="h6" gutterBottom>
                {t('accountListPage.accountInformation')}
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <TextField
                  label={t('field.name') || 'Name'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.name || selectedAccount.name || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.legalName') || 'Legal Name'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.legal_name || selectedAccount.legal_name || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.accountNumber') || 'Account Number'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.account_number || selectedAccount.account_number || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.customerGroup') || 'Customer Group'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.customer_group?.group_name || selectedAccount.customer_group?.group_name || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.customerGroupType') || 'Group Type'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.customer_group?.group_type || selectedAccount.customer_group?.group_type || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.status') || 'Status'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.status || selectedAccount.status || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.industry') || 'Industry'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.industry || selectedAccount.industry || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.phone') || 'Phone'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.primary_phone || selectedAccount.primary_phone || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.website') || 'Website'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.website || selectedAccount.website || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.companySize') || 'Company Size'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.company_size || selectedAccount.company_size || ''}
                  disabled={!isEditMode}
                  size="small"
                />
                
                <TextField
                  label={t('field.taxId') || 'Tax ID'}
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  value={accountDetail?.tax_id || selectedAccount.tax_id || ''}
                  disabled={!isEditMode}
                  size="small"
                />
              </Box>
              
              {/* Description Section */}
              <Typography variant="h6" gutterBottom>
                {t('accountListPage.description') || 'Description'}
              </Typography>
              <TextField
                label={t('field.description') || 'Description'}
                fullWidth
                margin="dense"
                variant="outlined"
                multiline
                rows={4}
                value={accountDetail?.description || selectedAccount.description || ''}
                disabled={!isEditMode}
                sx={{ mb: 3 }}
              />
            </Box>
          )}
        </AnimatedDrawer>
      )}
      {notification.open && (
        <Notification
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          onClose={hideNotification}
        />
      )}
      </Box>
  );
}
