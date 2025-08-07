"use client";

/**
 * Categories Listing Page
 * 
 * Page component for listing, filtering, and managing product categories
 */
import React, { useState, useMemo, useRef } from 'react';
import { Typography, Box, Button, Tooltip, IconButton } from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard, { FilterOption, FilterState as ContentCardFilterState } from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useFetchCategories, useDeleteCategory, useCreateCategory, useUpdateCategory, useFetchDivisions } from '@/app/hooks/api/catalogue';
import { Category } from '@/app/types/catalogue';
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
import CategoryForm from '@/app/components/admin/catalogue/forms/CategoryForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { CategoryFormValues } from '@/app/components/admin/catalogue/schemas';
import storeapi from '@/lib/storeapi';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Extended type to handle audit fields and nested data
interface CategoryExtended extends Category {
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
  division_details?: {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
  };
}

// Type for the processed row data
interface ProcessedCategory extends CategoryExtended {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
  divisionDisplay: string;
  taxRateDisplay: string;
}

// Type for filter state
interface FilterState {
  field: string;
  operator: string;
  value: any;
}

// Wrapper component that provides the DrawerContext
export default function CategoriesPageWrapper() {
  return (
    <DrawerProvider>
      <CategoriesPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function CategoriesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryExtended | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);
  
  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');
  
  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });
  
  // API pagination params state
  const [paginationParams, setPaginationParams] = useState({
    page: 1, // API uses 1-indexed pages
    page_size: 50,
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
    'id', 'name', 'divisionDisplay', 'sort_order', 'tax_inclusive', 
    'is_active', 'formattedCreatedAt', 'createdByUsername', 
    'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');
  
  // State for delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: number | null}>({
    open: false,
    id: null
  });
  
  // API hooks
  const { data, isLoading: isLoadingCategories, isError, error, refetch } = useFetchCategories(paginationParams);
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  
  // Tab options for filtering categories
  const tabOptions = useMemo(() => [
    { 
      value: 'all', 
      label: t('all'), 
      count: data?.counts?.total || 0
    },
    { 
      value: 'active', 
      label: t('active'), 
      count: data?.counts?.active || 0
    },
    { 
      value: 'inactive', 
      label: t('inactive'), 
      count: data?.counts?.inactive || 0
    }
  ], [data, t]);

  // Process data to add username fields directly and format dates
  const processedRows = useMemo(() => {
    if (!data) return [];
    
    // Access results from the pagination response
    const categories = data.results || [];
    
    // Use type assertion to handle CategoryExtended type
    return categories.map((item) => ({
      ...item,
      // Format other fields
      createdByUsername: item.created_by?.username || 'N/A',
      updatedByUsername: item.updated_by?.username || 'N/A',
      formattedCreatedAt: formatDateTime(item.created_at),
      formattedUpdatedAt: formatDateTime(item.updated_at),
      divisionDisplay: item.division_name || 'N/A',
      taxRateDisplay: item.default_tax_rate_profile_name || 'N/A'
    }));
  }, [data]);
  
  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = processedRows;
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(category => 
        category.name?.toLowerCase().includes(lowerCaseSearch) ||
        category.divisionDisplay?.toLowerCase().includes(lowerCaseSearch) ||
        category.description?.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(category => {
        return activeFilters.every(filter => {
          const value = category[filter.field as keyof typeof category];
          
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active' || filter.field === 'tax_inclusive') {
                return category[filter.field] === filter.value;
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
  
  if (isLoadingCategories) return <Loader />;
  
  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          {t('error')}
        </Typography>
      </Box>
    );
  }
  
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
  
  // Handle tab change from ContentCard
  const handleTabChange = (newTab: string) => {
    // Update the active tab in state
    setActiveTab(newTab);
    
    // Determine the is_active value based on the selected tab
    const isActiveValue = newTab === 'all' 
      ? undefined 
      : newTab === 'active';
    
    // Update API params based on tab
    setPaginationParams(prevParams => ({
      ...prevParams,
      page: 1, // Reset to first page when changing tabs
      is_active: isActiveValue
    }));
    
    // Update local filters for consistency with other filters
    const newFilters = activeFilters.filter(filter => filter.field !== 'is_active');
    
    if (newTab !== 'all') {
      newFilters.push({
        field: 'is_active',
        operator: 'equals',
        value: newTab === 'active'
      });
    }
    
    setActiveFilters(newFilters);
  };
  
  // Handle delete button click
  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };
  
  // Handle delete confirmation
  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteCategory(confirmDelete.id, {
        onSuccess: () => {
          showSuccess(t('catalogue.category.deleteSuccess', 'Category deleted successfully'));
          setConfirmDelete({ open: false, id: null });
          refetch();
        },
        onError: (error) => {
          console.error('Error deleting category:', error);
          showError(t('catalogue.category.deleteError', 'Error deleting category'));
          setConfirmDelete({ open: false, id: null });
        }
      });
    }
  };
  
  // Handle drawer open for adding a new category
  const handleAddCategory = () => {
    setSelectedCategoryId(null);
    setSelectedCategory(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };
  
  // Handle drawer open for editing a category
  const handleOpenEditDrawer = (id: number) => {
    // Prevent multiple calls if already loading or if the same category is already selected
    if (isLoading || (selectedCategoryId === id && drawerOpen)) {
      return;
    }
    
    // Set the ID and mode
    setSelectedCategoryId(id);
    setDrawerMode('edit');
    setIsViewMode(true); // Set to true to enable view mode by default
    setActiveSidebarItem('view'); // Set active sidebar item to view by default
    
    // Find the category by id from the already loaded data
    const category = filteredData.find((item) => item.id === id);
    
    if (category) {
      // Create a properly typed category object that matches CategoryExtended
      const categoryData: CategoryExtended = {
        ...category,
        created_by: {
          id: category.created_by?.id || 0,
          username: category.created_by?.username || 'Unknown',
          email: category.created_by?.email || '',
          first_name: category.created_by?.first_name || '',
          last_name: category.created_by?.last_name || ''
        },
        updated_by: {
          id: category.updated_by?.id || 0,
          username: category.updated_by?.username || 'Unknown',
          email: category.updated_by?.email || '',
          first_name: category.updated_by?.first_name || '',
          last_name: category.updated_by?.last_name || ''
        },
        division_details: 'division_details' in category ? (category as any).division_details : undefined
      };
      
      // Store the properly typed category data
      setSelectedCategory(categoryData);
      
      // Open drawer 
      setDrawerOpen(true);
      
      // Update drawer context
      drawerContext.openDrawer('view'); // Open with view context
    } else {
      // Handle case where category is not found in memory
      console.error('Category not found in loaded data');
      showError(t('categories.notFound', 'Category not found'));
    }
  };
  
  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
    setSelectedCategoryId(null);
    setSelectedCategory(null);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  // Handle form save
  const handleSave = (values: CategoryFormValues) => {
    // Clear previous API errors
    setApiErrors({});
    
    // Transform values to match API format
    const apiValues = {
      ...values,
      // Ensure default_tax_rate_profile is properly formatted
      default_tax_rate_profile: values.default_tax_rate_profile || null,
      // Remove any old default_tax_rate field if it exists
      default_tax_rate: undefined
    };
    
    // Helper function to format API errors
    const formatApiErrors = (errorData: Record<string, string[]>) => {
      const formattedErrors: Record<string, string> = {};
      
      Object.entries(errorData).forEach(([field, messages]) => {
        // Handle nested fields if needed (e.g., image_alt_text)
        if (field === 'image_alt_text') {
          formattedErrors['image_alt_text'] = messages[0];
        } else {
          formattedErrors[field] = messages[0];
        }
      });
      
      return formattedErrors;
    };
    
    if (drawerMode === 'add') {
      // Fix type issue by explicitly handling the image field
      const categoryData = {
        ...values,
        image: values.image || undefined // Convert null to undefined
      };
      
      createCategory(categoryData, {
        onSuccess: () => {
          showSuccess(t('addCategorySuccess', 'Category added successfully'));
          handleDrawerClose();
          refetch();
        },
        onError: (error: any) => {
          console.error('Error creating category:', error);
          
          // Handle API validation errors
          if (error.response?.data) {
            const formattedErrors = formatApiErrors(error.response.data);
            setApiErrors(formattedErrors);
            
            // Show first error in notification
            const firstError = Object.values(formattedErrors)[0];
            if (firstError) {
              showError(firstError);
            } else {
              showError(t('categories.addError', 'Error adding category'));
            }
          } else {
            showError(t('categories.addError', 'Error adding category'));
          }
        }
      });
    } else if (selectedCategoryId) {
      // Structure data according to useUpdateCategory hook requirements
      // Ensure image property has the correct type (string | undefined, not null)
      const updateData = {
        id: selectedCategoryId,
        data: {
          ...values,
          // Convert null to undefined for image to satisfy type constraints
          image: values.image === null ? undefined : values.image
        }
      };
      
      updateCategory(updateData, {
        onSuccess: () => {
          showSuccess(t('updateCategorySuccess', 'Category updated successfully'));
          handleDrawerClose();
          refetch();
        },
        onError: (error: any) => {
          console.error('Error updating category:', error);
          
          // Handle API validation errors
          if (error.response?.data) {
            const formattedErrors = formatApiErrors(error.response.data);
            setApiErrors(formattedErrors);
            
            // Show first error in notification
            const firstError = Object.values(formattedErrors)[0];
            if (firstError) {
              showError(firstError);
            } else {
              showError(t('categories.updateError', 'Error updating category'));
            }
          } else {
            showError(t('categories.updateError', 'Error updating category'));
          }
        }
      });
    }
  };
  
  // DataGrid columns definition
  const columns: GridColDef[] = [
    { field: 'id', headerName: t('id'), width: 70 },
    { field: 'name', headerName: t('name'), width: 150 },
    { field: 'divisionDisplay', headerName: t('division'), width: 150 },
    // { field: 'taxRateDisplay', headerName: t('taxRate'), width: 120 },
    { field: 'sort_order', headerName: t('sortOrder'), width: 100 },
    { 
      field: 'tax_inclusive', 
      headerName: t('taxInclusive'), 
      width: 120,
     
    },
    { 
      field: 'is_active', 
      headerName: t('Status', 'Status'), 
      width: 100,
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
    { 
      field: 'actions', 
      headerName: t('Actions'), 
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('delete', 'Delete')}>
            <IconButton 
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleDelete(params.row.id);
              }}
              aria-label={t('delete', 'Delete category')}
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
      field: 'division',
      label: t('division'),
      type: 'text' as const
    },
    {
      field: 'tax_inclusive',
      label: t('taxInclusive'),
      type: 'boolean' as const
    },
    {
      field: 'is_active',
      label: t('Status'),
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
  const columnOptions = columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  }));
  
  // Tab options are now defined at the top level with other hooks
      
  // Define drawer sidebar icons for view/edit modes
  const drawerSidebarIcons: { id: string; icon: React.ReactNode; tooltip: string; onClick?: () => void }[] = drawerMode === 'add' ? [] : [
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
  
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('categories')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
        >
          {t('category')}
        </Button>
      </Box>
      
      <ContentCard 
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onColumnsChange={setVisibleColumns}
        onTabChange={(tabValue) => handleTabChange(tabValue)}
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
            // Server-side pagination properties
            rowCount={typeof data?.count === 'object' ? data.count.total : data?.count || 0}
            paginationMode="server"
            loading={isLoadingCategories}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              Grid view is not implemented yet
            </Typography>
          </Box>
        )}
        
        {/* Pagination statistics - below the data grid */}
        {data && !isLoadingCategories && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="body2" color="text.secondary">
              {t('showing')} {data.results?.length || 0} {t('of')} {typeof data?.count === 'object' ? data.count.total : data?.count || 0} {t('entries')}
              {(data.total_pages && data.total_pages > 0) && ` - ${t('page')} ${data.current_page || 1} ${t('of')} ${data.total_pages}`}
            </Typography>
          </Box>
        )}
      </ContentCard>
      
      {/* AnimatedDrawer for adding/editing categories */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={drawerMode === 'add' ? t('addCategory') : t('editCategory')}
        initialWidth={550}
        expandedWidth={550}
        onSave={!isViewMode ? handleSubmit : undefined}
        saveDisabled={isCreating || isUpdating || isLoading}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedCategoryId && (
              <Typography variant="caption" color="text.secondary">
                {/* {t('lastUpdated', 'Last updated')}: {formatDateTime(selectedCategory?.updated_at || '')} */}
              </Typography>
            )}
          </Box>
        }
      >
        {isLoading ? (
          <Loader message={t('loading')} />
        ) : (
          <CategoryForm
            ref={formRef}
            defaultValues={
              selectedCategory ? {
                id: selectedCategory.id,
                name: selectedCategory.name,
                description: selectedCategory.description || '',
                is_active: selectedCategory.is_active,
                division: selectedCategory.division,
                image: selectedCategory.image || '',
                image_alt_text: selectedCategory.image_alt_text || '',
                default_tax_rate_profile: selectedCategory.default_tax_rate_profile || null,
                tax_inclusive: selectedCategory.tax_inclusive || false,
                sort_order: selectedCategory.sort_order || 0,
                // Extract the selling channel IDs from customer_group_selling_channels
                customer_group_selling_channel_ids: selectedCategory.customer_group_selling_channels?.map(
                  (channel: any) => channel.id
                ) || [],
              } : {
                name: '',
                description: '',
                is_active: true,
                division: 0, // This will trigger validation error if not changed
                default_tax_rate_profile: null, // This will trigger validation error if not changed
                tax_inclusive: false,
                sort_order: 0
              }
            }
            readOnly={isViewMode}
            onSubmit={handleSave}
            isSubmitting={isCreating || isUpdating}
          />
        )}
      </AnimatedDrawer>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('Delete Category')}
        content={t('Delete Category Confirmation', 'Are you sure you want to delete this category? This action cannot be undone.')}
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
