"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Grid, 
  Typography,
  IconButton,
  Tooltip,
  Button,
  Link
} from '@mui/material';
import { 
  GridColDef, 
  GridPaginationModel, 
  GridRowSelectionModel,
  GridRenderCellParams 
} from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import AnalyticsCard from '@/app/components/common/AnalyticsCard';
import Loader from '@/app/components/common/Loader';
import { useFetchInventoryList, useFetchInventorySummary } from '@/app/hooks/api/inventory';
import { ProcessedInventoryItem, ApiInventoryItem } from '@/app/types/inventory-types';
import useDebounce from '@/app/hooks/useDebounce';
import { formatDateTime } from '@/app/utils/dateUtils';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';

// Icons
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

// Interface for filter state
interface InventoryFilterState {
  product_name: string;
  location_name: string;
  quantity?: number;
  available_quantity?: number;
  status?: string;
}

export default function InventoryPageWrapper() {
  return (
    <DrawerProvider>
      <InventoryPage />
    </DrawerProvider>
  );
}

function InventoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const drawerContext = useDrawer();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');

  // State variables
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'draft' | 'low_stock'>('all');
  const [filters, setFilters] = useState<InventoryFilterState>({
    product_name: '',
    location_name: '',
    quantity: undefined,
    available_quantity: undefined,
    status: undefined,
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id',
    'product.name',
    'product.sku',
    'stock_quantity',
    'reserved_quantity',
    'available_to_promise',
    'stock_status',
    'formattedLastUpdated',
    'createdByUsername',
    'formattedCreatedAt',
    'updatedByUsername',
    'location.name',
    'actions'
  ]);
  const [gridState, setGridState] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);

  // Debounce filter changes
  const debouncedFilters = useDebounce(filters, 500);

  // Fetch inventory data
  const { data: inventoryData, isLoading, error } = useFetchInventoryList({
    page: gridState.page + 1,
    pageSize: gridState.pageSize,
    product__name__icontains: debouncedFilters.product_name || undefined,
    location__name__icontains: debouncedFilters.location_name || undefined,
    stock_quantity__gte: debouncedFilters.quantity,
    available_to_promise__gte: debouncedFilters.available_quantity,
    isActive: activeTab === 'active' ? true : activeTab === 'inactive' ? false : undefined,
    ordering: '-updated_at', // Sort by most recently updated first
  });

  // Fetch inventory summary data
  const { data: summaryData, isLoading: isSummaryLoading } = useFetchInventorySummary();

  // Process inventory data for display
  const processedData: ProcessedInventoryItem[] = useMemo(() => {
    if (!inventoryData?.results) return [];
    
    return inventoryData.results.map(item => ({
      id: item.id,
      product: {
        id: item.product?.id || 0,
        name: item.product?.name || '-',
        sku: item.product?.sku,
        is_active: item.product?.is_active
      },
      location: {
        id: item.location?.id || 0,
        name: item.location?.name || '-',
        location_type: item.location?.location_type
      },
      stock_quantity: item.stock_quantity || 0,
      reserved_quantity: item.reserved_quantity || 0,
      non_saleable_quantity: item.non_saleable_quantity || 0,
      on_order_quantity: item.on_order_quantity || 0,
      in_transit_quantity: item.in_transit_quantity || 0,
      returned_quantity: item.returned_quantity || 0,
      hold_quantity: item.hold_quantity || 0,
      backorder_quantity: item.backorder_quantity || 0,
      low_stock_threshold: item.low_stock_threshold || 0,
      created_at: item.created_at || '',
      updated_at: item.updated_at || '',
      available_to_promise: item.available_to_promise || 0,
      total_available: item.total_available || 0,
      total_unavailable: item.total_unavailable || 0,
      stock_status: item.stock_status || 'IN_STOCK',
      formattedLastUpdated: formatDateTime(item.updated_at || ''),
      formattedCreatedAt: formatDateTime(item.created_at || ''),
      createdByUsername: item.created_by?.username || '-',
      updatedByUsername: item.updated_by?.username || '-',
    }));
  }, [inventoryData]);

  // Total count for pagination
  const totalCount = inventoryData?.count || 0;

  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    { field: 'location_name', label: t('inventory.filters.locationName', 'Location'), type: 'text' },
    { field: 'quantity', label: t('inventory.filters.stockQuantity', 'Stock Quantity'), type: 'number' },
    { field: 'available_quantity', label: t('inventory.filters.availableToPromise', 'Available to Promise'), type: 'number' },
    { field: 'product_name', label: t('inventory.filters.productName', 'Product Name'), type: 'text' },
  ];

  // Column options for ContentCard
  const columnOptions = [
    { field: 'id', headerName: t('id') },
    { field: 'product.name', headerName: t('inventory.columns.productName', 'Product Name') },
    { field: 'product.sku', headerName: t('inventory.columns.productCode', 'Product Code') },
    { field: 'stock_quantity', headerName: t('inventory.columns.stockQuantity', 'Stock Qty') },
    { field: 'available_to_promise', headerName: t('inventory.columns.availableToPromise', 'Available') },
    { field: 'created_at', headerName: t('common.createdAt', 'Created At') },
    { field: 'created_by', headerName: t('common.createdBy', 'Created By') },
    { field: 'updated_at', headerName: t('common.updatedAt', 'Updated At') },
    { field: 'updated_by', headerName: t('common.updatedBy', 'Updated By') },
  ];

  // Tab options for ContentCard
  const tabOptions = [
    { 
      value: 'all', 
      label: t('common.tabs.all', 'All'), 
      count: 0 
    },
    { 
      value: 'draft', 
      label: t('inventory.tabs.draft', 'Draft'), 
      count: 0 
    },
    { 
      value: 'low_stock', 
      label: t('inventory.tabs.lowStock', 'Low Stock'), 
      count: 0 
    },
  ];

  // Handle search from ContentCard
  const handleSearch = useCallback((term: string) => {
    setFilters(prev => ({
      ...prev,
      product_name: term,
    }));
  }, []);

  // Handle view change from ContentCard
  const handleViewChange = useCallback((newView: 'list' | 'grid') => {
    setView(newView);
  }, []);

  // Handle filter change from ContentCard
  const handleFilterChange = useCallback((contentFilters: FilterState[]) => {
    const newFilters: Partial<InventoryFilterState> = {};
    
    contentFilters.forEach(filter => {
      if (filter.field === 'product_name') {
        newFilters.product_name = filter.value;
      } else if (filter.field === 'location_name') {
        newFilters.location_name = filter.value;
      } else if (filter.field === 'quantity') {
        if (filter.operator === 'between') {
          newFilters.quantity = filter.value.start;
        } else if (filter.operator === 'greaterThan') {
          newFilters.quantity = filter.value;
        } else if (filter.operator === 'lessThan') {
          newFilters.quantity = filter.value;
        }
      } else if (filter.field === 'available_quantity') {
        if (filter.operator === 'between') {
          newFilters.available_quantity = filter.value.start;
        } else if (filter.operator === 'greaterThan') {
          newFilters.available_quantity = filter.value;
        } else if (filter.operator === 'lessThan') {
          newFilters.available_quantity = filter.value;
        }
      }
    });

    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  // Handle tab change from ContentCard
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab as 'all' | 'active' | 'inactive' | 'draft' | 'low_stock');
  }, []);

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedInventoryId(null);
    setViewMode(true);
    setActiveSidebarItem('view');
  };

  // Handle row click
  const handleRowClick = (params: any) => {
    setSelectedInventoryId(params.row.id);
    setDrawerOpen(true);
    
    // If we want to navigate to edit page instead of opening drawer
    // Get the current URL path to extract tenant slug
    // const pathParts = window.location.pathname.split('/');
    // const tenantSlug = pathParts[1]; // First part after the domain is the tenant slug
    // router.push(`/${tenantSlug}/Masters/inventory/${params.row.id}`);
  };

  // Drawer sidebar icons
  const drawerSidebarIcons = useMemo(() => [
    { 
      id: 'view', 
      icon: <VisibilityIcon />, 
      tooltip: t('view'), 
      onClick: () => {
        setViewMode(true);
        setActiveSidebarItem('view');
      }
    }
  ], [t]);

  // Column definitions for the data grid
  const columns: GridColDef[] = useMemo(() => {
    return [
      { field: 'id', headerName: t('id'), width: 70 },
      { 
        field: 'product.name', 
        headerName: t('inventory.productName', 'Product Name'), 
        width: 150,
        renderCell: (params: GridRenderCellParams<ProcessedInventoryItem>) => {
          if (!params.row) return <Typography variant="body2">-</Typography>;
          return <Typography variant="body2">{params.row.product?.name || '-'}</Typography>;
        }
      },
      { 
        field: 'location.name', 
        headerName: t('inventory.locationName', 'Location'), 
        width: 150,
        renderCell: (params: GridRenderCellParams<ProcessedInventoryItem>) => {
          if (!params.row) return <Typography variant="body2">-</Typography>;
          return <Typography variant="body2">{params.row.location?.name || '-'}</Typography>;
        }
      },
      { 
        field: 'stock_quantity', 
        headerName: t('inventory.stockQuantity', 'Stock Quantity'), 
        width: 120,
        type: 'number'
      },
      { 
        field: 'reserved_quantity', 
        headerName: t('inventory.reservedQuantity', 'Reserved Quantity'), 
        width: 120,
        type: 'number'
      },
      { 
        field: 'available_to_promise', 
        headerName: t('inventory.availableToPromise', 'Available to Promise'), 
        width: 120,
        type: 'number'
      },
      { 
        field: 'stock_status', 
        headerName: t('inventory.status', 'Status'), 
        width: 100,
        renderCell: (params) => {
          const status = params.value as string;
          let textColor = status === 'IN_STOCK' ? '#00a854' : '#f44336';
          
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
        field: 'formattedLastUpdated', 
        headerName: t('common.updatedAt', 'Updated At'), 
        width: 150,
        renderCell: (params: GridRenderCellParams<ProcessedInventoryItem>) => {
          if (!params.row) return <Typography variant="body2">-</Typography>;
          return <Typography variant="body2">{formatDateTime(params.row.updated_at || '')}</Typography>;
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
        field: 'updatedByUsername', 
        headerName: t('updatedBy'), 
        width: 120
      }
    ];
  }, [t]);

  // Handle pagination change
  const handlePaginationChange = (model: GridPaginationModel) => {
    setGridState(prev => ({
      ...prev,
      page: model.page,
      pageSize: model.pageSize,
    }));
  };

  // Reset pagination when filters change
  useEffect(() => {
    setGridState(prev => ({ ...prev, page: 0 }));
  }, [debouncedFilters, activeTab]);

  const selectedItem = useMemo(() => {
    if (!selectedInventoryId) return null;
    return processedData.find(item => item.id === selectedInventoryId);
  }, [selectedInventoryId, processedData]);

  if (isLoading) return <Loader />;

  if (error) {
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
          {t('inventory.title', 'Inventory')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => {
            router.push(`/${tenantSlug}/Crm/Masters/inventory/adjustment`);
          }}
        >
          {t('inventory.add', 'Add Inventory')}
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
        {view === 'list' ? (
          <CustomDataGrid
            rows={processedData}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            paginationModel={gridState}
            onPaginationModelChange={handlePaginationChange}
            pageSizeOptions={[5, 10, 25]}
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row) => row.id}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={handleRowClick}
            rowCount={totalCount}
            paginationMode="server"
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

      {/* AnimatedDrawer for viewing inventory */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={t('inventory.view', 'View Inventory')}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
      >
        <Box>
          {selectedInventoryId && (
            <>
              <Typography variant="h6" gutterBottom>
                {t('inventory.details', 'Inventory Details')}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                {/* Product Information */}
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('inventory.productInfo', 'Product Information')}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.productName', 'Product Name')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.product?.name || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.productCode', 'Product Code')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.product?.sku || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.productStatus', 'Product Status')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.product?.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                  </Typography>
                </Box>

                {/* Location Information */}
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('inventory.locationInfo', 'Location Information')}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.locationName', 'Location Name')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.location?.name || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.locationType', 'Location Type')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.location?.location_type || '-'}
                  </Typography>
                </Box>

                {/* Stock Information */}
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('inventory.stockInfo', 'Stock Information')}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.stockQuantity', 'Stock Quantity')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.stock_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.reservedQuantity', 'Reserved Quantity')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.reserved_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.nonSaleable', 'Non-Saleable')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.non_saleable_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.onOrder', 'On Order')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.on_order_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.inTransit', 'In Transit')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.in_transit_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.returned', 'Returned')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.returned_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.hold', 'Hold')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.hold_quantity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.backorder', 'Backorder')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.backorder_quantity || 0}
                  </Typography>
                </Box>

                {/* Threshold and Status */}
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('inventory.thresholdStatus', 'Threshold & Status')}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.lowStockThreshold', 'Low Stock Threshold')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.low_stock_threshold || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.stockStatus', 'Stock Status')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.stock_status || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.availableToPromise', 'Available to Promise')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.available_to_promise || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.totalAvailable', 'Total Available')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.total_available || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('inventory.totalUnavailable', 'Total Unavailable')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem?.total_unavailable || 0}
                  </Typography>
                </Box>

                {/* Audit Trail */}
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('common.auditTrail', 'Audit Trail')}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('common.createdAt', 'Created At')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(selectedItem?.created_at || '')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('common.updatedAt', 'Updated At')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(selectedItem?.updated_at || '')}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </AnimatedDrawer>
    </Box>
  );
}
