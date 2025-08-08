"use client";

/**
 * Currencies Listing Page
 * 
 * Page component for listing, filtering, and managing currencies
 */
import React, { useState, useMemo, useRef } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  IconButton, 
  Tooltip,
  CircularProgress
} from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useFetchCurrencies, useDeleteCurrency, useCreateCurrency, useUpdateCurrency } from '@/app/hooks/api/shared';
import { Currency } from '@/app/types/shared';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { formatDateTime } from '@/app/utils/dateUtils';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import CurrencyForm, { CurrencyFormRef, CurrencyFormValues } from '@/app/components/admin/shared/forms/CurrencyForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Processed type for DataGrid display
interface ProcessedCurrency extends Currency {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
  statusText: string;
}

function CurrenciesPage() {
  const { t } = useTranslation();
  const drawerContext = useDrawer();
  
  // Form ref
  const formRef = useRef<CurrencyFormRef>(null);
  
  // State for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');
  
  // State for sidebar content
  const drawerSidebarContent = {};
  
  // State for data grid (0-indexed for UI)
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });
  
  // API pagination params state (1-indexed)
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    page_size: 50
  });
  
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // State for view mode (list or grid)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // State for search, filter, and visible columns
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'code', 'name', 'symbol', 'exchange_rate_to_usd', 'statusText', 
    'formattedCreatedAt', 'createdByUsername', 'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');
  
  // State for delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; code: string | null }>({
    open: false,
    code: null
  });
  
  // State for notification
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  
  // API hooks
  const { data: currencies, isLoading: isCurrenciesLoading, refetch: refetchCurrencies } = useFetchCurrencies({...paginationParams, search: searchTerm});
  const { mutate: deleteCurrency, isPending: isDeleting } = useDeleteCurrency();
  const { mutate: createCurrency, isPending: isCreating } = useCreateCurrency();
  const { mutate: updateCurrency, isPending: isUpdating } = useUpdateCurrency();
  
  // Process data for display
  const processedData = useMemo(() => {
    if (!currencies) return [];
    
    // Handle both array response and paginated response structure
    const currencyItems = Array.isArray(currencies) ? currencies : currencies.results || [];
    
    return currencyItems.map((currency: Currency) => ({
      ...currency,
      formattedCreatedAt: formatDateTime(currency.created_at),
      formattedUpdatedAt: formatDateTime(currency.updated_at),
      createdByUsername: currency.created_by?.username || '-',
      updatedByUsername: currency.updated_by?.username || '-',
      statusText: currency.is_active ? t('active') : t('inactive')
    }));
  }, [currencies, t]);
  
  // Filter options for the filter dropdown
  const filterOptions: FilterOption[] = [
    { 
      field: 'code', 
      label: t('currencyCode'), 
      type: 'text' 
    },
    { 
      field: 'name', 
      label: t('currencyName'), 
      type: 'text' 
    },
    { 
      field: 'symbol', 
      label: t('currencySymbol'), 
      type: 'text' 
    },
    { 
      field: 'is_active', 
      label: t('status'), 
      type: 'boolean',
      options: [
        { value: 'true', label: t('active') },
        { value: 'false', label: t('inactive') }
      ]
    }
  ];
  
  // Tab options for the tab bar
  const tabOptions = [
    { value: 'all', label: t('all'), count: processedData.length },
    { value: 'active', label: t('active'), count: processedData.filter((c: ProcessedCurrency) => c.is_active).length },
    { value: 'inactive', label: t('inactive'), count: processedData.filter((c: ProcessedCurrency) => !c.is_active).length }
  ];
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };
  
  // Handle view change (list or grid)
  const handleViewChange = (newView: 'list' | 'grid') => {
    setViewMode(newView);
  };
  
  // Handle filter change
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Filter data based on search term, filters, and active tab
  const filteredData = useMemo(() => {
    let filtered = [...processedData];
    
    // Filter by search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((currency: ProcessedCurrency) => 
        currency.code.toLowerCase().includes(lowerSearchTerm) ||
        currency.name.toLowerCase().includes(lowerSearchTerm) ||
        currency.symbol.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Filter by active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter((currency: ProcessedCurrency) => {
        return activeFilters.every(filter => {
          const value = currency[filter.field as keyof ProcessedCurrency];
          
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active') {
                return value === (filter.value === 'true');
              }
              return value === filter.value;
            case 'contains':
              if (typeof value === 'string') {
                return value.toLowerCase().includes(filter.value.toLowerCase());
              }
              return false;
            default:
              return true;
          }
        });
      });
    }
    
    // Filter by active tab
    if (activeTab === 'active') {
      filtered = filtered.filter((currency: ProcessedCurrency) => currency.is_active);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter((currency: ProcessedCurrency) => !currency.is_active);
    }
    
    return filtered;
  }, [processedData, searchTerm, activeFilters, activeTab]);
  
  // Columns for the data grid
  const columns: GridColDef[] = useMemo(() => [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      // type: 'number'
    },
    { 
      field: 'code', 
      headerName: t('currencyCode'), 
      width: 120 
    },
    { 
      field: 'name', 
      headerName: t('currencyName'), 
      width: 200 
    },
    { 
      field: 'symbol', 
      headerName: t('currencySymbol'), 
      width: 120 
    },
    { 
      field: 'exchange_rate_to_usd', 
      headerName: t('exchangeRate'), 
      width: 180,
    },
    { 
      field: 'statusText', 
      headerName: t('fields.status', 'Status'), 
      width: 120 ,
      renderCell: (params) => {
        const status = params.value as string;
        let textColor = '#00a854'; // Green text for Active
        
        if (status === 'Inactive') {
          textColor = '#f44336'; // Red text
        } else if (status === 'Low Stock') {
          textColor = '#ffab00'; // Amber text
        }
        
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
      headerName: t('Actions', 'Actions'), 
      width: 100, 
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('delete')}>
            <IconButton 
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click event
                handleDelete(params.row.code);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ], [t]);
  
  // Define column options for visibility control
  const columnOptions = columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  }));
  
  // Sidebar icons for drawer
  const drawerSidebarIcons = useMemo(() => {
    // If in add mode, return empty array
    if (drawerMode === 'add') {
      return [];
    }
    
    // Only show icons in edit mode
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
  
  // Open drawer for adding a new currency
  const handleOpenAddDrawer = () => {
    setSelectedCurrencyCode(null);
    setSelectedCurrency(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    
    // Open drawer only once to prevent multiple API calls
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };
  
  // Open drawer for editing a currency
  const handleOpenEditDrawer = (code: string) => {
    // Prevent multiple calls if already loading or if the same currency is already selected
    if (isLoading || (selectedCurrencyCode === code && drawerOpen)) {
      return;
    }
    
    // Set loading state first
    setIsLoading(true);
    
    // Set the ID and mode
    setSelectedCurrencyCode(code);
    setDrawerMode('edit');
    setIsViewMode(true); // Set to true initially since we're setting activeSidebarItem to 'view'
    setActiveSidebarItem('view');
    
    // First fetch the data, then open the drawer
    api.get(`/shared/currencies/${code}/`)
      .then(response => {
        if (response.data) {
          // Store the full currency data
          setSelectedCurrency(response.data);
          
          // Open drawer only once to prevent multiple API calls
          setDrawerOpen(true);
          
          // Update drawer context only once
          drawerContext.openDrawer('edit');
          drawerContext.setActiveSidebarItem('view');
        }
      })
      .catch(error => {
        console.error('Error fetching currency:', error);
        showError(t('currencies.fetchError', 'Failed to fetch currency details'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Close drawer
  const closeDrawer = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
  };
  
  // Handle delete
  const handleDelete = (code: string) => {
    setConfirmDelete({
      open: true,
      code
    });
  };
  
  // Confirm delete action
  const confirmDeleteAction = () => {
    if (confirmDelete.code) {
      deleteCurrency(confirmDelete.code, {
        onSuccess: () => {
          showSuccess('Currency deleted successfully');
          setConfirmDelete({ open: false, code: null });
        },
        onError: (error) => {
          console.error('Error deleting currency:', error);
          showError('Failed to delete currency');
          setConfirmDelete({ open: false, code: null });
        }
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };
  
  // Handle form data submission
  const handleFormSubmit = (formData: CurrencyFormValues) => {
    if (drawerMode === 'add') {
      createCurrency(formData, {
        onSuccess: () => {
          showSuccess('Currency created successfully');
          closeDrawer();
        },
        onError: (error) => {
          console.error('Error creating currency:', error);
          showError('Failed to create currency');
        }
      });
    } else if (drawerMode === 'edit' && selectedCurrencyCode) {
      updateCurrency({ 
        id: selectedCurrencyCode, 
        data: formData 
      }, {
        onSuccess: () => {
          showSuccess('Currency updated successfully');
          closeDrawer();
        },
        onError: (error) => {
          console.error('Error updating currency:', error);
          showError('Failed to update currency');
        }
      });
    }
  };
  
  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
          {t('Currencies')}
            </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDrawer}
          >
            {t('addCurrency')}
          </Button>
        </Box>
      
        <ContentCard 
          onSearch={handleSearch}
          onViewChange={handleViewChange}
          onFilterChange={handleFilterChange}
          onColumnsChange={setVisibleColumns}
          onTabChange={() => {}}
          filterOptions={filterOptions}
          columnOptions={columnOptions}
          tabOptions={tabOptions}
        >
          {viewMode === 'list' ? (
            <CustomDataGrid
              rows={filteredData}
              columns={columns.filter((col: GridColDef) => visibleColumns.includes(col.field))}
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
              rowCount={currencies?.count || 0}
              paginationMode="server"
              checkboxSelection={true}
              disableRowSelectionOnClick={false}
              autoHeight
              loading={isCurrenciesLoading}
              getRowId={(row) => row.id}
              onRowSelectionModelChange={(newSelection) => {
                setRowSelectionModel(newSelection);
              }}
              rowSelectionModel={rowSelectionModel}
              onRowClick={(params) => {
                handleOpenEditDrawer(params.row.code);
              }}
            />
          ) : (
            // Grid view can be implemented here
            <Box sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" align="center">
                {t('gridViewNotImplemented', 'Grid view is not implemented yet')}
              </Typography>
            </Box>
          )}
        </ContentCard>
      
        <ConfirmDialog
          open={confirmDelete.open}
          title={t('deleteCurrency')}
          content={t('deleteCurrencyConfirm')}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete({ open: false, code: null })}
          isLoading={isDeleting}
        />
      
        <Notification
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          onClose={hideNotification}
        />
      
        <AnimatedDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          title={drawerMode === 'add' ? t('addCurrency') : t('editCurrency')}
          initialWidth={550}
          expandedWidth={550}
          sidebarIcons={drawerSidebarIcons}
          sidebarContent={drawerSidebarContent}
          defaultSidebarItem={activeSidebarItem}
          onSave={!isViewMode ? handleSubmit : undefined}
          saveDisabled={isCreating || isUpdating || isLoading}
          footerContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {drawerMode === 'edit' && selectedCurrency && (
                <Typography variant="caption" color="text.secondary">
                  {t('lastUpdated')}: {formatDateTime(selectedCurrency.updated_at || '')}
                </Typography>
              )}
            </Box>
          }
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <CurrencyForm
              ref={formRef}
              initialData={selectedCurrency ? {
                code: selectedCurrency.code,
                name: selectedCurrency.name,
                symbol: selectedCurrency.symbol,
                exchange_rate_to_usd: selectedCurrency.exchange_rate_to_usd,
                is_active: selectedCurrency.is_active
              } : undefined}
              isViewMode={isViewMode}
              onSubmit={handleFormSubmit}
            />
          )}
        </AnimatedDrawer>
      </Box>
  );
}

// Wrap the component with the DrawerProvider
export default function CurrenciesPageWrapper() {
  return (
    <DrawerProvider>
      <CurrenciesPage />
    </DrawerProvider>
  );
}
