"use client";

/**
 * Attribute Groups Listing Page
 * 
 * Page component for listing, filtering, and managing attribute groups
 */
import React, { useState, useMemo, useRef } from 'react';
import { Typography, Box, Button, Tooltip, IconButton } from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { 
  useFetchAttributeGroups, 
  useCreateAttributeGroup, 
  useUpdateAttributeGroup, 
  useDeleteAttributeGroup 
} from '@/app/hooks/api/attributes';
import { AttributeGroup } from '@/app/types/attributes';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { formatDateTime } from '@/app/utils/dateUtils';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import AttributeGroupForm from '@/app/components/admin/attributes/forms/AttributeGroupForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { AttributeGroupFormValues } from '@/app/components/admin/attributes/schemas';
import { AxiosError } from 'axios';
import Link from 'next/link';

// Extended type to handle audit fields
interface AttributeGroupExtended extends AttributeGroup {
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// Type for the processed row data
interface ProcessedAttributeGroup extends AttributeGroupExtended {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
}

// Type for filter state
interface FilterState {
  field: string;
  operator: string;
  value: any;
}

// Type for API error response
interface ApiErrorResponse {
  detail?: string;
  [key: string]: any;
}

// Wrapper component that provides the DrawerContext
export default function AttributeGroupsPageWrapper() {
  return (
    <DrawerProvider>
      <AttributeGroupsPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function AttributeGroupsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AttributeGroup | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);
  
  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');
  
  // Pagination state (0-indexed for UI)
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });
  
  // API pagination params state (1-indexed)
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    page_size: 50
  });
  
  // View and filter states
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'display_order', 'is_active', 
    'formattedCreatedAt', 'createdByUsername', 
    'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');

  // Define filter options
  const filterOptions: Array<{
    field: string;
    operator: string;
    label: string;
    type: 'text' | 'boolean' | 'date' | 'number' | 'select';
  }> = [
    { field: 'name', operator: 'contains', label: t('groupName'), type: 'text' },
    { field: 'is_active', operator: 'equals', label: t('status'), type: 'boolean' },
    { field: 'created_at', operator: 'dateRange', label: t('createdAt'), type: 'date' },
    { field: 'updated_at', operator: 'dateRange', label: t('updatedAt'), type: 'date' }
  ];
  
  // State for delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: number | null}>({
    open: false,
    id: null
  });
  
  // API hooks
  const { data, isPending: isLoadingGroups, isError, error, refetch: refetchGroups } = useFetchAttributeGroups({
    search: searchTerm || undefined,
    is_active: activeTab === 'active' ? true : 
               activeTab === 'inactive' ? false : undefined,
    page: paginationParams.page,
    page_size: paginationParams.page_size
  });
  
  const { mutate: deleteAttributeGroup, isPending: isDeleting } = useDeleteAttributeGroup({
    onSuccess: () => {
      showSuccess(t('Attribute Group Deleted Successfully'));
      refetchGroups();
      setConfirmDelete({ open: false, id: null });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      showError(error.response?.data?.detail || t('errorOccurred'));
    }
  });
  
  const { mutate: createAttributeGroup, isPending: isCreating } = useCreateAttributeGroup({
    onSuccess: () => {
      showSuccess(t('Attribute Group Created Successfully'));
      refetchGroups();
      handleCloseDrawer();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      showError(error.response?.data?.detail || t('errorOccurred'));
    }
  });
  
  const { mutate: updateAttributeGroup, isPending: isUpdating } = useUpdateAttributeGroup({
    onSuccess: () => {
      showSuccess(t('Attribute Group Updated Successfully'));
      refetchGroups();
      handleCloseDrawer();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      showError(error.response?.data?.detail || t('errorOccurred'));
    }
  });
  
  // Process data to add username fields directly and format dates
  const processedRows = useMemo(() => {
    if (!data) return [];
    
    // Always expect a paginated response structure with results array
    const groups = data.results || [];
    
    console.log('API Response:', data);
    console.log('Groups from results:', groups);
    
    return groups.map((item) => ({
      ...item,
      createdByUsername: item.created_by?.username || 
                       (item.created_by_id ? `User ${item.created_by_id}` : 'N/A'),
      updatedByUsername: item.updated_by?.username || 
                       (item.updated_by_id ? `User ${item.updated_by_id}` : 'N/A'),
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at)
    }));
  }, [data]);
  
  // Filter data based on search term and filters
  const filteredRows = useMemo(() => {
    let filtered = [...processedRows];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        row.name.toLowerCase().includes(searchLower) ||
        row.id.toString().includes(searchLower)
      );
    }
    
    // Apply active tab filter
    if (activeTab === 'active') {
      filtered = filtered.filter(row => row.is_active);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(row => !row.is_active);
    }
    
    // Apply custom filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(row => {
        return activeFilters.every(filter => {
          const { field, operator, value } = filter;
          
          // Handle different field types
          switch (field) {
            case 'name':
              if (operator === 'contains') {
                return row.name.toLowerCase().includes(String(value).toLowerCase());
              }
              return true;
              
            case 'is_active':
              if (operator === 'equals') {
                return row.is_active === value;
              }
              return true;
              
            case 'created_at':
            case 'updated_at':
              if (operator === 'dateRange' && Array.isArray(value) && value.length === 2) {
                const [startDate, endDate] = value;
                const rowDate = new Date(row[field]);
                
                if (startDate && endDate) {
                  return rowDate >= new Date(startDate) && rowDate <= new Date(endDate);
                } else if (startDate) {
                  return rowDate >= new Date(startDate);
                } else if (endDate) {
                  return rowDate <= new Date(endDate);
                }
              }
              return true;
              
            default:
              return true;
          }
        });
      });
    }
    
    return filtered;
  }, [processedRows, searchTerm, activeTab, activeFilters]);
  
  const drawerSidebarIcons = useMemo(() => {
    if (drawerMode === 'add') {
      return [];
    }
    return [
      { 
        id: 'view', 
        icon: <VisibilityIcon />, 
        tooltip: t('view'), 
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('edit'), 
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem('edit');
        }
      }
    ];
  }, [drawerMode, t]);

  // Column definitions
  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: t('id'), 
      width: 70 
    },
    { 
      field: 'name', 
      headerName: t('groupName'), 
      flex: 1,
      minWidth: 150
    },
    { 
      field: 'display_order', 
      headerName: t('displayOrder'), 
      width: 120
    },
    { 
      field: 'is_active', 
      headerName: t('field.status'), 
      width: 120,
      renderCell: (params) => {
        const isActive = params.value as boolean;
        let status = isActive ? t('active') : t('inactive');
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
      field: 'formattedCreatedAt', 
      headerName: t('createdAt'), 
      width: 180
    },
    { 
      field: 'createdByUsername', 
      headerName: t('createdBy'), 
      width: 150
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: t('updatedAt'), 
      width: 180
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('updatedBy'), 
      width: 150
    },
    { 
      field: 'actions', 
      headerName: t('Actions'), 
      width: 150, 
      sortable: false,
      renderCell: (params: GridRenderCellParams<ProcessedAttributeGroup>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('delete')}>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleOpenDeleteDialog(params.row.id);
              }}
              // onClick={() => handleOpenDeleteDialog(params.row.id)}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const columnOptions = columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  }));
  
  // Define tab options with counts from API response
  const tabOptions = [
    { 
      value: 'all', 
      label: t('all', 'All'), 
      count: data?.counts?.total || 0
    },
    { 
      value: 'active', 
      label: t('active', 'Active'), 
      count: data?.counts?.active || 0
    },
    { 
      value: 'inactive', 
      label: t('inactive', 'Inactive'), 
      count: data?.counts?.inactive || 0
    }
  ];
  
  // Handlers for drawer operations
  const handleOpenDrawer = (mode: 'add' | 'edit', group?: AttributeGroup) => {
    setDrawerMode(mode);
    setSelectedGroup(group || null);
    setSelectedGroupId(group?.id || null);
    setIsViewMode(mode === 'edit' ? false : false);
    setActiveSidebarItem(mode === 'edit' ? 'edit' : 'view');
    setDrawerOpen(true);
  };
  
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedGroup(null);
    setSelectedGroupId(null);
  };
  
  const handleViewGroup = (group: AttributeGroup) => {
    setSelectedGroup(group);
    setSelectedGroupId(group.id);
    setIsViewMode(true);
    setDrawerMode('edit'); // Set to edit mode to show sidebar icons
    setActiveSidebarItem('view');
    setDrawerOpen(true);
  };
  
  const handleEditGroup = (group: AttributeGroup) => {
    handleOpenDrawer('edit', group);
  };
  
  const handleAddGroup = () => {
    handleOpenDrawer('add');
  };
  
  // Handlers for delete operations
  const handleOpenDeleteDialog = (id: number) => {
    setConfirmDelete({ open: true, id });
  };
  
  const handleCloseDeleteDialog = () => {
    setConfirmDelete({ open: false, id: null });
  };
  
  const handleConfirmDelete = () => {
    if (confirmDelete.id) {
      deleteAttributeGroup(confirmDelete.id);
    }
  };
  
  // Handler for form submission
  const handleFormSubmit = (values: AttributeGroupFormValues) => {
    if (drawerMode === 'add') {
      createAttributeGroup(values);
    } else if (drawerMode === 'edit' && selectedGroup) {
      updateAttributeGroup({
        id: selectedGroup.id,
        data: values
      });
    }
  };
  
  // Handler for search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };
  
  // Handler for tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Handlers for view and filter changes
  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
  };

  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };

  // Handler for opening view drawer with ID
  const handleOpenViewDrawer = (id: number) => {
    const group = processedRows.find(row => row.id === id);
    if (group) {
      handleViewGroup(group);
    }
  };

  return (
    <Box >
      
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('Attribute Group List')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddGroup}
        >
          {t('groupName')}
        </Button>
      </Box>
      
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
        <CustomDataGrid
           rows={filteredRows}
           columns={columns.filter(col => visibleColumns.includes(col.field))}
           paginationModel={paginationModel}
           onPaginationModelChange={(newModel) => {
             setPaginationModel(newModel);
             // Convert to API pagination (1-indexed)
             setPaginationParams({
               page: newModel.page + 1,
               page_size: newModel.pageSize
             });
           }}
           pageSizeOptions={[50, 100, 200]}
           checkboxSelection={true}
           disableRowSelectionOnClick={true}
           autoHeight
           getRowId={(row) => row.id}
           rowSelectionModel={rowSelectionModel}
           onRowSelectionModelChange={(newSelection) => {
             setRowSelectionModel(newSelection);
           }}
           // Server-side pagination properties
           paginationMode="server"
           rowCount={data?.count || 0}
           loading={isLoadingGroups}
           onRowClick={(params) => {
             // Update row selection to include the clicked row
             const rowId = params.row.id;
             const isSelected = rowSelectionModel.includes(rowId);
             
             // If the row is already selected, keep it selected and open the drawer
             // If not selected, add it to the selection
             const newSelection = isSelected 
               ? [...rowSelectionModel] 
               : [...rowSelectionModel, rowId];
               
             setRowSelectionModel(newSelection);
             handleOpenViewDrawer(rowId);
           }}
        />
      </ContentCard>
      
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          isViewMode
            ? t('Attribute Group Details')
            : drawerMode === 'add'
            ? t('Add Attribute Group')
            : t('Edit Attribute Group')
        }
        initialWidth={550}
        expandedWidth={550}
        onSave={isViewMode ? undefined : () => {
          if (formRef.current) {
            formRef.current.submitForm();
          }
        }}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedGroup && (
              <Typography variant="caption" color="text.secondary">
                {t('lastUpdated')}: {selectedGroup?.updated_at ? formatDateTime(selectedGroup.updated_at) : ''}
              </Typography>
            )}
          </Box>
        }
      >
        <AttributeGroupForm
          initialValues={selectedGroup}
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
          isViewMode={isViewMode}
          ref={formRef}
        />
      </AnimatedDrawer>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('Delete Attribute Group')}
        content={t('Delete Attribute Group Confirmation')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteDialog}
        isLoading={isDeleting}
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
