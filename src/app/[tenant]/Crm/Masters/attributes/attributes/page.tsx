"use client";

/**
 * Attributes Listing Page
 * 
 * Page component for listing, filtering, and managing attributes
 */
import React, { useState, useMemo, useRef } from 'react';
import { Typography, Box, Button, Tooltip, IconButton } from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { 
  useFetchAttributes, 
  useCreateAttribute, 
  useUpdateAttribute, 
  useDeleteAttribute 
} from '@/app/hooks/api/attributes';
import { Attribute, AttributeDataType, AttributeOptionInput, AttributeFormValues } from '@/app/types/attributes';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { formatDateTime } from '@/app/utils/dateUtils';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import AttributeForm from '@/app/components/admin/attributes/forms/AttributeForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { AxiosError } from 'axios';
import Link from 'next/link';

// Extended type to handle audit fields
interface AttributeExtended extends Attribute {
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
  is_active: boolean;
}

// Type for the processed row data
interface ProcessedAttribute extends AttributeExtended {
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
export default function AttributesPageWrapper() {
  return (
    <DrawerProvider>
      <AttributesPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function AttributesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
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
    'id', 'name', 'code', 'data_type', 'groups', 'use_for_variants', 'is_active', 
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
    { field: 'name', operator: 'contains', label: t('attributes.attribute.name'), type: 'text' },
    { field: 'code', operator: 'contains', label: t('attributes.attribute.code'), type: 'text' },
    { field: 'data_type', operator: 'equals', label: t('attributes.attribute.dataType'), type: 'select' },
    { field: 'is_active', operator: 'equals', label: t('common.status'), type: 'boolean' },
    { field: 'created_at', operator: 'dateRange', label: t('common.createdAt'), type: 'date' },
    { field: 'updated_at', operator: 'dateRange', label: t('common.updatedAt'), type: 'date' }
  ];
  
  // State for delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: number | null}>({
    open: false,
    id: null
  });
  
  // API hooks
  const { data, isPending: isLoadingAttributes, isError, error, refetch: refetchAttributes } = useFetchAttributes({
    search: searchTerm || undefined,
    is_active: activeTab === 'active' ? true : 
               activeTab === 'inactive' ? false : undefined,
    page: paginationParams.page,
    page_size: paginationParams.page_size
  });
  
  const { mutate: deleteAttribute, isPending: isDeleting } = useDeleteAttribute({
    onSuccess: () => {
      showSuccess(t('attributes.attribute.deletedSuccess'));
      refetchAttributes();
      setConfirmDelete({ open: false, id: null });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      showError(error.response?.data?.detail || t('common.errorOccurred'));
    }
  });
  
  const { mutate: createAttribute, isPending: isCreating } = useCreateAttribute({
    onSuccess: () => {
      showSuccess(t('attributes.attribute.createdSuccess'));
      refetchAttributes();
      handleCloseDrawer();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      showError(error.response?.data?.detail || t('common.errorOccurred'));
    }
  });
  
  const { mutate: updateAttribute, isPending: isUpdating } = useUpdateAttribute({
    onSuccess: () => {
      showSuccess(t('attributes.attribute.updatedSuccess'));
      refetchAttributes();
      handleCloseDrawer();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      showError(error.response?.data?.detail || t('common.errorOccurred'));
    }
  });
  
  // Process data to add username fields directly and format dates
const processedRows = useMemo(() => {
  console.log('API Response:+++++++++++++++++++++++', data);
  
  // Handle case where data is an array directly (as shown in your console output)
  if (Array.isArray(data)) {
    try {
      // Sort data by id (descending)
      const sortedData = [...data].sort((a, b) => b.id - a.id);
      console.log('Sorted Data:', sortedData);
      
      const processed = sortedData.map((item) => {
        if (!item) return null;
        
        return {
          ...item,
          createdByUsername: item.created_by?.username || 
                          (item.created_by_id ? `User ${item.created_by_id}` : 'N/A'),
          updatedByUsername: item.updated_by?.username || 
                          (item.updated_by_id ? `User ${item.updated_by_id}` : 'N/A'),
          formattedCreatedAt: formatDateTime(item.created_at),
          formattedUpdatedAt: formatDateTime(item.updated_at)
        };
      }).filter(Boolean) as ProcessedAttribute[];
      
      console.log('Processed Rows:', processed);
      return processed;
    } catch (error) {
      console.error('Error processing attribute data:', error);
      return [];
    }
  }
  
  // Original handling for paginated response structure
  if (!data || !Array.isArray(data.results)) {
    console.warn('No valid data results found:', data);
    return [];
  }
  
  try {
    // Sort data by id (descending)
    const sortedData = [...data.results].sort((a, b) => b.id - a.id);
    console.log('Sorted Data:', sortedData);
    
    const processed = sortedData.map((item) => {
      if (!item) return null;
      
      return {
        ...item,
        createdByUsername: item.created_by?.username || 
                        (item.created_by_id ? `User ${item.created_by_id}` : 'N/A'),
        updatedByUsername: item.updated_by?.username || 
                        (item.updated_by_id ? `User ${item.updated_by_id}` : 'N/A'),
        formattedCreatedAt: formatDateTime(item.created_at),
        formattedUpdatedAt: formatDateTime(item.updated_at)
      };
    }).filter(Boolean) as ProcessedAttribute[];
    
    console.log('Processed Rows:', processed);
    return processed;
  } catch (error) {
    console.error('Error processing attribute data:', error);
    return [];
  }
}, [data]);
  
  // Filter data based on search term and filters
  const filteredRows = useMemo(() => {
    let filtered = [...processedRows];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        row.name.toLowerCase().includes(searchLower) ||
        row.code.toLowerCase().includes(searchLower) ||
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
            case 'code':
              if (operator === 'contains') {
                return row[field].toLowerCase().includes(String(value).toLowerCase());
              }
              return true;
              
            case 'data_type':
              if (operator === 'equals') {
                return row.data_type === value;
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
        tooltip: t('common.view'), 
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('common.edit'), 
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem('edit');
        }
      }
    ];
  }, [drawerMode, t]);

  // Helper function to render data type label
  const renderDataTypeLabel = (dataType: AttributeDataType) => {
    switch (dataType) {
      case AttributeDataType.TEXT:
        return t('attributes.attribute.text');
      case AttributeDataType.NUMBER:
        return t('attributes.attribute.number');
      case AttributeDataType.BOOLEAN:
        return t('attributes.attribute.boolean');
      case AttributeDataType.DATE:
        return t('attributes.attribute.date');
      case AttributeDataType.SELECT:
        return t('attributes.attribute.select');
      case AttributeDataType.MULTI_SELECT:
        return t('attributes.attribute.multiSelect');
      default:
        return dataType;
    }
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80 
    },
    { 
      field: 'name', 
      headerName: t('name'), 
      flex: 1,
      minWidth: 180
    },
    { 
      field: 'code', 
      headerName: t('code'), 
      width: 150 
    },
    { 
      field: 'data_type', 
      headerName: t('dataType'), 
      width: 150,
      renderCell: (params: GridRenderCellParams<ProcessedAttribute>) => (
        <Tooltip title={renderDataTypeLabel(params.row.data_type)}>
          <span>{renderDataTypeLabel(params.row.data_type)}</span>
        </Tooltip>
      )
    },
    { 
      field: 'groups', 
      headerName: t('groups'), 
      width: 200,
      renderCell: (params: GridRenderCellParams<ProcessedAttribute>) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Array.isArray(params.row.groups) && params.row.groups.slice(0, 2).map((group: any) => (
            <Tooltip key={typeof group === 'number' ? group : group.id} title={typeof group === 'number' ? `Group ${group}` : group.name}>
              <span>{typeof group === 'number' ? `Group ${group}` : group.name}</span>
            </Tooltip>
          ))}
          {Array.isArray(params.row.groups) && params.row.groups.length > 2 && (
            <Tooltip title={`${params.row.groups.length - 2} more groups`}>
              <span>+{params.row.groups.length - 2}</span>
            </Tooltip>
          )}
        </Box>
      )
    },
    { 
      field: 'use_for_variants', 
      headerName: t('useForVariants'), 
      width: 150,
      renderCell: (params: GridRenderCellParams<ProcessedAttribute>) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {params.row.use_for_variants ? 'Yes' : 'No'}
        </Box>
      )
    },
    { 
      field: 'is_active', 
      headerName: t('Status'), 
      width: 120,
      renderCell: (params: GridRenderCellParams<ProcessedAttribute>) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {params.row.is_active ? 'Active' : 'Inactive'}
        </Box>
      )
    },
    { 
      field: 'formattedCreatedAt', 
      headerName: t('CreatedAt'), 
      width: 180
    },
    { 
      field: 'createdByUsername', 
      headerName: t('CreatedBy'), 
      width: 150
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: t('UpdatedAt'), 
      width: 180
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('UpdatedBy'), 
      width: 150
    },
    { 
      field: 'actions', 
      headerName: t('Actions'), 
      width: 150, 
      sortable: false,
      renderCell: (params: GridRenderCellParams<ProcessedAttribute>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('common.delete')}>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleOpenDeleteDialog(params.row.id);
              }}
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
  const handleOpenDrawer = (mode: 'add' | 'edit', attribute?: Attribute) => {
    setDrawerMode(mode);
    setSelectedAttribute(attribute || null);
    setSelectedAttributeId(attribute?.id || null);
    setIsViewMode(mode === 'edit' ? false : false);
    setActiveSidebarItem(mode === 'edit' ? 'edit' : 'view');
    setDrawerOpen(true);
  };
  
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedAttribute(null);
    setSelectedAttributeId(null);
  };
  
  const handleViewAttribute = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setSelectedAttributeId(attribute.id);
    setIsViewMode(true);
    setDrawerMode('edit'); // Set to edit mode to show sidebar icons
    setActiveSidebarItem('view');
    setDrawerOpen(true);
  };
  
  const handleEditAttribute = (attribute: Attribute) => {
    handleOpenDrawer('edit', attribute);
  };
  
  const handleAddAttribute = () => {
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
    if (confirmDelete.id !== null) {
      deleteAttribute(confirmDelete.id);
    }
  };
  
  // Form submission handlers
  const handleFormSubmit = (data: AttributeFormValues) => {
    // Create a properly formatted API data object
    const apiData: Partial<AttributeFormValues> & { options_input?: AttributeOptionInput[] } = {
      name: data.name,
      code: data.code,
      label: data.label,
      description: data.description || '',
      data_type: data.data_type,
      // Include all form fields
      is_required: data.is_required,
      is_filterable: data.is_filterable,
      use_for_variants: data.use_for_variants,
      show_on_pdp: data.show_on_pdp,
      is_active: drawerMode === 'edit' ? data.is_active : true, // Use form value in edit mode, default to true in add mode
      groups: data.groups,
      validation_rules: typeof data.validation_rules === 'string' 
        ? JSON.parse(data.validation_rules as string) 
        : data.validation_rules,
      options_input: data.options, // Add options_input for API
    };
    
    if (drawerMode === 'edit' && selectedAttributeId) {
      updateAttribute({ 
        id: selectedAttributeId, 
        data: apiData
      });
    } else {
      createAttribute(apiData as AttributeFormValues & { options_input?: AttributeOptionInput[] });

      // createAttribute(apiData);
    }
  };
  
  // Handle row click
  const handleRowClick = (params: any) => {
    handleViewAttribute(params.row as Attribute);
  };

  // Handle search term change
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // Handle view change
  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Handle pagination change
  const handlePaginationModelChange = (newModel: any) => {
    setPaginationModel(newModel);
    // Convert to API pagination (1-indexed)
    setPaginationParams({
      page: newModel.page + 1,
      page_size: newModel.pageSize
    });
  };

  // Handle filter change
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };

  // Handle opening view drawer
  const handleOpenViewDrawer = (id: number) => {
    const attribute = processedRows.find(row => row.id === id);
    if (attribute) {
      handleViewAttribute(attribute as Attribute);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('Attributes')}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddAttribute}
        >
          {t('Add Attribute')}
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
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[50, 100, 200]}
          checkboxSelection={true}
          disableRowSelectionOnClick={false}
          autoHeight
          getRowId={(row) => row.id}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(newSelection) => {
            setRowSelectionModel(newSelection);
          }}
          onRowClick={handleRowClick}
          loading={isLoadingAttributes}
          // Server-side pagination properties
          paginationMode="server"
          rowCount={data?.count || 0}
        />
      </ContentCard>

      {/* Animated Drawer for Attribute Form */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          isViewMode
            ? t('View Attribute')
            : drawerMode === 'add'
            ? t('Add Attribute')
            : t('Edit Attribute')
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
            {drawerMode === 'edit' && selectedAttribute && (
              <Typography variant="caption" color="text.secondary">
                {t('common.lastUpdated')}: {selectedAttribute?.updated_at ? formatDateTime(selectedAttribute.updated_at) : ''}
              </Typography>
            )}
          </Box>
        }
      >
        <AttributeForm
          initialData={selectedAttribute ? {
            name: selectedAttribute.name,
            code: selectedAttribute.code,
            label: selectedAttribute.label,
            description: selectedAttribute.description || '',
            data_type: selectedAttribute.data_type,
            is_required: selectedAttribute.is_required,
            is_filterable: selectedAttribute.is_filterable,
            use_for_variants: selectedAttribute.use_for_variants,
            show_on_pdp: selectedAttribute.show_on_pdp,
            is_active: selectedAttribute.is_active,
            groups: Array.isArray(selectedAttribute.groups) 
              ? selectedAttribute.groups.map(g => typeof g === 'number' ? g : g.id) 
              : [],
            validation_rules: selectedAttribute.validation_rules || {},
            options: selectedAttribute.options?.map(o => ({
              id: typeof o === 'object' ? o.id : undefined,
              option_label: typeof o === 'object' ? o.option_label : '',
              option_value: typeof o === 'object' ? o.option_value : '',
              sort_order: typeof o === 'object' ? o.sort_order : 0
            })) || []
          } : undefined}
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
          isViewMode={isViewMode}
          ref={formRef}
        />
      </AnimatedDrawer>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('Delete Attribute')}
        content={t('Delete Attribute Confirmation')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteDialog}
        isLoading={isDeleting}
      />

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
    </Box>
  );
}
