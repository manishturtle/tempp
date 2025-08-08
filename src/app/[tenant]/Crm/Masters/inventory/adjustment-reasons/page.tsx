'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  GridColDef, 
  GridPaginationModel, 
  GridRenderCellParams, 
  GridRowSelectionModel,
  GridRowParams
} from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import Loader from '@/app/components/common/Loader';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import AdjustmentReasonForm from '@/app/components/admin/inventory/AdjustmentReasonForm';
import useDebounce from '@/app/hooks/useDebounce';
import { formatDateTime } from '@/app/utils/dateUtils';
import { useAdjustmentReasons, useDeleteAdjustmentReason } from '@/app/hooks/api/inventory';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { format } from 'date-fns';

// Interface for filter state
interface AdjustmentReasonFilterState {
  search: string;
  is_active?: boolean;
  adjustment_type?: string;
}

interface AdjustmentReason {
  id: number;
  name: string;
  code: string;
  adjustment_type: 'INCREASE' | 'DECREASE';
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdjustmentReasonsPageWrapper() {
  return (
    <DrawerProvider>
      <AdjustmentReasonsPage />
    </DrawerProvider>
  );
}

function AdjustmentReasonsPage() {
  const { t } = useTranslation();
  const drawerContext = useDrawer();
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'add' | 'view' | 'edit'>('view');
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<number | null>(null);
  
  // State variables
  const [filters, setFilters] = useState<AdjustmentReasonFilterState>({
    search: '',
    is_active: undefined,
    adjustment_type: undefined,
  });
  
  const [gridState, setGridState] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'description',
    'is_active',
    'created_at',
    'updated_at',
  ]);
  
  // View state
  const [view, setView] = useState<'list' | 'grid'>('list');
  
  // Row selection state
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Debounce filter changes
  const debouncedFilters = useDebounce(filters, 500);
  
  // Delete mutation
  const deleteReason = useDeleteAdjustmentReason();
  
  // Fetch adjustment reasons data
  const { 
    reasons, 
    isLoading, 
    isError,
    refetch 
  } = useAdjustmentReasons({
    page: gridState.page + 1,
    page_size: gridState.pageSize,
    search: debouncedFilters.search || undefined,
    is_active: debouncedFilters.is_active,
    adjustment_type: debouncedFilters.adjustment_type,
  });
  
  // Process adjustment reasons data for display
  const processedData = useMemo(() => {
    if (!reasons) return [];
    
    return reasons.map((item) => ({
      ...item,
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at),
    }));
  }, [reasons]);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    { field: 'search', label: t('common.search', 'Search'), type: 'text' },
    { field: 'is_active', label: t('common.status', 'Status'), type: 'select', options: [
      { value: 'true', label: t('common.status.active', 'Active') },
      { value: 'false', label: t('common.status.inactive', 'Inactive') },
    ]}
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'name', headerName: t('adjustmentReasons.columns.name', 'Name') },
    { field: 'description', headerName: t('adjustmentReasons.columns.description', 'Description') },
    { field: 'is_active', headerName: t('adjustmentReasons.columns.status', 'Status') },
    { field: 'created_at', headerName: t('adjustmentReasons.columns.created', 'Created') },
    { field: 'updated_at', headerName: t('adjustmentReasons.columns.updated', 'Updated') },
  ];
  
  // Tab options for ContentCard
  const tabOptions = [
    { value: 'all', label: t('common.tabs.all', 'All'), count: 0 },
    { value: 'active', label: t('common.tabs.active', 'Active'), count: 0 },
    { value: 'inactive', label: t('common.tabs.inactive', 'Inactive'), count: 0 },
  ];
  
  // Column definitions for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('adjustmentReasons.columns.name', 'Name'),
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'description',
      headerName: t('adjustmentReasons.columns.description', 'Description'),
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'is_active',
      headerName: t('adjustmentReasons.columns.status', 'Status'),
      flex: 0.5,
      minWidth: 100,
      renderCell: (params: GridRenderCellParams<AdjustmentReason>) => {
        return (
          <Chip 
            label={params.value ? t('common.active', 'Active') : t('common.inactive', 'Inactive')} 
            color={params.value ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'created_at',
      headerName: t('adjustmentReasons.columns.created', 'Created'),
      flex: 0.5,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<AdjustmentReason>) => 
        params.row.created_at ? format(new Date(params.row.created_at), 'MMM d, yyyy HH:mm') : '',
    },
    {
      field: 'updated_at',
      headerName: t('adjustmentReasons.columns.updated', 'Updated'),
      flex: 0.5,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<AdjustmentReason>) => 
        params.row.updated_at ? format(new Date(params.row.updated_at), 'MMM d, yyyy HH:mm') : '',
    },
    {
      field: 'actions',
      headerName: t('common.actions', 'Actions'),
      flex: 0.5,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<AdjustmentReason>) => {
        return (
          <Box>
            <Tooltip title={t('common.delete', 'Delete')}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(params.row.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];
  
  // Handle pagination model change
  const handlePaginationModelChange = useCallback((newModel: GridPaginationModel) => {
    setGridState(newModel);
  }, []);
  
  // Handle row click
  const handleRowClick = useCallback((params: GridRowParams) => {
    handleViewReason(params.id as number);
  }, []);
  
  // Handle filter change
  const handleFilterChange = useCallback((newFilters: FilterState[]) => {
    const filtersObj: AdjustmentReasonFilterState = {
      search: '',
      is_active: undefined,
      adjustment_type: undefined,
    };
    
    newFilters.forEach(filter => {
      if (filter.field === 'search') {
        filtersObj.search = filter.value as string;
      } else if (filter.field === 'is_active') {
        filtersObj.is_active = filter.value === 'true';
      } else if (filter.field === 'adjustment_type') {
        filtersObj.adjustment_type = filter.value as string;
      }
    });
    
    setFilters(filtersObj);
    setActiveFilters(newFilters);
  }, []);
  
  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
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
    setActiveTab(tab as 'all' | 'active' | 'inactive');
    
    const newFilters: AdjustmentReasonFilterState = {
      ...filters,
    };
    
    if (tab === 'active') {
      newFilters.is_active = true;
    } else if (tab === 'inactive') {
      newFilters.is_active = false;
    } else {
      newFilters.is_active = undefined;
    }
    
    setFilters(newFilters);
  }, [filters]);
  
  // Handle view reason
  const handleViewReason = useCallback((id: number) => {
    setSelectedReasonId(id);
    setDrawerMode('view');
    drawerContext.openDrawer('view');
  }, [drawerContext]);

  // Handle add new reason
  const handleAddReason = useCallback(() => {
    setSelectedReasonId(null);
    setDrawerMode('add');
    drawerContext.openDrawer('add');
  }, [drawerContext]);

  // Handle edit reason
  const handleEditReason = useCallback((id: number) => {
    setSelectedReasonId(id);
    setDrawerMode('edit');
    drawerContext.openDrawer('edit');
  }, [drawerContext]);
  
  // Handle delete click
  const handleDeleteClick = useCallback((id: number) => {
    setReasonToDelete(id);
    setConfirmDialogOpen(true);
  }, []);
  
  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (reasonToDelete) {
      try {
        await deleteReason.mutateAsync(reasonToDelete);
        setConfirmDialogOpen(false);
        setReasonToDelete(null);
        refetch();
      } catch (error) {
        console.error('Error deleting reason:', error);
      }
    }
  }, [reasonToDelete, deleteReason, refetch]);

  // Drawer sidebar icons
  const drawerSidebarIcons = useMemo(() => [
    { 
      id: 'view', 
      icon: <VisibilityIcon />, 
      tooltip: t('common.view', 'View'),
      onClick: () => {
        setDrawerMode('view');
        setActiveSidebarItem('view');
      }
    },
    { 
      id: 'edit', 
      icon: <EditIcon />, 
      tooltip: t('common.edit', 'Edit'),
      onClick: () => {
        setDrawerMode('edit');
        setActiveSidebarItem('edit');
      }
    }
  ], [t]);

  const isViewMode = drawerMode === 'view';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('adjustmentReasons.title', 'Adjustment Reasons')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => handleAddReason()}
        >
          {t('adjustmentReasons.actions.add', 'Add Reason')}
        </Button>
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
            {t('common.errorLoading', 'Error loading data')}
          </Typography>
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
            rowCount={reasons?.length || 0}
          />
        )}
      </ContentCard>

      <AnimatedDrawer
        open={drawerContext.isOpen}
        onClose={() => {
          drawerContext.closeDrawer();
          setSelectedReasonId(null);
          setDrawerMode('view');
          setActiveSidebarItem('view');
        }}
        title={t(`adjustmentReasons.${drawerMode}`, drawerMode === 'add' ? 'Add Reason' : drawerMode === 'edit' ? 'Edit Reason' : 'View Reason')}
        expandedWidth={550}
        sidebarIcons={drawerMode === 'view' ? drawerSidebarIcons : []}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          !isViewMode && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                form="adjustment-reason-form"
              >
                {drawerMode === 'add' 
                  ? t('common.add', 'Add')
                  : t('common.save', 'Save')
                }
              </Button>
            </Box>
          )
        }
      >
        <AdjustmentReasonForm
          mode={drawerMode}
          reasonId={selectedReasonId}
          onSuccess={() => {
            drawerContext.closeDrawer();
            setSelectedReasonId(null);
            setDrawerMode('view');
            setActiveSidebarItem('view');
            refetch();
          }}
        />
      </AnimatedDrawer>
      
      <ConfirmDialog
        open={confirmDialogOpen}
        title={t('adjustmentReasons.delete.title', 'Delete Adjustment Reason')}
        content={t('adjustmentReasons.delete.message', 'Are you sure you want to delete this adjustment reason? This action cannot be undone.')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmDialogOpen(false);
          setReasonToDelete(null);
        }}
        isLoading={deleteReason.isPending}
      />
    </Box>
  );
}
