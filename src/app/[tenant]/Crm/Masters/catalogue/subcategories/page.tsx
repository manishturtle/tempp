/**
 * Subcategories Listing Page
 * 
 * Page component for listing, filtering, and managing subcategories
 */
'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  Alert,
  Grid,
  FormControlLabel,
  Switch,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowParams,
  GridRowSelectionModel,
  GridToolbar
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFetchSubcategories, useDeleteSubcategory, useFetchCategories, useFetchCategoriesNoPagination, useCreateSubcategory, useUpdateSubcategory } from '@/app/hooks/api/catalogue';
import DeleteConfirmationDialog from '@/app/components/admin/catalogue/DeleteConfirmationDialog';
import { Subcategory, CatalogueFilter, Category } from '@/app/types/catalogue';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import { formatDateTime } from '@/app/utils/dateUtils';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import ContentCard from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import SubcategoryForm from '@/app/components/admin/catalogue/forms/SubcategoryForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { SubcategoryFormValues } from '@/app/components/admin/catalogue/schemas';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Wrapper component that provides the DrawerContext
function SubcategoriesPageWrapper() {
  return (
    <DrawerProvider>
      <SubcategoriesPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function SubcategoriesPage() {
  const { t } = useTranslation();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // State for filters
  const [filters, setFilters] = useState<CatalogueFilter>({});
  
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<Subcategory | null>(null);
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // Create a ref for the form to trigger submission
  const formRef = useRef<{ submitForm: () => void }>(null);
  
  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');
  
  // State for view (list or grid)
  const [view, setView] = useState<'list' | 'grid'>('list');
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 
    'name', 
    'category_name', 
    'division_name', 
    'description', 
    'is_active', 
    'formattedCreatedAt', 
    'createdByUsername', 
    'formattedUpdatedAt', 
    'updatedByUsername', 
    'actions'
  ]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Notification state
  const { 
    notification, 
    showSuccess, 
    showError, 
    hideNotification 
  } = useNotification();
  
  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });

  // API pagination params state (1-indexed)
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    page_size: 50
  });
  
  // Fetch subcategories with filters - merge pagination params with other filters
  const { 
    data, 
    isLoading: isLoadingSubcategories,
    isError: isSubcategoriesError,
    error: subcategoriesError,
    refetch: refetchSubcategories
  } = useFetchSubcategories({...filters, ...paginationParams});
  
  console.log("Subcategories data:", data);
  
  // Process data to add formatted date fields and usernames
  const processedData = useMemo(() => {
    if (!data) return [];
    
    // Handle different data formats - ensure we have an array to work with
    let subcategories: Subcategory[] = [];
    
    if (Array.isArray(data)) {
      // If data is already an array
      subcategories = data as Subcategory[];
    } else if (data && typeof data === 'object') {
      // If data is an object with results property
      subcategories = Array.isArray(data.results) ? data.results as Subcategory[] : [];
    }
    
    // Safety check - ensure we have a valid array before mapping
    if (!Array.isArray(subcategories)) {
      console.error('Expected subcategories to be an array but got:', typeof subcategories);
      return [];
    }
    
    const processed = subcategories.map((subcategory: Subcategory) => ({
      ...subcategory,
      // Use the category_name and division_name fields that are already in the API response
      category_name: subcategory?.category_name || 'N/A',
      division_name: subcategory?.division_name || 'N/A',
      createdByUsername: subcategory?.created_by?.username || 'N/A',
      updatedByUsername: subcategory?.updated_by?.username || 'N/A',
      formattedCreatedAt: formatDateTime(subcategory?.created_at),
      formattedUpdatedAt: formatDateTime(subcategory?.updated_at)
    }));
    
    console.log('Processed subcategories data:', processed);
    return processed;
  }, [data]);

 
  
  // Fetch categories for filtering (without pagination)
  const { 
    data: categories, 
    isLoading: isLoadingCategories 
  } = useFetchCategoriesNoPagination();
  
  // API mutations
  const { 
    mutate: deleteSubcategory, 
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError
  } = useDeleteSubcategory();
  
  const {
    mutate: createSubcategory,
    isPending: isCreating
  } = useCreateSubcategory();
  
  const {
    mutate: updateSubcategory,
    isPending: isUpdating
  } = useUpdateSubcategory();
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value) {
      setFilters(prev => ({ ...prev, search: e.target.value }));
    } else {
      const { search, ...rest } = filters;
      setFilters(rest);
    }
  };
  
  // Handle category filter change
  const handleCategoryChange = (e: SelectChangeEvent<string>) => {
    setFilters(prev => ({
      ...prev,
      category: e.target.value === '' ? undefined : Number(e.target.value)
    }));
  };
  
  // Handle delete button click
  const handleDeleteClick = (subcategory: Subcategory) => {
    setSubcategoryToDelete(subcategory);
    setDeleteDialogOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (subcategoryToDelete) {
      deleteSubcategory(subcategoryToDelete.id, {
        onSuccess: () => {
          showSuccess(t('deleteSuccess'));
          setDeleteDialogOpen(false);
        },
        onError: (error: unknown) => {
          showError(error instanceof Error ? error.message : t('error'));
        }
      });
    }
  };
  
  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  // DataGrid columns definition
  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: t('id'), 
      width: 70 
    },
  
    { 
      field: 'name', 
      headerName: t('name'), 
      width: 150,
      flex: 1
    },
  
    { 
      field: 'category_name', 
      headerName: t('category'), 
      width: 150
    },
    { 
      field: 'division_name', 
      headerName: t('division'), 
      width: 150
    },
    { 
      field: 'is_active', 
      headerName: t('isActive'), 
      width: 100,
    },
    { 
      field: 'formattedCreatedAt', 
      headerName: t('createdAt'), 
      width: 100
    },
    { 
      field: 'createdByUsername', 
      headerName: t('createdBy'), 
      width: 100
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: t('updatedAt'), 
      width: 100
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('updatedBy'), 
      width: 100
    },
    { 
      field: 'description', 
      headerName: t('description'), 
      width: 200,
      flex: 1,
    },
    { 
      field: 'actions', 
      headerName: t('Actions'), 
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Subcategory>) => (
          <Tooltip title={t('delete')}>
            <IconButton 
             onClick={(e) => {
              e.stopPropagation(); // Prevent row click
              handleDeleteClick(params.row as Subcategory)
            }}
              size="small"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
      )
    },
  ];
  
  // Handler for search in ContentCard
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    
    // Update filters with search term
    if (searchValue.trim()) {
      setFilters(prev => ({ ...prev, search: searchValue.trim() }));
    } else {
      // Remove search from filters if empty
      const { search, ...restFilters } = filters;
      setFilters(restFilters);
    }
  };

  // Handler for view change in ContentCard
  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
  };

  // Handler for filter change in ContentCard
  const handleFilterChange = (newFilters: any) => {
    // Preserve search term if it exists
    const updatedFilters = searchTerm 
      ? { ...newFilters, search: searchTerm } 
      : newFilters;
      
    console.log('Applying filters:', updatedFilters);
    setFilters(updatedFilters);
  };

  // Handler for tab change in ContentCard
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Apply filters based on tab while preserving other filters
    const baseFilters = { ...filters };
    
    // Preserve search term if it exists
    if (searchTerm) {
      baseFilters.search = searchTerm;
    }
    
    if (newTab === 'active') {
      setFilters({ ...baseFilters, is_active: true });
    } else if (newTab === 'inactive') {
      setFilters({ ...baseFilters, is_active: false });
    } else {
      // Remove is_active filter for 'all' tab but keep other filters
      const { is_active, ...restFilters } = baseFilters;
      setFilters(restFilters);
    }
    
    console.log('Tab changed to:', newTab, 'with filters:', filters);
  };
  const drawerSidebarIcons = useMemo(() => {
    if (drawerMode === 'add') {
      return [];
    }
    return [
      { 
        id: 'view', 
        icon: <VisibilityIcon />, 
        tooltip: t('view', 'View'), 
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem('view');
          drawerContext.setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('edit', 'Edit'), 
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem('edit');
          drawerContext.setActiveSidebarItem('edit');
        }
      }
    ];
  }, [drawerMode, t, drawerContext]);
  
  // Filter options for ContentCard
  const filterOptions = useMemo(() => [
    { field: 'name', label: t('name'), type: 'text' as const },
    { field: 'category', label: t('category'), type: 'select' as const, options: categories ? categories.map((cat: Category) => ({ value: String(cat.id), label: cat.name })) : [] },
    { field: 'is_active', label: t('status'), type: 'boolean' as const }
  ], [t, categories]);

  // Column options for ContentCard
  const columnOptions = useMemo(() => columns.map(col => ({ field: col.field, headerName: col.headerName?.toString() || col.field })), [columns]);

  // State to store the counts from API
  const [tabCounts, setTabCounts] = useState({
    active: 0,
    inactive: 0,
    total: 0
  });

  // Update counts when data changes
  useEffect(() => {
    if (data?.counts) {
      setTabCounts({
        active: data.counts.active || 0,
        inactive: data.counts.inactive || 0,
        total: data.counts.total || 0
      });
    }
  }, [data]);

  // Tab options for ContentCard
  const tabOptions = useMemo(() => [
    { 
      value: 'all', 
      label: t('all'), 
      count: tabCounts.total 
    },
    { 
      value: 'active', 
      label: t('active'), 
      count: tabCounts.active 
    },
    { 
      value: 'inactive', 
      label: t('inactive'), 
      count: tabCounts.inactive 
    }
  ], [tabCounts, t]);

  // Handle drawer open for adding a new subcategory
  const handleAddSubcategory = () => {
    setSelectedSubcategoryId(null);
    setSelectedSubcategory(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };

  // Handle drawer open for editing a subcategory
  const handleOpenEditDrawer = (id: number) => {
    setSelectedSubcategoryId(id);
    setDrawerMode('edit');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    // Find the subcategory by id
    const subcategory = processedData.find(item => item.id === id);
    if (subcategory) {
      setSelectedSubcategory(subcategory);
      setDrawerOpen(true);
    }
    drawerContext.openDrawer('edit');
  };
  
  // Handle drawer open for viewing a subcategory
  const handleViewClick = (id: number) => {
    setSelectedSubcategoryId(id);
    setDrawerMode('view');
    setIsViewMode(true);
    setActiveSidebarItem('view');
    // Find the subcategory by id
    const subcategory = processedData.find(item => item.id === id);
    if (subcategory) {
      setSelectedSubcategory(subcategory);
      setDrawerOpen(true);
    }
    drawerContext.openDrawer('view');
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };
  
  // Handle drawer save
  const handleDrawerSave = () => {
    // Trigger the form submission when the drawer save button is clicked
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  // State to store API validation errors
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Handle form submission
  const handleFormSubmit = (values: SubcategoryFormValues) => {
    // Clear previous API errors
    setApiErrors({});
    
    // Prepare data for API by converting null to undefined
    const preparedData = {
      ...values,
      image: values.image || undefined // Convert null to undefined
    };
    
    // Helper function to handle API errors
    const handleApiError = (error: any) => {
      if (error?.response?.data) {
        const apiError = error.response.data;
        console.log('API Error:', apiError);
        
        // Format errors into a simple object with field names as keys
        const formattedErrors: Record<string, string> = {};
        
        // Handle field-specific errors
        Object.entries(apiError).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Join multiple error messages with a space
            formattedErrors[field] = messages.join(' ');
          } else if (typeof messages === 'string') {
            formattedErrors[field] = messages;
          }
        });
        
        // Set the errors in state to show in the form
        setApiErrors(formattedErrors);
        
        // Show the first error as a notification
        const firstError = Object.values(formattedErrors)[0];
        if (firstError) {
          showError(firstError);
        } else {
          showError(t('error'));
        }
      } else {
        // Fallback for generic errors
        showError(error instanceof Error ? error.message : t('error'));
      }
    };
    
    if (drawerMode === 'add') {
      // Create new subcategory
      createSubcategory(preparedData, {
        onSuccess: () => {
          showSuccess(t('createSubcategorySuccess'));
          setDrawerOpen(false);
          refetchSubcategories();
        },
        onError: handleApiError
      });
    } else if (selectedSubcategoryId) {
      // Update existing subcategory
      updateSubcategory({ id: selectedSubcategoryId, ...preparedData } as Subcategory, {
        onSuccess: () => {
          showSuccess(t('updateSubcategorySuccess'));
          setDrawerOpen(false);
          refetchSubcategories();
        },
        onError: handleApiError
      });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {t('subcategories')}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddSubcategory}
        >
          {t('subcategory')}
        </Button>
      </Box>
      
      {/* Error alerts */}
      {isSubcategoriesError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {subcategoriesError instanceof Error ? subcategoriesError.message : t('error')}
        </Alert>
      )}
      
      {isDeleteError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {deleteError instanceof Error ? deleteError.message : t('error')}
        </Alert>
      )}
      
      {/* Loading indicator */}
      {isLoadingSubcategories && <Loader message={t('loading')} />}
      
      {/* Data grid with ContentCard and CustomDataGrid */}
      {!isLoadingSubcategories && (
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
              rows={processedData}
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
              checkboxSelection={true}
              disableRowSelectionOnClick={false}
              autoHeight
              getRowId={(row) => (row as Subcategory).id}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={(newSelection) => {
                setRowSelectionModel(newSelection);
              }}
              onRowClick={(params: GridRowParams<Subcategory>) => {
                handleViewClick(params.row.id);
              }}
              // Server-side pagination properties
              rowCount={typeof data === 'object' && data !== null && typeof data.count === 'number' ? data.count : processedData.length}
              paginationMode="server"
              loading={isLoadingSubcategories}
            />
          ) : (
            // Grid view can be implemented here
            <Box sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" align="center">
                {t('Grid view is not implemented yet')}
              </Typography>
            </Box>
          )}
          
          {/* Pagination statistics - below the data grid */}
          {data && !isLoadingSubcategories && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="body2" color="text.secondary">
                {t('showing')} {processedData.length || 0} {t('of')} {
                  typeof data === 'object' && data !== null ? 
                    (typeof data.count === 'number' ? data.count : processedData.length) : 
                    processedData.length
                } {t('entries')}
                {(typeof data === 'object' && data !== null && 
                  typeof data.total_pages === 'number' && data.total_pages > 0) && 
                  ` - ${t('page')} ${(typeof data.current_page === 'number') ? data.current_page : 1} ${t('of')} ${data.total_pages}`
                }
              </Typography>
            </Box>
          )}
        </ContentCard>
      )}
      
      {/* AnimatedDrawer for adding/editing subcategories */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        initialWidth={550}
        expandedWidth={550}
        title={
          isViewMode
            ? t('viewSubcategory')
            : drawerMode === 'add'
            ? t('addSubcategory')
            : t('editSubcategory')
        }
        onSave={isViewMode ? undefined : () => {
          if (formRef.current) {
            formRef.current.submitForm();
          }
        }}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedSubcategoryId && (
              <Typography variant="caption" color="text.secondary">
                {t('lastUpdated')}: {selectedSubcategory?.updated_at ? formatDateTime(selectedSubcategory.updated_at) : ''}
              </Typography>
            )}
          </Box>
        }
      >
        <SubcategoryForm
          ref={formRef}
          defaultValues={
            selectedSubcategory ? {
              ...(selectedSubcategoryId ? { id: selectedSubcategoryId } : {}), // Only include ID when it's not null
              name: selectedSubcategory.name,
              category: typeof selectedSubcategory.category === 'object' && selectedSubcategory.category !== null ? (selectedSubcategory.category as Category).id : selectedSubcategory.category,
              is_active: selectedSubcategory.is_active,
              sort_order: selectedSubcategory.sort_order || 0,
              description: selectedSubcategory.description || '',
              image: selectedSubcategory.image || undefined,
              image_alt_text: selectedSubcategory.image_alt_text || '',
              customer_group_selling_channel_ids: selectedSubcategory.customer_group_selling_channels?.map(
                (channel: any) => channel.id
              ) || []
            } : undefined
          }
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
          readOnly={isViewMode} // Use readOnly prop instead of isViewMode
        />
      </AnimatedDrawer>
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        title={t('deleteTitle')}
        content={t('deleteMessage')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteDialogClose}
        loading={isDeleting}
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
};

export default SubcategoriesPageWrapper;
