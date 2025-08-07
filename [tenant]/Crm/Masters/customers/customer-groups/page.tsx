"use client";

/**
 * Customer Groups List Page
 * 
 * Main page component for listing, filtering, and managing customer groups
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { CustomerGroup } from '@/app/types/customers';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import { GridColDef, GridActionsCellItem, GridRowParams, GridSortModel, GridPaginationModel, GridRowSelectionModel } from '@mui/x-data-grid';
import { useFetchCustomerGroups, useToggleCustomerGroupStatus, useDeleteCustomerGroup } from '@/app/hooks/api/customers';
import CustomerGroupForm from './CustomerGroupForm';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';

// Wrapper component that provides the DrawerContext
export default function CustomerGroupsPageWrapper() {
  return (
    <DrawerProvider>
      <CustomerGroupsPage />
    </DrawerProvider>
  );
}

// Main component for the customer groups list page
function CustomerGroupsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer, closeDrawer } = useDrawer();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [isViewMode, setIsViewMode] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  
  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);
  
  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');
  
  // State for pagination, sorting, and filtering
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'id', sort: 'asc' }
  ]);
  const [filters, setFilters] = useState<Record<string, any>>({
    group_type: ''
    // Not setting is_active by default to show all customer groups
  });
  
  // View and filter states
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['group_name', 'group_type', 'is_active', 'actions']);
  
  // State for selected customer group (for edit mode)
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
  
  // Fetch customer groups using the custom hook
  const { 
    data: customerGroupsData, 
    isLoading, 
    isError 
  } = useFetchCustomerGroups({
    page: paginationModel.page + 1, // API uses 1-based indexing
    page_size: paginationModel.pageSize,
    group_type: filters.group_type || undefined,
    is_active: filters.is_active,
    ordering: sortModel.length > 0 ? 
      (sortModel[0].sort === 'desc' ? `-${sortModel[0].field}` : sortModel[0].field) : 
      undefined
  });
  
  // Mutation for toggling active status
  const toggleActiveMutation = useToggleCustomerGroupStatus();
  
  // Handler for toggling active status
  const handleToggleActive = useCallback((id: string, is_active: boolean) => {
    toggleActiveMutation.mutate({ id, is_active });
  }, [toggleActiveMutation]);
  
  // Mutation for deleting a customer group
  const deleteCustomerGroupMutation = useDeleteCustomerGroup();
  
  // Handle delete button click
  const handleDelete = useCallback((id: string) => {
    setConfirmDelete({ open: true, id });
  }, []);
  
  // Handler for delete confirmation
  const confirmDeleteAction = useCallback(() => {
    if (confirmDelete.id) {
      deleteCustomerGroupMutation.mutate(confirmDelete.id, {
        onSuccess: () => {
          setConfirmDelete({ open: false, id: null });
          showSuccess(t('customerGroupForm.deleteSuccess'));
        },
        onError: () => {
          showError(t('customerGroupForm.deleteError'));
        }
      });
    }
  }, [confirmDelete.id, deleteCustomerGroupMutation, showSuccess, showError, t]);
  
  // Handler for search from ContentCard
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);
  
  // Handle view change from ContentCard
  const handleViewChange = useCallback((newView: 'list' | 'grid') => {
    setView(newView);
  }, []);
  
  // Handle tab change from ContentCard
  const handleTabChange = useCallback((newTab: string) => {
    // Update filters based on tab
    const newFilters = { ...filters };
    
    switch (newTab) {
      case 'active':
        newFilters.is_active = true;
        break;
      case 'inactive':
        newFilters.is_active = false;
        break;
      default: // 'all'
        delete newFilters.is_active;
        break;
    }
    
    setFilters(newFilters);
  }, [filters]);
  
  // Handler for editing a customer group
  const handleEdit = useCallback((group: CustomerGroup) => {
    setSelectedGroup(group);
    setDrawerMode('edit');
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);
  
  // Handler for viewing a customer group
  const handleView = useCallback((group: CustomerGroup) => {
    setSelectedGroup(group);
    setDrawerMode('edit');
    setIsViewMode(true);
    setDrawerOpen(true);
    setActiveSidebarItem('view');
  }, []);
  
  // Handler for creating a new customer group
  const handleCreate = useCallback(() => {
    setSelectedGroup(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);
  
  // Handler for drawer close
  const handleDrawerClose = useCallback(() => {
    setSelectedGroup(null);
    setDrawerOpen(false);
  }, []);
  
  // Handler for form submission
  const handleFormSubmit = useCallback(() => {
    // Form submission is handled in the form component
    // Just close the drawer here
    setDrawerOpen(false);
    // Show success notification
    showSuccess(t('customerGroupForm.saveSuccess'));
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['customerGroups'] });
  }, [queryClient, showSuccess, t]);
  
  // Handle form save
  const handleSave = useCallback(() => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  }, []);
  
  // Handle filter changes
  const handleFilterChange = useCallback((filterStates: FilterState[]) => {
    const newFilters: Record<string, any> = {};
    
    filterStates.forEach(filter => {
      if (filter.field === 'is_active' && filter.value) {
        // Convert string 'true'/'false' to boolean for is_active
        newFilters[filter.field] = filter.value === 'true';
      } else {
        newFilters[filter.field] = filter.value;
      }
    });
    
    setFilters(newFilters);
  }, []);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: 'group_type',
      label: t('customerGroupFields.groupType'),
      type: 'select',
      options: [
        { value: '', label: t('common.all') },
        { value: 'BUSINESS', label: t('customerGroupTypes.business') },
        { value: 'INDIVIDUAL', label: t('customerGroupTypes.individual') },
        { value: 'GOVERNMENT', label: t('customerGroupTypes.government') }
      ]
    },
    {
      field: 'is_active',
      label: t('customerGroupFields.isActive'),
      type: 'select',
      options: [
        { value: '', label: t('filterStatuses.all') },
        { value: 'true', label: t('filterStatuses.active') },
        { value: 'false', label: t('filterStatuses.inactive') }
      ]
    }
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'group_name', headerName: t('customerGroupFields.groupName') },
    { field: 'group_type', headerName: t('customerGroupFields.groupType') },
    { field: 'is_active', headerName: t('customerGroupFields.isActive') },
    { field: 'actions', headerName: t('common.actions') }
  ];
  
  // Tab options for ContentCard
  const tabOptions = [
    { value: 'all', label: t('filterStatuses.all'), count: customerGroupsData?.count || 0 },
    { value: 'active', label: t('filterStatuses.active'), count: customerGroupsData?.active_count || 0 },
    { value: 'inactive', label: t('filterStatuses.inactive'), count: customerGroupsData?.inactive_count || 0 }
  ];
  
  // Sidebar icons for AnimatedDrawer
  const drawerSidebarIcons = [
    {
      id: 'view',
      icon: <VisibilityIcon />,
      tooltip: t('common.view'),
    },
    {
      id: 'edit',
      icon: <EditIcon />,
      tooltip: t('common.edit'),
      onClick: () => setIsViewMode(false)
    }
  ];

  // Column definitions for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'group_name',
      headerName: t('customerGroupFields.groupName'),
      flex: 1,
      minWidth: 200
    },
    {
      field: 'group_type',
      headerName: t('customerGroupFields.groupType'),
      width: 150,
     
    },
    {
      field: 'is_active',
      headerName: t('customerGroupFields.isActive'),
      width: 120,
       renderCell: (params) => {
              const isActive = params.value as boolean;
              let status = isActive ? 'Active' : 'Inactive';
              let textColor = isActive ? '#00a854' : '#f44336'; // Green for Active, Red for Inactive
              
              return (
                <Box sx={{ 
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start'
                }}>
                  <Typography variant="body2" sx={{ color: textColor, fontWeight: 500 }}>
                    {status}
                  </Typography>
                </Box>
              );
            }
    },
    {
      field: 'actions',
      headerName: t('common.actions.actions'),
      type: 'actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label={t('common.actions.delete')}
          onClick={() => handleDelete(params.row.id as string)}
        />
      ]
    }
  ];
  
  return (
    <Box >
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {t('customerGroupList.title')}
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t('customerGroupList.newButton')}
        </Button>
      </Box>
      
      {/* Main Content */}
      <ContentCard
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onColumnsChange={setVisibleColumns}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={tabOptions}
      >
        {view === 'list' ? (
          <CustomDataGrid
            rows={customerGroupsData?.results || []}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            rowCount={customerGroupsData?.count || 0}
            loading={isLoading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row) => row.id}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={(params) => {
              handleView(params.row as CustomerGroup);
            }}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t('customerGroupList.gridViewNotImplemented')}
            </Typography>
          </Box>
        )}
      </ContentCard>
      
      {/* Create/Edit Drawer */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={
          isViewMode
            ? t('customerGroupForm.viewTitle')
            : drawerMode === 'add'
            ? t('customerGroupForm.createTitle')
            : t('customerGroupForm.editTitle')
        }
        onSave={isViewMode ? undefined : handleSave}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerMode !== 'add' ? drawerSidebarIcons : undefined}
        defaultSidebarItem={drawerMode !== 'add' ? activeSidebarItem : undefined}
      >
        <CustomerGroupForm
          ref={formRef}
          initialData={selectedGroup}
          onSubmit={handleFormSubmit}
          isViewMode={isViewMode}
        />
      </AnimatedDrawer>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('customerGroupForm.deleteTitle')}
        content={t('customerGroupForm.deleteConfirmation')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
      />
      
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
    </Box>
  );
}
