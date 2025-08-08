'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography,
  Chip,
  Button
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

import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import Loader from '@/app/components/common/Loader';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import LocationForm from '@/app/components/admin/inventory/LocationForm';
import useDebounce from '@/app/hooks/useDebounce';
import { formatDateTime } from '@/app/utils/dateUtils';
import { useFetchLocations } from '@/app/hooks/api/inventory';
import { Location, PaginatedResponse } from '@/app/types/inventory';
import { useRouter } from 'next/navigation';

// Interface for filter state
interface LocationFilterState {
  search: string;
  is_active?: boolean;
}

export default function LocationsPageWrapper() {
  return (
    <DrawerProvider>
      <LocationsPage />
    </DrawerProvider>
  );
}

function LocationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const drawerContext = useDrawer();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<'add' | 'view' | 'edit'>('view');
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');
  
  // State variables
  const [filters, setFilters] = useState<LocationFilterState>({
    search: '',
    is_active: undefined,
  });
  
  const [gridState, setGridState] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'location_type',
    'address',
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
  
  // Fetch locations data
  const { 
    data: locationsData = { results: [], count: 0, next: null, previous: null } as PaginatedResponse<Location>, 
    isLoading, 
    isError 
  } = useFetchLocations({
    page: gridState.page + 1,
    page_size: gridState.pageSize,
    search: debouncedFilters.search || undefined,
    is_active: debouncedFilters.is_active,
  });
  
  // Process locations data for display
  const processedData = useMemo(() => {
    if (!locationsData?.results) return [];
    
    return locationsData.results.map((item: Location) => ({
      ...item,
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at),
      address: [
        item.address_line_1,
        item.city,
        item.state_province,
        item.postal_code,
        item.country_code
      ].filter(Boolean).join(', '),
    }));
  }, [locationsData]);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    { field: 'search', label: t('common.search', 'Search'), type: 'text' },
    { field: 'is_active', label: t('common.status', 'Status'), type: 'select' },
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'name', headerName: t('locations.columns.name', 'Name') },
    { field: 'location_type', headerName: t('locations.columns.type', 'Type') },
    { field: 'address', headerName: t('locations.columns.address', 'Address') },
    { field: 'is_active', headerName: t('common.status', 'Status') },
    { field: 'created_at', headerName: t('common.createdAt', 'Created') },
    { field: 'updated_at', headerName: t('common.lastUpdated', 'Last Updated') },
  ];
  
  // Tab options
  const tabOptions = [
    { 
      value: 'all', 
      label: t('common.tabs.all', 'All'), 
      count: locationsData?.count || 0 
    },
    { 
      value: 'active', 
      label: t('common.active', 'Active'), 
      count: 0 
    },
    { 
      value: 'inactive', 
      label: t('common.inactive', 'Inactive'), 
      count: 0 
    },
  ];
  
  // Column definitions for the data grid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('locations.columns.name', 'Name'),
      width: 200,
    },
    {
      field: 'location_type',
      headerName: t('locations.columns.type', 'Type'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const value = params.value as string;
        return t(`locations.types.${value.toLowerCase()}`, value);
      }
    },
    {
      field: 'address',
      headerName: t('locations.columns.address', 'Address'),
      width: 300,
    },
    {
      field: 'is_active',
      headerName: t('common.status', 'Status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
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
      headerName: t('common.createdAt', 'Created'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.formattedCreatedAt;
      },
    },
    {
      field: 'updated_at',
      headerName: t('common.lastUpdated', 'Last Updated'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.formattedUpdatedAt;
      },
    },
  ];
  
  // Handle pagination changes
  const handlePaginationModelChange = useCallback((newModel: GridPaginationModel) => {
    setGridState(newModel);
  }, []);
  
  // Handle row selection changes
  const handleRowSelectionModelChange = useCallback((newSelectionModel: GridRowSelectionModel) => {
    setRowSelectionModel(newSelectionModel);
  }, []);
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState[]) => {
    setActiveFilters(newFilters);
    
    const newFiltersObj: LocationFilterState = {
      search: '',
    };
    
    newFilters.forEach(filter => {
      if (filter.field === 'search') {
        newFiltersObj.search = filter.value;
      } else if (filter.field === 'is_active') {
        newFiltersObj.is_active = filter.value === 'true';
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
    setActiveTab(tab as 'all' | 'active' | 'inactive');
    
    const newFilters: LocationFilterState = {
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
  
  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
  }, []);
  
  // Handle row click
  const handleRowClick = useCallback((params: GridRowParams) => {
    setSelectedLocationId(params.id as number);
    setDrawerMode('view');
    drawerContext.openDrawer('view');
  }, [drawerContext]);

  // Handle add new location
  const handleAddLocation = useCallback(() => {
    setSelectedLocationId(null);
    setDrawerMode('add');
    drawerContext.openDrawer('add');
  }, [drawerContext]);

  // Handle edit location
  const handleEditLocation = useCallback((id: number) => {
    setSelectedLocationId(id);
    setDrawerMode('edit');
    drawerContext.openDrawer('edit');
  }, [drawerContext]);

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
          {t('locations.title', 'Fulfillment Locations')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => handleAddLocation()}
        >
          {t('locations.actions.add', 'Add Location')}
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
            rowCount={locationsData?.count || 0}
            paginationMode="server"
          />
        )}
      </ContentCard>

      <AnimatedDrawer
        open={drawerContext.isOpen}
        onClose={() => {
          drawerContext.closeDrawer();
          setSelectedLocationId(null);
          setDrawerMode('view');
          setActiveSidebarItem('view');
        }}
        title={t(`locations.${drawerMode}`, drawerMode === 'add' ? 'Add Location' : drawerMode === 'edit' ? 'Edit Location' : 'View Location')}
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
                form="location-form"
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
        <LocationForm
          mode={drawerMode}
          locationId={selectedLocationId}
          onSuccess={() => {
            drawerContext.closeDrawer();
            setSelectedLocationId(null);
            setDrawerMode('view');
            setActiveSidebarItem('view');
            // Refresh the data
          }}
        />
      </AnimatedDrawer>
    </Box>
  );
}
