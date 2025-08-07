'use client';

/**
 * Serialized Inventory List Page
 * 
 * This page displays a list of serialized inventory items with filtering, sorting, and pagination.
 * It also allows updating the status of serialized items via a modal.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Typography, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { 
  GridColDef, 
  GridRenderCellParams,
  GridPaginationModel,
  GridRowParams
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import Loader from '@/app/components/common/Loader';
import useDebounce from '@/app/hooks/useDebounce';
import { formatDateTime } from '@/app/utils/dateUtils';

import { 
  SerializedInventoryItem, 
  SerialNumberStatus, 
  SerializedListParams,
  UpdateSerializedStatusPayload
} from '@/app/types/inventory';
import { 
  useFetchSerializedInventory, 
  useUpdateSerializedStatus,
  fetchProducts,
  fetchLocations
} from '@/app/hooks/api/inventory';

// Interface for filter state
interface SerializedFilterState {
  search: string;
  product_id?: number;
  location_id?: number;
  status?: SerialNumberStatus;
}

// Interface for processed serialized inventory item with formatted dates
interface ProcessedSerializedItem extends SerializedInventoryItem {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
}

const SerializedInventoryPage = () => {
  const { t } = useTranslation();
  
  // State for filters
  const [filters, setFilters] = useState<SerializedFilterState>({
    search: '',
    status: undefined,
  });
  
  // Grid state for pagination
  const [gridState, setGridState] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  // State for active filters
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'serial_number',
    'product',
    'location',
    'status',
    'created_at',
    'updated_at'
  ]);
  
  // View state
  const [view, setView] = useState<'list' | 'grid'>('list');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'non_saleable' | 'on_hold' | 'reserved'>('all');
  
  // Status update dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SerializedInventoryItem | null>(null);
  const [newStatus, setNewStatus] = useState<SerialNumberStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  
  // Debounce filter changes
  const debouncedFilters = useDebounce(filters, 500);
  
  // Create API params from filters and grid state
  const apiParams = useMemo((): SerializedListParams => {
    return {
      page: gridState.page + 1,
      page_size: gridState.pageSize,
      serial_number__icontains: debouncedFilters.search || undefined,
      product_id: debouncedFilters.product_id,
      location_id: debouncedFilters.location_id,
      status: debouncedFilters.status,
      ordering: '-last_updated'
    };
  }, [debouncedFilters, gridState]);
  
  // Fetch serialized inventory data
  const { 
    data: serializedData, 
    isLoading, 
    isError,
    refetch
  } = useFetchSerializedInventory(apiParams);
  
  // Status update mutation
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateSerializedStatus();
  
  // Process data for display
  const processedData = useMemo(() => {
    if (!serializedData?.results) return [];
    
    return serializedData.results.map((item: SerializedInventoryItem) => ({
      ...item,
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at)
    })) as ProcessedSerializedItem[];
  }, [serializedData]);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    { field: 'search', label: t('inventory.serialized.searchBySerial'), type: 'text' },
    { field: 'status', label: t('common.status'), type: 'select', options: Object.values(SerialNumberStatus).map(status => ({ 
      value: status, 
      label: t(`inventory.serialized.status.${status.toLowerCase()}`) 
    })) }
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'serial_number', headerName: t('inventory.adjustment.serialized.serialNumber') },
    { field: 'product', headerName: t('inventory.columns.productName') },
    { field: 'location', headerName: t('inventory.columns.location') },
    { field: 'status', headerName: t('common.status') },
    { field: 'created_at', headerName: t('common.createdAt') },
    { field: 'updated_at', headerName: t('common.updatedAt') },
    // { field: 'actions', headerName: t('common.actions') }
  ];
  
  // Tab options
  const tabOptions = [
    { 
      value: 'all', 
      label: t('common.all'), 
      count: serializedData?.count || 0 
    },
    { 
      value: 'available', 
      label: t('inventory.adjustment.serialized.status.available'), 
      count: 0 
    },
    { 
      value: 'non_saleable', 
      label: t('inventory.adjustment.serialized.status.non_saleable'), 
      count: 0 
    },
    { 
      value: 'on_hold', 
      label: t('inventory.adjustment.serialized.status.on_hold'), 
      count: 0 
    },
    { 
      value: 'reserved', 
      label: t('inventory.adjustment.serialized.status.reserved'), 
      count: 0 
    }
  ];
  
  // Column definitions for the data grid
  const columns: GridColDef[] = [
    {
      field: 'serial_number',
      headerName: t('inventory.adjustment.serialized.serialNumber'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => (
        <Typography variant="body2">
          {params.row.serial_number}
        </Typography>
      )
    },
    {
      field: 'product',
      headerName: t('inventory.columns.productName'),
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => (
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
      renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => (
        <Typography variant="body2">
          {params.row.location?.name || ''}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: t('common.status'),
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => {
        const status = params.value as SerialNumberStatus;
        let color = 'default';
        
        switch (status) {
          case SerialNumberStatus.AVAILABLE:
            color = 'success';
            break;
          case SerialNumberStatus.RESERVED:
            color = 'warning';
            break;
          case SerialNumberStatus.SOLD:
            color = 'primary';
            break;
          case SerialNumberStatus.NON_SALEABLE:
            color = 'error';
            break;
          case SerialNumberStatus.ON_HOLD:
            color = 'secondary';
            break;
          case SerialNumberStatus.DAMAGED:
            color = 'error';
            break;
          default:
            color = 'default';
        }
        
        return (
          <Chip 
            label={t(`inventory.adjustment.serialized.status.${status.toLowerCase()}`)} 
            size="small" 
            color={color as any}
          />
        );
      }
    },
    {
      field: 'created_at',
      headerName: t('common.createdAt'),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => (
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
      renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => (
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
    //   renderCell: (params: GridRenderCellParams<ProcessedSerializedItem>) => (
    //     <Button
    //       variant="text"
    //       size="small"
    //       startIcon={<EditIcon fontSize="small" />}
    //       onClick={(e) => {
    //         e.stopPropagation();
    //         handleOpenStatusDialog(params.row);
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
    
    const newFiltersObj: SerializedFilterState = {
      search: '',
    };
    
    newFilters.forEach(filter => {
      if (filter.field === 'search') {
        newFiltersObj.search = filter.value;
      } else if (filter.field === 'status') {
        newFiltersObj.status = filter.value as SerialNumberStatus;
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
    
    const newFilters: SerializedFilterState = {
      ...filters,
    };
    
    if (tab === 'all') {
      newFilters.status = undefined;
    } else if (tab === 'available') {
      newFilters.status = SerialNumberStatus.AVAILABLE;
    } else if (tab === 'non_saleable') {
      newFilters.status = SerialNumberStatus.NON_SALEABLE;
    } else if (tab === 'on_hold') {
      newFilters.status = SerialNumberStatus.ON_HOLD;
    } else if (tab === 'reserved') {
      newFilters.status = SerialNumberStatus.RESERVED;
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
  
  // Open status update dialog
  const handleOpenStatusDialog = useCallback((item: SerializedInventoryItem) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setStatusNotes('');
    setStatusUpdateSuccess(false);
    setStatusDialogOpen(true);
  }, []);
  
  // Close status update dialog
  const handleCloseStatusDialog = useCallback(() => {
    setStatusDialogOpen(false);
    setSelectedItem(null);
    setNewStatus('');
    setStatusNotes('');
  }, []);
  
  // Handle status update
  const handleStatusUpdate = useCallback(() => {
    if (!selectedItem || !newStatus) return;
    
    const payload: UpdateSerializedStatusPayload = {
      status: newStatus,
      notes: statusNotes.trim() || undefined
    };
    
    updateStatus(
      { id: selectedItem.id, payload },
      {
        onSuccess: () => {
          setStatusUpdateSuccess(true);
          refetch();
          setTimeout(() => {
            handleCloseStatusDialog();
          }, 1500);
        }
      }
    );
  }, [selectedItem, newStatus, statusNotes, updateStatus, refetch, handleCloseStatusDialog]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('inventory.adjustment.serialized.title')}
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
            {t('common.errorLoading', { resource: t('inventory.serialized.title').toLowerCase() })}
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
            rowCount={serializedData?.count || 0}
            paginationMode="server"
            loading={isLoading}
          />
        )}
      </ContentCard>
      
      {/* Status Update Dialog */}

      {/* {statusUpdateSuccess ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('common.updateSuccess', { resource: t('inventory.serialized.serialNumber') })}
        </Alert>
      ) : (
        selectedItem && (
          <Dialog
            open={statusDialogOpen}
            onClose={handleCloseStatusDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {t('inventory.serialized.updateStatus')}
              <IconButton
                aria-label={t('common.close')}
                onClick={handleCloseStatusDialog}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>
                {t('inventory.serialized.serialNumber')}: {selectedItem?.serial_number}
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                {t('inventory.product')}: {selectedItem?.product.name} ({selectedItem?.product.sku})
              </Typography>
              
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                {t('inventory.location')}: {selectedItem?.location.name}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="status-select-label">
                  {t('common.status')}
                </InputLabel>
                <Select
                  labelId="status-select-label"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SerialNumberStatus)}
                  label={t('common.status')}
                  disabled={isUpdating}
                >
                  {Object.values(SerialNumberStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {t(`inventory.serialized.status.${status.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label={t('common.notes')}
                multiline
                rows={3}
                fullWidth
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                disabled={isUpdating}
              />
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseStatusDialog} disabled={isUpdating}>
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleStatusUpdate} 
                variant="contained" 
                color="primary"
                disabled={!newStatus || isUpdating}
              >
                {isUpdating ? t('common.updating') : t('common.save')}
              </Button>
            </DialogActions>
          </Dialog>
        )
      )} */}
    </Box>
  );
};

export default SerializedInventoryPage;
