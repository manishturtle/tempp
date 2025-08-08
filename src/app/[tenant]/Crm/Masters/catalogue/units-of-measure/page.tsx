/**
 * Units of Measure Listing Page
 * 
 * Page component for listing, filtering, and managing units of measure
 */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowParams, GridRowSelectionModel } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFetchUnitOfMeasures, useDeleteUnitOfMeasure, useCreateUnitOfMeasure, useUpdateUnitOfMeasure, useFetchUnitOfMeasure } from '@/app/hooks/api/catalogue';
import { UnitOfMeasure } from '@/app/types/catalogue';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import { formatDateTime } from '@/app/utils/dateUtils';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard from '@/app/components/common/ContentCard';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import UnitOfMeasureForm from '@/app/components/admin/catalogue/forms/UnitOfMeasureForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { UnitOfMeasureFormValues } from '@/app/components/admin/catalogue/schemas';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Link from 'next/link';

// Extended type to handle audit fields
interface UnitOfMeasureExtended extends UnitOfMeasure {
  created_by: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// Type for the processed row data
interface ProcessedUnitOfMeasure extends UnitOfMeasureExtended {
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

// Wrapper component that provides the DrawerContext
function UnitsOfMeasurePageWrapper() {
  return (
    <DrawerProvider>
      <UnitsOfMeasurePage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function UnitsOfMeasurePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
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

  // Sync pagination model with pagination params
  useEffect(() => {
    setPaginationParams(prev => ({
      ...prev,
      page: paginationModel.page + 1, // Convert to 1-indexed for API
      page_size: paginationModel.pageSize
    }));
  }, [paginationModel]);
  
  // View and filter states
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'symbol', 'unit_type', 'associated_value', 'is_active', 
    'formattedCreatedAt', 'createdByUsername', 
    'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // State for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitOfMeasure | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');

  // Create a ref for the form to trigger submission
  const formRef = useRef<{ submitForm: () => void }>(null);
  
  // Row selection model for DataGrid
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // State for delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean,
    id: number | null
  }>({
    open: false,
    id: null
  });
  
  // Fetch UOMs with filters - merge pagination params with other filters
  // Build filters object based on active tab and other filters
  const filters = useMemo(() => {
    console.log('Building filters with:', { paginationParams, searchTerm, activeTab });
    
    const filterParams: any = {
      ...paginationParams,
      search: searchTerm,
    };

    // Only add is_active filter if not 'all' tab
    if (activeTab !== 'all') {
      filterParams.is_active = activeTab === 'true';
    }

    console.log('Built filters:', filterParams);
    return filterParams;
  }, [paginationParams, searchTerm, activeTab]);

  const { 
    data, 
    isLoading, 
    isError,
    error,
    refetch: refetchUnitOfMeasures
  } = useFetchUnitOfMeasures(filters);
  const { mutate: deleteUnitOfMeasure, isPending: isDeleting } = useDeleteUnitOfMeasure();
  const { mutate: createUnitOfMeasure, isPending: isCreating } = useCreateUnitOfMeasure();
  const { mutate: updateUnitOfMeasure, isPending: isUpdating } = useUpdateUnitOfMeasure();

  
  // Process data to add username fields directly and format dates
  const processedData = useMemo(() => {
    if (!data) return [];
    
    // Access results from the pagination response
    const unitOfMeasures = data.results || [];
    
    return unitOfMeasures.map((unitOfMeasure: UnitOfMeasure) => ({
      ...unitOfMeasure,
      createdByUsername: unitOfMeasure.created_by?.username || 'N/A',
      updatedByUsername: unitOfMeasure.updated_by?.username || 'N/A',
      formattedCreatedAt: formatDateTime(unitOfMeasure.created_at),
      formattedUpdatedAt: formatDateTime(unitOfMeasure.updated_at)
    }));
  }, [data]);
  
  // Define sidebar icons for the drawer
  const drawerSidebarIcons = useMemo(() => {
    if (drawerMode === 'add') {
      return [];
    }
    return [
      { 
        id: 'view', 
        icon: <VisibilityIcon />, 
        tooltip: t('view', 'View'), 
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem('view');
          drawerContext.setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('edit', 'Edit'), 
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem('edit');
          drawerContext.setActiveSidebarItem('edit');
        }
      }
    ];
  }, [drawerMode, t, drawerContext]);

  // Handle drawer open for adding a new unit of measure
  const handleAddUnit = () => {
    setSelectedUnitId(null);
    setSelectedUnit(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };

  // Handle drawer open for editing a unit of measure
  const handleOpenEditDrawer = (id: number) => {
    setSelectedUnitId(id);
    setDrawerMode('edit');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    // Find the unit by id
    const unit = processedData.find(item => item.id === id);
    if (unit) {
      setSelectedUnit(unit);
      setDrawerOpen(true);
    }
    drawerContext.openDrawer('edit');
  };
  
  // Handle drawer open for viewing a unit of measure
  const handleViewClick = (id: number) => {
    setSelectedUnitId(id);
    setDrawerMode('view');
    setIsViewMode(true);
    setActiveSidebarItem('view');
    // Find the unit by id
    const unit = processedData.find(item => item.id === id);
    if (unit) {
      setSelectedUnit(unit);
      setDrawerOpen(true);
    }
    drawerContext.openDrawer('view');
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };
  
  // Handle drawer save
  const handleDrawerSave = () => {
    console.log('Drawer save button clicked');
    // Trigger the form submission when the drawer save button is clicked
    if (formRef.current) {
      console.log('Form ref exists, calling submitForm');
      formRef.current.submitForm();
    } else {
      console.log('Form ref is null or undefined');
    }
  };

  // State to store API validation errors
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Handle form submission
  const handleFormSubmit = (values: UnitOfMeasureFormValues) => {
    console.log('handleFormSubmit called with values:', values);
    
    // Clear previous API errors
    setApiErrors({});
    
    // Ensure we have valid values before proceeding
    if (!values || !values.name || !values.symbol || !values.unit_type) {
      showError(t('error', 'Please fill in all required fields'));
      return;
    }
    
    // Helper function to handle API errors
    const handleApiError = (error: any) => {
      if (error?.response?.data) {
        const apiError = error.response.data;
        console.log('API Error:', apiError);
        
        // Format errors into a simple object with field names as keys
        const formattedErrors: Record<string, string> = {};
        
        // Handle field-specific errors
        Object.entries(apiError).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Join multiple error messages with a space
            formattedErrors[field] = messages.join(' ');
          } else if (typeof messages === 'string') {
            formattedErrors[field] = messages;
          }
        });
        
        // Set the errors in state to show in the form
        setApiErrors(formattedErrors);
        
        // Show the first error as a notification
        const firstError = Object.values(formattedErrors)[0];
        if (firstError) {
          showError(firstError);
        } else {
          showError(t('error', 'An error occurred'));
        }
      } else {
        // Fallback for generic errors
        showError(error instanceof Error ? error.message : t('error', 'An error occurred'));
      }
    };

    if (drawerMode === 'add') {
      // Create new unit of measure
      createUnitOfMeasure(values, {
        onSuccess: () => {
          showSuccess(t('createUomSuccess', 'Unit of measure created successfully'));
          setDrawerOpen(false);
          refetchUnitOfMeasures();
        },
        onError: handleApiError
      });
    } else if (selectedUnitId) {
      // Update existing unit of measure
      updateUnitOfMeasure({
        id: selectedUnitId,
        name: values.name,
        symbol: values.symbol,
        description: values.description || '',
        unit_type: values.unit_type,
        is_active: values.is_active,
        associated_value: values.associated_value ?? null,
        company_id: '0',
        type_display: '',
        created_at: '',
        updated_at: '',
        created_by: null,
        updated_by: null
      }, {
        onSuccess: () => {
          showSuccess(t('updateUomSuccess', 'Unit of measure updated successfully'));
          setDrawerOpen(false);
          refetchUnitOfMeasures();
        },
        onError: handleApiError
      });
    }
  };
  
  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = processedData;
    
    // Apply search term filter
    if (searchTerm && searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(unit => 
        unit.name.toLowerCase().includes(lowerCaseSearch) ||
        unit.symbol.toLowerCase().includes(lowerCaseSearch) ||
        (unit.unit_type && unit.unit_type.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Apply active filters
    if (activeFilters && activeFilters.length > 0) {
      filtered = filtered.filter(unit => {
        return activeFilters.every((filter: FilterState) => {
          const value = unit[filter.field as keyof typeof unit];
          
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active') {
                return unit.is_active === filter.value;
              }
              return String(value).toLowerCase() === String(filter.value).toLowerCase();
            case 'contains':
              return typeof value === 'string' && value.toLowerCase().includes(String(filter.value).toLowerCase());
            case 'greaterThan':
              return typeof value === 'number' && value > Number(filter.value);
            case 'lessThan':
              return typeof value === 'number' && value < Number(filter.value);
            case 'between':
              if (filter.field === 'created_at' || filter.field === 'updated_at') {
                const date = new Date(String(value));
                const startDate = filter.value.start instanceof Date ? filter.value.start : new Date(filter.value.start);
                const endDate = filter.value.end instanceof Date ? filter.value.end : new Date(filter.value.end);
                return date >= startDate && date <= endDate;
              }
              return false;
            default:
              return true;
          }
        });
      });
    }
    
    return filtered;
  }, [processedData, searchTerm, activeFilters]);
  
  // Handle search from ContentCard
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };
  
  // Handle view change from ContentCard
  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
  };
  
  // Handle filter change from ContentCard
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };
  
  // Handle tab change from ContentCard
  const handleTabChange = (newTab: string) => {
    // Update the active tab
    setActiveTab(newTab);
    
    // Reset to first page when changing tabs (0-indexed for MUI DataGrid)
    setPaginationModel(prev => ({
      ...prev,
      page: 0,
    }));
    
    // Update pagination params with is_active filter based on tab
    setPaginationParams(prevParams => ({
      ...prevParams,
      page: 1, // Reset to first page (1-indexed for API)
      is_active: newTab === 'all' ? undefined : newTab === 'true'
    }));
    
    // Update active filters for UI consistency
    setActiveFilters(prevFilters => {
      // Remove any existing is_active filter
      const newFilters = prevFilters.filter(filter => filter.field !== 'is_active');
      
      if (newTab !== 'all') {
        // Add is_active filter for active/inactive tabs
        newFilters.push({
          field: 'is_active',
          operator: 'equals',
          value: newTab === 'true'
        });
      }
      
      return newFilters;
    });
  };
  
  // Handle delete button click
  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };
  
  // Handle delete confirmation
  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteUnitOfMeasure(confirmDelete.id, {
        onSuccess: () => {
          showSuccess(t('deleteUomSuccess', 'Unit of measure deleted successfully'));
          setConfirmDelete({ open: false, id: null });
          refetchUnitOfMeasures();
        },
        onError: (error) => {
          console.error('Error deleting unit of measure:', error);
          showError(t('deleteUomError', 'Error deleting unit of measure'));
          setConfirmDelete({ open: false, id: null });
        }
      });
    }
  };
  
  // DataGrid columns definition
  const columns: GridColDef[] = [
    { field: 'id', headerName: t('id', 'ID'), width: 70 },
    { field: 'name', headerName: t('name', 'Name'), width: 150 },
    { field: 'symbol', headerName: t('symbol', 'Symbol'), width: 100 },
    { field: 'unit_type', headerName: t('unitType', 'Type'), width: 120 },
    { 
      field: 'associated_value', 
      headerName: t('associatedValue', 'Associated Value'), 
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const value = params.value;
      
         return (
          <Box sx={{ 
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}>
                   <Typography variant="body2">{value !== null && value !== undefined ? value : '-'}</Typography>

          </Box>
        );
      }
    },
    { 
      field: 'is_active', 
      headerName: t('Status', 'Status'), 
      width: 100,
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
      field: 'formattedCreatedAt', 
      headerName: t('createdAt', 'Created At'), 
      width: 150
    },
    { 
      field: 'createdByUsername', 
      headerName: t('createdBy', 'Created By'), 
      width: 120
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: t('updatedAt', 'Updated At'), 
      width: 150
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('updatedBy', 'Updated By'), 
      width: 120
    },
    { 
      field: 'actions', 
      headerName: t('Actions'), 
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('delete')}>
            <IconButton 
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleDelete(params.row.id);
              }}
              size="small"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];
  
  // Define filter options
  const filterOptions = [
    {
      field: 'name',
      label: t('name'),
      type: 'text' as const
    },
    {
      field: 'symbol',
      label: t('symbol'),
      type: 'text' as const
    },
    {
      field: 'unit_type',
      label: t('unitType'),
      type: 'text' as const
    },
    {
      field: 'is_active',
      label: t('status'),
      type: 'boolean' as const
    },
    {
      field: 'created_at',
      label: t('createdAt'),
      type: 'date' as const
    },
    {
      field: 'updated_at',
      label: t('updatedAt'),
      type: 'date' as const
    }
  ];
  
  // Define column options for visibility control
  const columnOptions = columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  }));
  const totalCount = data?.counts?.total || 0;
const activeCount = data?.counts?.active || 0;
const inactiveCount = data?.counts?.inactive || 0;
  // Define tab options with counts from API
  const tabOptions = useMemo(() => {
    return [
      { 
        value: 'all', 
        label: t('all'), 
        count: totalCount
      },
      { 
        value: 'true', 
        label: t('active'), 
        count: activeCount
      },
      { 
        value: 'false', 
        label: t('inactive'), 
        count: inactiveCount
      }
    ].map(tab => ({
      ...tab,
      // Ensure count is always a number
      count: typeof tab.count === 'number' ? tab.count : 0
    }));
  }, [data, t]);
  
  if (isLoading) return <Loader />;
  
  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          {t('error')}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('unitsOfMeasure')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddUnit}
        >
          {t('unitsOfMeasure')}
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
        activeTab={activeTab}
      >
        {view === 'list' ? (
          <CustomDataGrid
            rows={processedData}
            columns={columns}
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
            checkboxSelection
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row: UnitOfMeasure) => row.id}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={(params: GridRowParams<UnitOfMeasure>) => {
              handleViewClick(params.row.id);
            }}
            // Server-side pagination properties
            rowCount={typeof data?.count === 'object' ? data.count.total : (data?.count || 0)}
            paginationMode="server"
            loading={isLoading}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t('Grid view is not implemented yet')}
            </Typography>
          </Box>
        )}
        
        {/* Pagination statistics - below the data grid */}
        {data && !isLoading && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              {t('showing')} {data.results?.length || 0} {t('of')} {typeof data.count === 'object' ? data.count.total : (data.count || 0)} {t('entries')}
              {(data.total_pages && data.total_pages > 0) && ` - ${t('page')} ${data.current_page || 1} ${t('of')} ${data.total_pages}`}
            </Typography>
          </Box>
        )}
      </ContentCard>
      
      {/* AnimatedDrawer for adding/editing/viewing units of measure */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        initialWidth={550}
        expandedWidth={550}
        title={
          isViewMode
            ? t('viewUnitOfMeasures')
            : drawerMode === 'add'
            ? t('addUnitOfMeasure')
            : t('editUnitOfMeasure')
        }
        onSave={isViewMode ? undefined : handleDrawerSave}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedUnitId && (
              <Typography variant="caption" color="text.secondary">
                {t('lastUpdated')}: {selectedUnit?.updated_at ? formatDateTime(selectedUnit.updated_at) : ''}
              </Typography>
            )}
          </Box>
        }
      >
        <UnitOfMeasureForm
          ref={formRef}
          defaultValues={
            selectedUnit ? {
              ...(selectedUnitId ? { id: selectedUnitId } : {}),
              name: selectedUnit.name,
              symbol: selectedUnit.symbol,
              unit_type: selectedUnit.unit_type,
              is_active: selectedUnit.is_active,
              description: selectedUnit.description || '',
              associated_value: selectedUnit.associated_value,
            } : undefined
          }
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
          readOnly={isViewMode}
        />
      </AnimatedDrawer>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('deleteUnitOfMeasure')}
        content={t('deleteUnitOfMeasureConfirm')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
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
};

export default UnitsOfMeasurePageWrapper;
