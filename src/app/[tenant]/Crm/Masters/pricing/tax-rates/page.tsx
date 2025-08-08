"use client";

/**
 * Tax Rates Listing Page
 * 
 * Page component for listing, filtering, and managing tax rates
 */
import React, { useState, useMemo, useRef } from 'react';
import { Typography, Box, Button, Tooltip, IconButton } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard, { FilterOption, FilterState as ContentCardFilterState } from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useFetchTaxRates, useDeleteTaxRate, useCreateTaxRate, useUpdateTaxRate, useFetchTaxRegions } from '@/app/hooks/api/pricing';
import { TaxRate } from '@/app/types/pricing';
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
import TaxRateForm from '@/app/components/admin/pricing/forms/TaxRateForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { TaxRateFormValues } from '@/app/components/admin/pricing/schemas';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

export interface TaxRateRow {
  id: number;
  rate_name: string;
  tax_type_code: string;
  rate_percentage: number;
  effective_from: string;
  effective_to?: string;
  country_code: string;
  is_active: boolean;
  formattedCreatedAt?: string;
  createdByUsername?: string;
  formattedUpdatedAt?: string;
  updatedByUsername?: string;
  // Add any other fields used in your DataGrid
}

// Type for filter state
interface FilterState {
  field: string;
  operator: string;
  value: any;
}

// Wrapper component that provides the DrawerContext
export default function TaxRatesPageWrapper() {
  return (
    <DrawerProvider>
      <TaxRatesPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function TaxRatesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<number | null>(null);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
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
    'id', 'rate_name', 'tax_type_code', 'rate_percentage', 'formattedEffectiveFrom', 'formattedEffectiveTo', 'country_code', 'is_active', 'formattedCreatedAt', 'createdByUsername', 
    'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');
  
  // State for delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: number | null}>({
    open: false,
    id: null
  });
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Reset to first page when changing tabs
    setPaginationParams(prev => ({
      ...prev,
      page: 1
    }));
  };

  // Build API query params based on active tab, search, and pagination
  const queryParams = useMemo(() => {
    const params: any = {
      ...paginationParams,
      search: searchTerm
    };

    // Only add is_active filter if not on 'all' tab
    if (activeTab === 'active') {
      params.is_active = true;
    } else if (activeTab === 'inactive') {
      params.is_active = false;
    }

    return params;
  }, [paginationParams, searchTerm, activeTab]);

  // API hooks
  const { data, isLoading: isLoadingTaxRates, isError, error, refetch } = useFetchTaxRates(queryParams);
  const { mutate: deleteTaxRate, isPending: isDeleting } = useDeleteTaxRate();
  const { mutate: createTaxRate, isPending: isCreating } = useCreateTaxRate();
  const { mutate: updateTaxRate, isPending: isUpdating } = useUpdateTaxRate();
  
  // Process data to add username fields directly and format dates
  const processedRows = useMemo(() => {
    if (!data) return [];
    
    // Handle both array response and paginated response structure
    const taxRates = Array.isArray(data) ? data : data.results || [];
    
    // Sort the data by ID in ascending order
    const sortedData = [...taxRates].sort((a, b) => a.id - b.id);
    
    return sortedData.map((item: any) => ({
      id: item.id,
      rate_name: item.rate_name,
      tax_type_code: item.tax_type_code,
      rate_percentage: item.rate_percentage,
      effective_from: item.effective_from,
      effective_to: item.effective_to,
      formattedEffectiveFrom: formatDateTime(item.effective_from),
      formattedEffectiveTo: item.effective_to ? formatDateTime(item.effective_to) : t('noEndDate'),
      country_code: item.country_code,
      is_active: item.is_active,
      createdByUsername: item.created_by?.full_name || item.created_by?.username || 'N/A',
      updatedByUsername: item.updated_by?.full_name || item.updated_by?.username || 'N/A',
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at),
    }));
  }, [data]);
  
  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = processedRows;
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(taxRate => 
        taxRate.rate_name?.toLowerCase().includes(lowerCaseSearch) ||
        taxRate.tax_type_code?.toLowerCase().includes(lowerCaseSearch) ||
        String(taxRate.rate_percentage).includes(lowerCaseSearch) ||
        taxRate.country_code?.toLowerCase().includes(lowerCaseSearch) ||
        taxRate.createdByUsername?.toLowerCase().includes(lowerCaseSearch) ||
        taxRate.updatedByUsername?.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(taxRate => {
        return activeFilters.every(filter => {
          const value = taxRate[filter.field as keyof typeof taxRate];
          
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active') {
                return taxRate.is_active === filter.value;
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
  }, [processedRows, searchTerm, activeFilters]);
  
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
  

  // Handle edit button click
  const handleEdit = (id: number) => {
    router.push(`/Masters/pricing/tax-rates/edit/${id}`);
  };
  
  // Handle delete button click
  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };
  
  // Handle delete confirmation
  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteTaxRate(confirmDelete.id, {
        onSuccess: () => {
          showSuccess(t('pricing.taxRate.deleteSuccess', 'Tax rate deleted successfully'));
          setConfirmDelete({ open: false, id: null });
          refetch();
        },
        onError: (error) => {
          console.error('Error deleting tax rate:', error);
          showError(t('pricing.taxRate.deleteError', 'Error deleting tax rate'));
          setConfirmDelete({ open: false, id: null });
        }
      });
    }
  };
  
  // Handle drawer open for adding a new tax rate
  const handleAddTaxRate = () => {
    setSelectedTaxRateId(null);
    setSelectedTaxRate(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };
  
  // Handle drawer open for editing a tax rate
  const handleOpenEditDrawer = (id: number) => {
    // Prevent multiple calls if already loading or if the same tax rate is already selected
    if (isLoading || (selectedTaxRateId === id && drawerOpen)) {
      return;
    }
    
    // Set loading state first
    setIsLoading(true);
    
    // Set the ID and mode
    setSelectedTaxRateId(id);
    setDrawerMode('edit');
    setIsViewMode(true); // Set to true initially
    setActiveSidebarItem('view'); // Set active sidebar item to view
    
    // Always fetch from API to ensure we have the most up-to-date data
    api.get(`/pricing/tax-rates/${id}/`, { headers: getAuthHeaders() })
      .then(response => {
        if (response.data) {
          // Store the full tax rate data
          setSelectedTaxRate(response.data);
          
          // Open drawer 
          setDrawerOpen(true);
          
          // Update drawer context
          drawerContext.openDrawer('edit');
        }
      })
      .catch(error => {
        console.error('Error fetching tax rate:', error);
        showError(t('taxRates.fetchError', 'Failed to fetch tax rate details'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
    setSelectedTaxRateId(null);
    setSelectedTaxRate(null);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  // Handle form save
  const handleSave = (values: TaxRateFormValues) => {
    if (drawerMode === 'add') {
      // Map form values to match the TaxRate interface
      const taxRateData = {
        rate_name: values.rate_name, // Use rate_name as name
        tax_type_code: values.tax_type_code, // Use tax_type_code as code
        rate_percentage: values.rate_percentage, // Use rate_percentage as rate
        effective_from: values.effective_from, // Use effective_from as effective_from
        effective_to: values.effective_to, // Use effective_to as effective_to
        country_code: values.country_code, // Use country_code as country_code
        is_active: true, // Always set to true for new tax rates
      };
      
      createTaxRate(taxRateData, {
        onSuccess: () => {
          showSuccess(t('taxRates.addSuccess', 'Tax rate added successfully'));
          handleDrawerClose();
          refetch();
        },
        onError: (error) => {
          console.error('Error creating tax rate:', error);
          showError(t('taxRates.addError', 'Error adding tax rate'));
        }
      });
    } else {
      if (selectedTaxRateId) {
        // Map form values to match the TaxRate interface
        const taxRateData = {
          id: selectedTaxRateId,
          rate_name: values.rate_name,
          tax_type_code: values.tax_type_code,
          rate_percentage: values.rate_percentage,
          effective_from: values.effective_from,
          effective_to: values.effective_to,
          country_code: values.country_code,
          is_active: values.is_active
        };
        
        updateTaxRate(taxRateData, {
          onSuccess: () => {
            showSuccess(t('taxRates.updateSuccess', 'Tax rate updated successfully'));
            handleDrawerClose();
            refetch();
          },
          onError: (error: any) => {
            console.error('Error updating tax rate:', error);
            
            // Check if there's a specific validation error from the API
            if (error?.response?.data) {
              // Handle validation errors
              const errorData = error.response.data;
              // Check for price validation error
              if (errorData.price_from) {
                // Handle array of error messages
                showError(Array.isArray(errorData.price_from) 
                  ? errorData.price_from[0] 
                  : errorData.price_from);
              } else if (errorData.non_field_errors) {
                // Handle other non-field specific errors
                showError(Array.isArray(errorData.non_field_errors) 
                  ? errorData.non_field_errors[0]
                  : errorData.non_field_errors
                );
              } else {
                // Fallback to the first error if available
                const firstError = Object.values(errorData)[0];
                showError(Array.isArray(firstError) ? firstError[0] : firstError);
              }
            } else {
              // Fallback to generic error
              showError(t('taxRates.updateError', 'Error updating tax rate'));
            }
          }
        });
      }
    }
  };
  
  // DataGrid columns definition
  const columns: GridColDef<TaxRateRow>[] = [
    { field: 'id', headerName: t('id'), width: 70 },
    { field: 'rate_name', headerName: t('name'), width: 150 },
    { field: 'tax_type_code', headerName: t('code'), width: 120 },
    { 
      field: 'rate_percentage', 
      headerName: t('rate'), 
      width: 120,
      renderCell: (params: GridRenderCellParams<TaxRateRow, number> | null | undefined) => {
        if (!params || params.value === undefined || params.value === null) return '';
        return `${params.value}%`;
      }
    },
    { 
      field: 'formattedEffectiveFrom', 
      headerName: t('effectiveFrom'), 
      width: 150
    },
    { 
      field: 'formattedEffectiveTo', 
      headerName: t('effectiveTo'), 
      width: 150
    },
    { 
      field: 'country_code', 
      headerName: t('country'), 
      width: 100 
    },
    { 
      field: 'is_active', 
      headerName: t('Status'), 
      width: 100,
      renderCell: (params: GridRenderCellParams<TaxRateRow, boolean> | null | undefined) => {
        if (!params) return '';
        const isActive = params.value === true;
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
      headerName: t('createdAt'), 
      width: 150
    },
    { 
      field: 'createdByUsername', 
      headerName: t('createdBy'), 
      width: 120
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: t('updatedAt'), 
      width: 150
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('updatedBy'), 
      width: 120
    },
    // Removed obsolete columns for taxRegionsDisplay and categoryDisplay
    { 
      field: 'actions', 
      headerName: t('Actions'), 
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<TaxRateRow>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('delete', 'Delete')}>
            <IconButton 
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleDelete(params.row.id);
              }}
              // onClick={() => handleDelete(params.row.id)}
              aria-label={t('delete', 'Delete tax rate')}
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
      field: 'code',
      label: t('code'),
      type: 'text' as const
    },
    {
      field: 'rate',
      label: t('rate'),
      type: 'number' as const
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
  const columnOptions = useMemo(() => columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  })), [columns]);
  
  // Define tab options with counts from API response
  const tabOptions = useMemo(() => [
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
  ], [data?.counts, t]);
  
  // Drawer sidebar icons for view/edit modes
  const drawerSidebarIcons = useMemo(() => {
    // If in add mode, return empty array
    if (drawerMode === 'add') {
      return [];
    }
    
    // Otherwise, return the icons for edit mode
    return [
      { 
        id: 'view', 
        icon: <VisibilityIcon />, 
        tooltip: t('view'), 
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem('view');
          drawerContext.setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('edit'), 
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem('edit');
          drawerContext.setActiveSidebarItem('edit');
        }
      }
    ];
  }, [drawerMode, t, drawerContext]);
  
  if (isLoadingTaxRates) return <Loader />;
  
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
          {t('Tax Rates')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddTaxRate}
        >
          {t('add')}
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
            rows={filteredData}
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
            // Server-side pagination properties
            rowCount={data?.count || 0}
            paginationMode="server"
            loading={isLoadingTaxRates}
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row) => row.id}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={(params) => {
              handleOpenEditDrawer(params.row.id);
            }}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              Grid view is not implemented yet
            </Typography>
          </Box>
        )}
      </ContentCard>
      
      {/* AnimatedDrawer for adding/editing tax rates */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={drawerMode === 'add' ? t('Add Tax Rate') : t('Edit Tax Rate')}
        initialWidth={550}
        expandedWidth={550}
        onSave={!isViewMode ? handleSubmit : undefined}
        saveDisabled={isCreating || isUpdating || isLoading}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedTaxRateId && (
              <Typography variant="caption" color="text.secondary">
                {/* {t('lastUpdated', 'Last updated')}: {formatDateTime(taxRateData?.updated_at || '')} */}
              </Typography>
            )}
          </Box>
        }
      >
        {isLoading ? (
          <Loader message={t('loading')} />
        ) : (
          <TaxRateForm
            ref={formRef}
            defaultValues={
              selectedTaxRate ? {
                rate_name: selectedTaxRate.rate_name,
                tax_type_code: selectedTaxRate.tax_type_code,
                rate_percentage: selectedTaxRate.rate_percentage,
                effective_from: selectedTaxRate.effective_from,
                effective_to: selectedTaxRate.effective_to,
                country_code: selectedTaxRate.country_code,
                is_active: selectedTaxRate.is_active,
              } : undefined
            }
            
            isViewMode={isViewMode}
            onSubmit={handleSave}
            isSubmitting={isCreating || isUpdating}
            isEditMode={drawerMode === 'edit'}
          />
        )}
      </AnimatedDrawer>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('Delete Tax Rate')}
        content={t('Delete Tax Rate Confirmation')}
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
}
