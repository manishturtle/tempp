'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  GridColDef, 
  GridPaginationModel, 
  GridRenderCellParams, 
  GridRowSelectionModel, 
  GridRowParams
} from '@mui/x-data-grid';

import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import Loader from '@/app/components/common/Loader';
import useDebounce from '@/app/hooks/useDebounce';
import { formatDateTime } from '@/app/utils/dateUtils';
import { useFetchAdjustmentHistory } from '@/app/hooks/api/inventory';
import { AdjustmentListParams } from '@/app/types/inventory';
import { useRouter } from 'next/navigation';

// Interface for filter state
interface AdjustmentFilterState {
  search: string;
  product_id?: number;
  location_id?: number;
  adjustment_type?: string;
  timestamp__gte?: string;
  timestamp__lte?: string;
}

export default function AdjustmentHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // State variables
  const [filters, setFilters] = useState<AdjustmentFilterState>({
    search: '',
    product_id: undefined,
    location_id: undefined,
    adjustment_type: undefined,
    timestamp__gte: undefined,
    timestamp__lte: undefined,
  });
  
  const [gridState, setGridState] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'timestamp',
    'product_name',
    'location_name',
    'adjustment_type',
    'quantity_change',
    'new_stock_quantity',
    'user.username',
    'reason.name',
    'notes'
  ]);
  
  // View state
  const [view, setView] = useState<'list' | 'grid'>('list');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'low_stock'>('all');
  
  // Tab options
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

  // Row selection state
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  // Debounce filter changes
  const debouncedFilters = useDebounce(filters, 500);
  
  // Fetch adjustment history data
  const { 
    data: adjustmentData, 
    isLoading, 
    isError 
  } = useFetchAdjustmentHistory({
    page: gridState.page + 1,
    page_size: gridState.pageSize,
    search: debouncedFilters.search || undefined,
    product_id: debouncedFilters.product_id,
    location_id: debouncedFilters.location_id,
    adjustment_type: debouncedFilters.adjustment_type,
    timestamp__gte: debouncedFilters.timestamp__gte,
    timestamp__lte: debouncedFilters.timestamp__lte,
    ordering: '-timestamp', // Default to newest first
  });
  
  // Process adjustment data for display
  const processedData = useMemo(() => {
    if (!adjustmentData?.results) return [];
    
    return adjustmentData.results.map(item => ({
      ...item,
      formattedCreatedAt: formatDateTime(item.timestamp),
      adjustmentTypeDisplay: t(`inventory.adjustment.types.${item.adjustment_type.toLowerCase()}`, item.adjustment_type),
    }));
  }, [adjustmentData, t]);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    { field: 'search', label: t('common.search', 'Search'), type: 'text' },
    { field: 'product_id', label: t('inventory.filters.product', 'Product'), type: 'select' },
    { field: 'location_id', label: t('inventory.filters.location', 'Location'), type: 'select' },
    { field: 'adjustment_type', label: t('inventory.filters.adjustmentType', 'Adjustment Type'), type: 'select' },
    { field: 'timestamp__gte', label: t('common.fromDate', 'From Date'), type: 'date' },
    { field: 'timestamp__lte', label: t('common.toDate', 'To Date'), type: 'date' },
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'timestamp', headerName: t('common.date', 'Date') },
    { field: 'product_name', headerName: t('inventory.columns.productName', 'Product') },
    { field: 'location_name', headerName: t('inventory.columns.location', 'Location') },
    { field: 'adjustment_type', headerName: t('inventory.columns.adjustmentType', 'Type') },
    { field: 'quantity_change', headerName: t('inventory.columns.quantityChange', 'Qty Change') },
    { field: 'new_stock_quantity', headerName: t('inventory.columns.newQuantity', 'New Qty') },
    { field: 'user.username', headerName: t('common.user', 'User') },
    { field: 'reason.name', headerName: t('inventory.columns.reason', 'Reason') },
    { field: 'notes', headerName: t('common.notes', 'Notes') },
  ];
  
  // Column definitions for the data grid
  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: t('common.date', 'Date'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.formattedCreatedAt;
      },
    },
    {
      field: 'product_name',
      headerName: t('inventory.columns.productName', 'Product'),
      width: 200,
    },
    {
      field: 'location_name',
      headerName: t('inventory.columns.location', 'Location'),
      width: 150,
    },
    {
      field: 'adjustment_type',
      headerName: t('inventory.columns.adjustmentType', 'Type'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const type = params.row.adjustment_type;
        const typeDisplay = t(`inventory.adjustment.types.${type.toLowerCase()}`, type) as string;
        let color = 'default';
        
        if (type === 'ADD' || type === 'INIT') color = 'success';
        else if (type === 'SUB') color = 'error';
        else if (type === 'RES' || type === 'REL_RES') color = 'warning';
        
        return (
          <Chip 
            label={typeDisplay as string} 
            size="small" 
            color={color as any}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'quantity_change',
      headerName: t('inventory.columns.quantityChange', 'Qty Change'),
      width: 120,
      type: 'number',
      headerAlign: 'left'
    },
    {
      field: 'new_stock_quantity',
      headerName: t('inventory.columns.newQuantity', 'New Qty'),
      width: 120,
      type: 'number',
      headerAlign: 'left'
    },
    {
      field: 'user',
      headerName: t('common.user', 'User'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.user?.username || '-';
      },
    },
    {
      field: 'reason',
      headerName: t('inventory.columns.reason', 'Reason'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.reason?.name || '-';
      },
    },
    {
      field: 'notes',
      headerName: t('common.notes', 'Notes'),
      width: 200,
      flex: 1,
    },
  ];
  
  // Handle search from ContentCard
  const handleSearch = useCallback((term: string) => {
    setFilters(prev => ({
      ...prev,
      search: term,
    }));
  }, []);
  
  // Handle filter change from ContentCard
  const handleFilterChange = useCallback((contentFilters: FilterState[]) => {
    const newFilters: Partial<AdjustmentFilterState> = {};
    
    contentFilters.forEach(filter => {
      if (filter.field === 'search') {
        newFilters.search = filter.value;
      } else if (filter.field === 'product_id') {
        newFilters.product_id = filter.value;
      } else if (filter.field === 'location_id') {
        newFilters.location_id = filter.value;
      } else if (filter.field === 'adjustment_type') {
        newFilters.adjustment_type = filter.value;
      } else if (filter.field === 'timestamp__gte') {
        newFilters.timestamp__gte = filter.value;
      } else if (filter.field === 'timestamp__lte') {
        newFilters.timestamp__lte = filter.value;
      }
    });
    
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
    
    setActiveFilters(contentFilters);
  }, []);
  
  // Handle pagination change
  const handlePaginationModelChange = useCallback((newModel: GridPaginationModel) => {
    setGridState(newModel);
  }, []);
  
  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((newVisibleColumns: string[]) => {
    setVisibleColumns(newVisibleColumns);
  }, []);
  
  // Handle view change
  const handleViewChange = useCallback((newView: 'list' | 'grid') => {
    setView(newView);
  }, []);
  
  // Handle tab change
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab as 'all' | 'draft' | 'low_stock');
  }, []);
  
  // Handle row click
  const handleRowClick = useCallback((params: GridRowParams) => {
    if (params?.row?.id) {
      router.push(`/Masters/inventory/${params.row.id}`);
    }
  }, [router]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('inventory.adjustment.history.title', 'Inventory Adjustment History')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('inventory.adjustment.history.description', 'View and filter the history of all inventory adjustments.')}
      </Typography>
      
      <ContentCard
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onColumnsChange={handleColumnVisibilityChange}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={tabOptions}
        activeTab={activeTab}
      >
        {isLoading ? (
          <Loader />
        ) : (
          <CustomDataGrid
            rows={processedData || []}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            paginationModel={gridState}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[10, 25, 50, 100]}
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row) => row?.id || 0}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={handleRowClick}
            rowCount={adjustmentData?.count || 0}
            paginationMode="server"
          />
        )}
      </ContentCard>
    </Box>
  );
}
