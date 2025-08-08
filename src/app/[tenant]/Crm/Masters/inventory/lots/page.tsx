'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Typography, 
  Chip, 
  IconButton, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { 
  GridColDef, 
  GridRenderCellParams,
  GridPaginationModel
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import Loader from '@/app/components/common/Loader';
import useDebounce from '@/app/hooks/useDebounce';
import { formatDateTime } from '@/app/utils/dateUtils';

import { 
  useFetchLots, 
  useUpdateLot
} from '@/app/hooks/api/inventory';
import { 
  LotItem, 
  LotListParams,
  UpdateLotPayload,
  Product,
  Location
} from '@/app/types/inventory';



// Interface for processed lot inventory item with formatted dates
interface ProcessedLotItem extends LotItem {
  formattedExpiryDate: string;
  formattedReceivedDate: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  isExpired: boolean;
}

// Interface for lot filter state
interface LotFilterState {
  search: string;
  product_id?: number;
  location_id?: number;
  expiry_date_from?: string;
  expiry_date_to?: string;
  is_expired?: boolean;
}

const LotInventoryPage = () => {
  const { t } = useTranslation();
  
  // State for view
  const [view, setView] = useState<'list' | 'grid'>('list');
  
  // State for filters
  const [filters, setFilters] = useState<LotFilterState>({
    search: '',
  });
  
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // State for pagination
  const [gridState, setGridState] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState([
    'lot_number',
    'product',
    'location',
    'quantity',
    'expiry_date',
    'created_at',
    'updated_at'
  ]);
  
  // State for edit modal
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<LotItem | null>(null);
  const [editQuantity, setEditQuantity] = useState<number | ''>('');
  const [editExpiryDate, setEditExpiryDate] = useState<Date | null>(null);
  const [editErrors, setEditErrors] = useState<{
    quantity?: string;
    expiry_date?: string;
  }>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // Build filter params for API
  const filterParams = useMemo<LotListParams>(() => {
    const params: LotListParams = {
      page: gridState.page + 1,
      page_size: gridState.pageSize,
    };
    
    if (filters.search) {
      params.lot_number__icontains = filters.search;
    }
    
    if (filters.product_id) {
      params.product_id = filters.product_id;
    }
    
    if (filters.location_id) {
      params.location_id = filters.location_id;
    }
    
    if (filters.expiry_date_from) {
      params.expiry_date__gte = filters.expiry_date_from;
    }
    
    if (filters.expiry_date_to) {
      params.expiry_date__lte = filters.expiry_date_to;
    }
    
    if (filters.is_expired !== undefined) {
      params.is_expired = filters.is_expired;
    }
    
    return params;
  }, [gridState, filters]);
  
  // Fetch data
  const { 
    data: lotData, 
    isLoading, 
    isError, 
    refetch 
  } = useFetchLots(filterParams);
  
  // Update mutation
  const { mutateAsync: updateLot, isPending: isUpdating } = useUpdateLot();
  
  // Process data for display
  const processedData = useMemo(() => {
    if (!lotData?.results) return [];
    
    return lotData.results.map((item: LotItem) => {
      const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
      const isExpired = expiryDate ? expiryDate < new Date() : false;
      
      return {
        ...item,
        formattedExpiryDate: item.expiry_date ? formatDateTime(new Date(item.expiry_date).toISOString()) : '-',
        formattedReceivedDate: formatDateTime(item.received_date),
        formattedCreatedAt: formatDateTime(item.created_at),
        formattedUpdatedAt: formatDateTime(item.updated_at),
        isExpired
      };
    }) as ProcessedLotItem[];
  }, [lotData]);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: 'lot_number',
      label: t('inventory.lots.searchByLotNumber'),
      type: 'text' as const,
    },
    {
      field: 'product_id',
      label: t('inventory.columns.productName'),
      type: 'select' as const,
      options: [],
    },
    {
      field: 'location_id',
      label: t('inventory.columns.location'),
      type: 'select' as const,
      options: [],
    },
    {
      field: 'is_expired',
      label: t('inventory.lots.isExpired'),
      type: 'boolean' as const,
    },
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'lot_number', headerName: t('inventory.lots.lotNumber') },
    { field: 'product', headerName: t('inventory.columns.productName') },
    { field: 'location', headerName: t('inventory.columns.location') },
    { field: 'quantity', headerName: t('inventory.columns.quantity') },
    { field: 'expiry_date', headerName: t('inventory.lots.expiryDate') },
    { field: 'created_at', headerName: t('common.createdAt') },
    { field: 'updated_at', headerName: t('common.updatedAt') },
    // { field: 'actions', headerName: t('common.actions') }
  ];
  
  // Tab options
  const tabOptions = [
    { 
      value: 'all', 
      label: t('common.all'), 
      count: lotData?.count || 0 
    },
    { 
      value: 'active', 
      label: t('inventory.lots.active'), 
      count: 0 
    },
    { 
      value: 'expired', 
      label: t('inventory.lots.expired'), 
      count: 0 
    }
  ];
  
  // Column definitions for the data grid
  const columns: GridColDef[] = [
    {
      field: 'lot_number',
      headerName: t('inventory.lots.lotNumber'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
        <Typography variant="body2">
          {params.row.lot_number}
        </Typography>
      )
    },
    {
      field: 'product',
      headerName: t('inventory.columns.productName'),
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
        <Box>
          <Typography variant="body2">{params.row.product?.name}</Typography>
        </Box>
      )
    },
    {
      field: 'location',
      headerName: t('inventory.columns.location'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
        <Typography variant="body2">
          {params.row.location?.name || ''}
        </Typography>
      )
    },
    {
      field: 'quantity',
      headerName: t('inventory.columns.quantity'),
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
        <Typography variant="body2">
          {params.row.quantity}
        </Typography>
      )
    },
    {
      field: 'expiry_date',
      headerName: t('inventory.lots.expiryDate'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => {
        const isExpired = params.row.isExpired;
        
        return (
          <Box>
            <Typography variant="body2" color={isExpired ? 'error' : 'textPrimary'}>
              {params.row.formattedExpiryDate}
            </Typography>
            {isExpired && (
              <Chip 
                label={t('inventory.lots.expired')} 
                size="small" 
                color="error" 
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        );
      }
    },
    {
      field: 'created_at',
      headerName: t('common.createdAt'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
        <Typography variant="body2">
          {params.row.formattedCreatedAt || ''}
        </Typography>
      )
    },
    {
      field: 'updated_at',
      headerName: t('common.updatedAt'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
        <Typography variant="body2">
          {params.row.formattedUpdatedAt || ''}
        </Typography>
      )
    },
    // {
    //   field: 'actions',
    //   headerName: t('common.actions'),
    //   width: 100,
    //   sortable: false,
    //   renderCell: (params: GridRenderCellParams<ProcessedLotItem>) => (
    //     <Button
    //       variant="text"
    //       size="small"
    //       startIcon={<EditIcon fontSize="small" />}
    //       onClick={(e) => {
    //         e.stopPropagation();
    //         handleOpenEditDialog(params.row);
    //       }}
    //     >
    //       {t('common.edit')}
    //     </Button>
    //   )
    // }
  ];
  
  // Handle pagination changes
  const handlePaginationModelChange = useCallback((newModel: GridPaginationModel) => {
    setGridState(newModel);
  }, []);
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState[]) => {
    setActiveFilters(newFilters);
    
    const newFiltersObj: LotFilterState = {
      search: '',
    };
    
    newFilters.forEach(filter => {
      if (filter.field === 'search') {
        newFiltersObj.search = filter.value;
      } else if (filter.field === 'product') {
        newFiltersObj.product_id = Number(filter.value);
      } else if (filter.field === 'location') {
        newFiltersObj.location_id = Number(filter.value);
      } else if (filter.field === 'is_expired') {
        newFiltersObj.is_expired = filter.value === 'true';
      }
    });
    
    setFilters(newFiltersObj);
  }, []);
  
  // Handle view changes
  const handleViewChange = useCallback((newView: 'list' | 'grid') => {
    setView(newView);
  }, []);
  
  // Handle column visibility changes
  const handleColumnVisibilityChange = useCallback((newVisibleColumns: string[]) => {
    setVisibleColumns(newVisibleColumns);
  }, []);
  
  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as any);
    
    const newFilters: LotFilterState = {
      ...filters,
    };
    
    if (tab === 'all') {
      newFilters.is_expired = undefined;
    } else if (tab === 'active') {
      newFilters.is_expired = false;
    } else if (tab === 'expired') {
      newFilters.is_expired = true;
    }
    
    setFilters(newFilters);
  }, [filters]);
  
  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
  }, []);
  
  // Open edit dialog
  const handleOpenEditDialog = useCallback((lot: LotItem) => {
    setSelectedLot(lot);
    setEditQuantity(lot.quantity);
    setEditExpiryDate(lot.expiry_date ? new Date(lot.expiry_date) : null);
    setEditErrors({});
    setUpdateSuccess(false);
    setEditDialogOpen(true);
  }, []);
  
  // Close edit dialog
  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedLot(null);
    setEditQuantity('');
    setEditExpiryDate(null);
    setEditErrors({});
  }, []);
  
  // Validate edit form
  const validateEditForm = useCallback(() => {
    const errors: {
      quantity?: string;
      expiry_date?: string;
    } = {};
    
    if (editQuantity === '') {
      errors.quantity = t('inventory.adjustment.errors.quantityRequired');
    } else if (typeof editQuantity === 'number' && editQuantity < 0) {
      errors.quantity = t('inventory.adjustment.errors.invalidQuantity');
    }
    
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editQuantity, t]);
  
  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (!selectedLot || !validateEditForm()) return;
    
    const payload: UpdateLotPayload = {};
    
    if (typeof editQuantity === 'number') {
      payload.quantity = editQuantity;
    }
    
    if (editExpiryDate !== null) {
      payload.expiry_date = formatDateTime(editExpiryDate.toISOString());
    } else {
      payload.expiry_date = null;
    }
    
    try {
      await updateLot({
        id: selectedLot.id,
        payload
      });
      
      setUpdateSuccess(true);
      refetch();
      setTimeout(() => {
        handleCloseEditDialog();
      }, 1500);
    } catch (error) {
      console.error('Error updating lot:', error);
    }
  }, [selectedLot, validateEditForm, editQuantity, editExpiryDate, updateLot, handleCloseEditDialog, refetch]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('inventory.lots.title')}
        </Typography>
      </Box>
      
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
        ) : isError ? (
          <Typography color="error">
            {t('common.errorLoading', { resource: t('inventory.lots.title').toLowerCase() })}
          </Typography>
        ) : (
          <CustomDataGrid
            rows={processedData || []}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            paginationModel={gridState}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[10, 25, 50, 100]}
            checkboxSelection={false}
            disableRowSelectionOnClick={true}
            autoHeight
            getRowId={(row) => row?.id || 0}
            rowCount={lotData?.count || 0}
            paginationMode="server"
            loading={isLoading}
          />
        )}
      </ContentCard>
      
      {/* Edit Dialog */}
    
      {/* {updateSuccess ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('common.updateSuccess', { resource: t('inventory.lots.lotNumber') })}
        </Alert>
      ) : (
        selectedLot && (
          <Dialog
            open={editDialogOpen}
            onClose={handleCloseEditDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {t('inventory.lots.editLot')}
              <IconButton
                aria-label={t('common.close')}
                onClick={handleCloseEditDialog}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('inventory.lots.editWarning')}
              </Alert>
              
              <Typography variant="subtitle1" gutterBottom>
                {t('inventory.lots.lotNumber')}: {selectedLot?.lot_number}
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                {t('inventory.columns.productName')}: {selectedLot?.product.name} ({selectedLot?.product.sku})
              </Typography>
              
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                {t('inventory.columns.location')}: {selectedLot?.location.name}
              </Typography>
              
              <TextField
                label={t('inventory.columns.quantity')}
                type="number"
                fullWidth
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                error={!!editErrors.quantity}
                helperText={editErrors.quantity}
                margin="normal"
                InputProps={{ inputProps: { min: 0 } }}
              />
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label={t('inventory.lots.expiryDate')}
                  value={editExpiryDate}
                  onChange={setEditExpiryDate}
                  sx={{ mt: 2, width: '100%' }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!editErrors.expiry_date,
                      helperText: editErrors.expiry_date
                    }
                  }}
                />
              </LocalizationProvider>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseEditDialog}>
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                variant="contained" 
                color="primary"
                disabled={isUpdating}
              >
                {isUpdating ? t('common.saving') : t('common.save')}
              </Button>
            </DialogActions>
          </Dialog>
        )
      )} */}
    </Box>
  );
};

export default LotInventoryPage;
