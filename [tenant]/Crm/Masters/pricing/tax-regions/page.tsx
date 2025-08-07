"use client";

/**
 * Tax Regions Listing Page
 * 
 * Page component for listing, filtering, and managing tax regions
 */
import React, { useState, useMemo, useRef } from 'react';
import { Typography, Box, Button, Tooltip, IconButton, FormControlLabel, Switch } from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard, { FilterOption, FilterState as ContentCardFilterState } from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useFetchTaxRegions, useDeleteTaxRegion, useCreateTaxRegion, useUpdateTaxRegion } from '@/app/hooks/api/pricing';
import { TaxRegion, Country } from '@/app/types/pricing';
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
import TaxRegionForm from '@/app/components/admin/pricing/forms/TaxRegionForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { TaxRegionFormValues } from '@/app/components/admin/pricing/schemas';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Extended type to handle audit fields
interface TaxRegionExtended extends TaxRegion {
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
interface ProcessedTaxRegion extends TaxRegionExtended {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
  countryNames: string;
}

// Type for filter state
interface FilterState {
  field: string;
  operator: string;
  value: any;
}

// Wrapper component that provides the DrawerContext
export default function TaxRegionsPageWrapper() {
  return (
    <DrawerProvider>
      <TaxRegionsPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function TaxRegionsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedTaxRegionId, setSelectedTaxRegionId] = useState<number | null>(null);
  const [selectedTaxRegion, setSelectedTaxRegion] = useState<TaxRegion | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);
  
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
  const [activeFilters, setActiveFilters] = useState<ContentCardFilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'code', 'countryNames', 'is_active', 
    'formattedCreatedAt', 'createdByUsername', 
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
  const { data, isLoading: isLoadingTaxRegions, isError, error, refetch } = useFetchTaxRegions(queryParams);
  const { mutate: deleteTaxRegion, isPending: isDeleting } = useDeleteTaxRegion();
  const { mutate: createTaxRegion, isPending: isCreating } = useCreateTaxRegion();
  const { mutate: updateTaxRegion, isPending: isUpdating } = useUpdateTaxRegion();
 
  
  // Process data to add username fields directly and format dates
  const processedRows = useMemo(() => {
    if (!data) return [];
    
    // Handle both array response and paginated response structure
    const taxRegions = Array.isArray(data) ? data : data.results || [];
    
    // Sort the data by ID in ascending order
    const sortedData = [...taxRegions].sort((a, b) => a.id - b.id);
    
    return sortedData.map((item) => ({
      ...item,
      createdByUsername: item.created_by?.username || 'N/A',
      updatedByUsername: item.updated_by?.username || 'N/A',
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at),
      countryNames: item.country_details?.map((country: any) => country.name).join(', ') || 'No Countries'
    }));
  }, [data]);
  
  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = processedRows;
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(taxRegion => 
        taxRegion.name.toLowerCase().includes(lowerCaseSearch) ||
        taxRegion.code.toLowerCase().includes(lowerCaseSearch) ||
        (taxRegion.countryNames && taxRegion.countryNames.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(taxRegion => {
        return activeFilters.every(filter => {
          const value = taxRegion[filter.field as keyof typeof taxRegion];
          
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active') {
                return taxRegion.is_active === filter.value;
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
  const handleFilterChange = (filters: ContentCardFilterState[]) => {
    setActiveFilters(filters);
  };
  

  
  // Handle delete confirmation
  const handleDeleteConfirm = (id: number) => {
    setConfirmDelete({
      open: true,
      id
    });
  };
  
  // Handle delete action
  const handleDelete = () => {
    if (confirmDelete.id) {
      deleteTaxRegion(confirmDelete.id, {
        onSuccess: () => {
          showSuccess(t('taxRegions.deleteSuccess'));
          refetch();
        },
        onError: (error) => {
          showError(t('taxRegions.deleteError'));
          console.error('Delete error:', error);
        },
        onSettled: () => {
          setConfirmDelete({
            open: false,
            id: null
          });
        }
      });
    }
  };
  
  // Handle drawer open for adding a new tax region
  const handleAddTaxRegion = () => {
    setSelectedTaxRegionId(null);
    setSelectedTaxRegion(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };
  
  // Handle drawer open for editing a tax region
  const handleOpenEditDrawer = (id: number) => {
    // Prevent multiple calls if already loading or if the same tax region is already selected
    if (isLoading || (selectedTaxRegionId === id && drawerOpen)) {
      return;
    }
    
    // Set loading state first
    setIsLoading(true);
    
    // Set the ID and mode
    setSelectedTaxRegionId(id);
    setDrawerMode('edit');
    setIsViewMode(true); // Set to true initially
    setActiveSidebarItem('view'); // Set active sidebar item to view
    
    // Fetch the tax region data directly using the API
    api.get(`/pricing/tax-regions/${id}/`, { headers: getAuthHeaders() })
      .then(response => {
        if (response.data) {
          // Store the full tax region data
          setSelectedTaxRegion(response.data);
          
          // Open drawer 
          setDrawerOpen(true);
          
          // Update drawer context
          drawerContext.openDrawer('edit');
        }
      })
      .catch(error => {
        console.error('Error fetching tax region:', error);
        showError(t('taxRegions.fetchError', 'Failed to fetch tax region details'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
    setSelectedTaxRegionId(null);
    setSelectedTaxRegion(null);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  // Handle form save
  const handleSave = (values: TaxRegionFormValues) => {
    if (drawerMode === 'add') {
      createTaxRegion(values, {
        onSuccess: () => {
          showSuccess(t('taxRegions.addSuccess', 'Tax region added successfully'));
          handleDrawerClose();
          refetch();
        },
        onError: (error: any) => {
          showError(t('taxRegions.addError', 'Failed to add tax region') + ': ' + (error?.message || t('common.unknownError')));
        }
      });
    } else {
      if (selectedTaxRegionId) {
        updateTaxRegion(
          { id: selectedTaxRegionId, ...values },
          {
            onSuccess: () => {
              showSuccess(t('taxRegions.updateSuccess', 'Tax region updated successfully'));
              handleDrawerClose();
              refetch();
            },
            onError: (error: any) => {
              showError(t('taxRegions.updateError', 'Failed to update tax region') + ': ' + (error?.message || t('common.unknownError')));
            }
          }
        );
      }
    }
  };

  // Add rowSelectionModel state
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // Define column configuration for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: t('Id'),
      width: 70,
    },
    {
      field: 'name',
      headerName: t('Name'),
      width: 200,
      flex: 1,
    },
    {
      field: 'code',
      headerName: t('Code'),
      width: 120,
    },
    {
      field: 'countryNames',
      headerName: t('Countries'),
      width: 250,
      flex: 1,
    },
    {
      field: 'is_active',
      headerName: t('Status'),
      width: 120,
      renderCell: (params: GridRenderCellParams<ProcessedTaxRegion>) => {
        const isActive = params.row.is_active;
        const status = isActive ? 'Active' : 'Inactive';
        const textColor = isActive ? '#00a854' : '#f44336'; // Green for Active, Red for Inactive
        
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
      headerName: t('CreatedAt'),
      width: 180,
    },
    {
      field: 'createdByUsername',
      headerName: t('CreatedBy'),
      width: 150,
    },
    {
      field: 'formattedUpdatedAt',
      headerName: t('UpdatedAt'),
      width: 180,
    },
    {
      field: 'updatedByUsername',
      headerName: t('UpdatedBy'),
      width: 150,
    },
    {
      field: 'actions',
      headerName: t('Actions'),
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ProcessedTaxRegion>) => {
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row click
                  handleDeleteConfirm(params.row.id);
                }}
                // onClick={() => handleDeleteConfirm(params.row.id)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];
  
  // Define column options for visibility control
  const columnOptions = useMemo(() => columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  })), [columns]);

  // Define tab options using counts from API response
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

  // Define filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: 'name',
      label: t('name'),
      type: 'text' as const,
    },
    {
      field: 'code',
      label: t('code'),
      type: 'text' as const,
    },
    {
      field: 'is_active',
      label: t('status'),
      type: 'boolean' as const,
    },
    {
      field: 'created_at',
      label: t('createdAt'),
      type: 'date' as const,
    },
    {
      field: 'updated_at',
      label: t('updatedAt'),
      type: 'date' as const,
    },
  ];

  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');

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

  return (
    <>
        <Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' ,mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('Tax Regions')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddTaxRegion}
        >
          {t('add', 'Tax Region')}
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
        
          {isLoadingTaxRegions ? (
            <Loader message={t('loading')} />
          ) : isError ? (
            <Typography color="error">
              {t('error')}
            </Typography>
          ) : view === 'list' ? (
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
              getRowId={(row) => row.id}
              checkboxSelection={true}
              disableRowSelectionOnClick={false}
              autoHeight
              loading={isLoadingTaxRegions}
              onRowSelectionModelChange={(newSelection) => {
                setRowSelectionModel(newSelection);
              }}
              rowSelectionModel={rowSelectionModel}
              onRowClick={(params) => {
                handleOpenEditDrawer(params.row.id);
              }}
            />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" align="center">
                {t('Grid view is not implemented yet')}
              </Typography>
            </Box>
          )}
      </ContentCard>
      
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('Delete Tax Region')}
        content={t('Delete Tax Region Confirmation')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        isLoading={isDeleting}
      />
      
      {/* Notification component */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
      
      {/* AnimatedDrawer for adding/editing tax regions */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={drawerMode === 'add' ? t('Add Tax Region') : t('Edit Tax Region')}
        initialWidth={550}
        expandedWidth={550}
        onSave={!isViewMode ? handleSubmit : undefined}
        saveDisabled={isCreating || isUpdating || isLoading}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedTaxRegionId && (
              <Typography variant="caption" color="text.secondary">
                {/* {t('lastUpdated', 'Last updated')}: {formatDateTime(taxRegionData?.updated_at || '')} */}
              </Typography>
            )}
          </Box>
        }
      >
        {isLoading ? (
          <Loader message={t('common.loading')} />
        ) : (
          <TaxRegionForm
            ref={formRef}
            defaultValues={
              selectedTaxRegion ? {
                name: selectedTaxRegion.name,
                code: selectedTaxRegion.code,
                description: selectedTaxRegion.description || '',
                is_active: selectedTaxRegion.is_active,
                countries: Array.isArray(selectedTaxRegion?.countries) 
                  ? selectedTaxRegion.countries.map(country => typeof country === 'object' ? country.id : country)
                  : Array.isArray((selectedTaxRegion as any)?.country_details)
                    ? (selectedTaxRegion as any).country_details.map((country: any) => country.id)
                    : []
              } : undefined
            }
            isViewMode={isViewMode}
            onSubmit={handleSave}
          />
        )}
      </AnimatedDrawer>
      </Box>

    </>
  );
}
