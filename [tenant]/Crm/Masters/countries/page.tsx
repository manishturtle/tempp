"use client";

/**
 * Countries Listing Page
 * 
 * Page component for listing, filtering, and managing countries
 */
import React, { useState, useMemo, useRef } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  IconButton, 
  Tooltip,
  CircularProgress,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useFetchCountries, useDeleteCountry, useCreateCountry, useUpdateCountry, useFetchCountry } from '@/app/hooks/api/shared';
import { Country } from '@/app/types/shared';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { formatDateTime } from '@/app/utils/dateUtils';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import Loader from '@/app/components/common/Loader';
import CountryForm, { CountryFormRef, CountryFormValues } from '@/app/components/admin/shared/forms/CountryForm';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import api from '@/lib/api';

// Processed type for DataGrid display
interface ProcessedCountry extends Country {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
  statusText: string;
}

// Wrapper component that provides the DrawerContext
export default function CountriesPageWrapper() {
  return (
    <DrawerProvider>
      <CountriesPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function CountriesPage() {
  const { t } = useTranslation();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');
  const [isLoading, setIsLoading] = useState(false);

  // Notification state
  const { 
    notification, 
    showSuccess, 
    showError, 
    hideNotification 
  } = useNotification();
  
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });

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

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'iso_code', 'iso_code_3', 'name', 'phone_code', 'flag_url', 'statusText', 'formattedCreatedAt', 
    'createdByUsername', 'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');

  // API hooks
  const { data: countriesData, isLoading: isCountriesLoading, refetch: refetchCountries } = useFetchCountries({...paginationParams, search: searchTerm});
  const { mutate: deleteCountry, isPending: isDeleting } = useDeleteCountry();
  const { mutate: createCountry, isPending: isCreating } = useCreateCountry();
  const { mutate: updateCountry, isPending: isUpdating } = useUpdateCountry();
  const { data: countryData, isLoading: isCountryLoading } = useFetchCountry(selectedCountryCode || undefined);

  // State for selected rows
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  // Form state
  const [formData, setFormData] = useState<CountryFormValues>({
    iso_code: '',
    name: '',
    is_active: true,
    flag_url: '',
    phone_code: ''
  });

  // Form validation state
  const [errors, setErrors] = useState({
    iso_code: '',
    name: '',
    phone_code: '',
    flag_url: ''
  });

  // Form ref
  const formRef = useRef<CountryFormRef>(null);

  // Toggle between view and edit mode
  const toggleViewMode = () => {
    setIsViewMode(!isViewMode);
  };

  // Open drawer for adding a new country
  const handleOpenAddDrawer = () => {
    setSelectedCountryCode(null);
    setSelectedCountry(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
  };

  // Open drawer for editing a country
  const handleOpenEditDrawer = (id: string) => {
    // Prevent multiple calls if already loading or if the same country is already selected
    if (isLoading || (selectedCountryCode === id && drawerOpen)) {
      return;
    }
    
    // Set loading state first
    setIsLoading(true);
    
    // Set the ID and mode
    setSelectedCountryCode(id);
    setDrawerMode('edit');
    setIsViewMode(true); // Set to true initially since we're setting activeSidebarItem to 'view'
    setActiveSidebarItem('view');
    
    // First fetch the data, then open the drawer
    api.get(`/shared/countries/${id}`)
      .then(response => {
        if (response.data) {
          // Store the full country data
          setSelectedCountry(response.data);
          
          // Open drawer 
          setDrawerOpen(true);
          
          // Update drawer context only once to prevent multiple API calls
          drawerContext.openDrawer('edit');
          drawerContext.setActiveSidebarItem('view');
        }
      })
      .catch(error => {
        console.error('Error fetching country:', error);
        showError(t('countries.fetchError', 'Failed to fetch country details'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Close drawer
  const closeDrawer = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
    setSelectedCountryCode(null);
    setSelectedCountry(null);
    setFormData({
      iso_code: '',
      name: '',
      is_active: true,
      flag_url: '',
      phone_code: ''
    });
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    // Validate ISO code (required, exactly 2 characters)
    if (drawerMode === 'add') {
      if (!formData.iso_code) {
        newErrors.iso_code = t('validation.required', 'This field is required');
        isValid = false;
      } else if (formData.iso_code.length !== 2) {
        newErrors.iso_code = t('validation.exactLength', 'Must be exactly 2 characters');
        isValid = false;
      }
    }
    
    // Validate name (required)
    if (!formData.name) {
      newErrors.name = t('validation.required', 'This field is required');
      isValid = false;
    }
    
    // Validate phone code (optional, but must be valid if provided)
    if (formData.phone_code && !/^\+\d{1,4}$/.test(formData.phone_code)) {
      newErrors.phone_code = t('validation.phoneCode', 'Must be in format +XX');
      isValid = false;
    }
    
    // Validate flag URL (optional, but must be valid URL if provided)
    if (formData.flag_url && !isValidUrl(formData.flag_url)) {
      newErrors.flag_url = t('validation.url', 'Must be a valid URL');
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  // Helper function to validate URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (drawerMode === 'add') {
        await createCountry(formData);
        showSuccess(t('countries.addSuccess', 'Country added successfully'));
      } else if (drawerMode === 'edit' && selectedCountryCode) {
        await updateCountry({ 
          iso_code: selectedCountryCode, 
          data: {
            name: formData.name,
            is_active: formData.is_active,
            flag_url: formData.flag_url || '',
            phone_code: formData.phone_code || '',
            iso_code_3: formData.iso_code_3 || ''
          }
        });
        showSuccess(t('countries.updateSuccess', 'Country updated successfully'));
      } else if (drawerMode === 'edit') {
        showError(t('countries.updateError', 'Cannot update country: No country code selected'));
      } else {
        showError(t('countries.updateError', 'Cannot update country: No country code selected'));
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      showError(t('error'));
    } finally {
      setIsLoading(false);
      closeDrawer();
    }
  };

  // Handle edit button click
  const handleEdit = (id: string) => {
    handleOpenEditDrawer(id);
  };

  // Handle delete button click
  const handleDelete = (id: string) => {
    setConfirmDelete({ open: true, id });
  };

  // Handle delete confirmation
  const confirmDeleteAction = async () => {
    if (confirmDelete.id) {
      try {
        setIsLoading(true);
        await deleteCountry(confirmDelete.id);
        showSuccess(t('deleteSuccess'));
      } catch (error) {
        console.error('Error deleting country:', error);
        showError(t('error'));
      } finally {
        setConfirmDelete({ open: false, id: null });
        setIsLoading(false);
      }
    }
  };

  // Handle search from ContentCard
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle view change from ContentCard
  const handleViewChange = (newView: 'list' | 'grid') => {
    setViewMode(newView);
  };

  // Handle filter change from ContentCard
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };

  // Handle tab change from ContentCard
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Apply filter based on tab
    if (newTab === 'all') {
      // Remove any status filter
      setActiveFilters(activeFilters.filter(filter => filter.field !== 'is_active'));
    } else if (newTab === 'active') {
      // Add or update status filter to show only active
      const newFilters = activeFilters.filter(filter => filter.field !== 'is_active');
      newFilters.push({
        field: 'is_active',
        operator: 'equals',
        value: true
      });
      setActiveFilters(newFilters);
    } else if (newTab === 'inactive') {
      // Add or update status filter to show only inactive
      const newFilters = activeFilters.filter(filter => filter.field !== 'is_active');
      newFilters.push({
        field: 'is_active',
        operator: 'equals',
        value: false
      });
      setActiveFilters(newFilters);
    }
  };

  // Filter options for the ContentCard
  const filterOptions: FilterOption[] = [
    { 
      field: 'name', 
      label: t('countries.name'), 
      type: 'text' 
    },
    { 
      field: 'iso_code', 
      label: t('countries.isoCode'), 
      type: 'text' 
    },
    { 
      field: 'iso_code_3', 
      label: t('countries.isoCode3'), 
      type: 'text' 
    },
    { 
      field: 'phone_code', 
      label: t('countries.phoneCode'), 
      type: 'text' 
    },
    { 
      field: 'is_active', 
      label: t('fields.status', 'Status'), 
      type: 'select',
      options: [
        { value: 'true', label: t('active') },
        { value: 'false', label: t('inactive') }
      ]
    },
    { 
      field: 'created_at', 
      label: t('createdAt'), 
      type: 'date' 
    },
    { 
      field: 'updated_at', 
      label: t('updatedAt'), 
      type: 'date' 
    }
  ];

  // Process data for display
  const processedData = useMemo(() => {
    if (!countriesData) return [];
    
    // Handle both array response and paginated response structure
    const countries = Array.isArray(countriesData) ? countriesData : countriesData.results || [];
    
    return countries.map((country: Country) => ({
      ...country,
      formattedCreatedAt: formatDateTime(country.created_at),
      formattedUpdatedAt: formatDateTime(country.updated_at),
      createdByUsername: country.created_by?.username || 'System',
      updatedByUsername: country.updated_by?.username || 'System',
      statusText: country.is_active ? t('active') : t('inactive')
    })) as ProcessedCountry[];
  }, [countriesData]);

  // Apply all filters to the data
  const filteredData = useMemo(() => {
    let filtered = processedData;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(country => 
        country.name.toLowerCase().includes(lowerCaseSearch) ||
        country.iso_code.toLowerCase().includes(lowerCaseSearch) ||
        (country.phone_code && country.phone_code.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Apply advanced filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(country => {
        return activeFilters.every(filter => {
          const value = country[filter.field as keyof typeof country];
          
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active') {
                return country.is_active === (filter.value === 'true');
              }
              return String(value).toLowerCase() === String(filter.value).toLowerCase();
            case 'contains':
              return typeof value === 'string' && value.toLowerCase().includes(String(filter.value).toLowerCase());
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
  }, [processedData, searchTerm, activeFilters]);

  // Columns for the data grid
  const columns: GridColDef[] = useMemo(() => [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
    },
    { 
      field: 'iso_code', 
      headerName: t('countries.isoCode', 'ISO Code'), 
      width: 120 
    },
    { 
      field: 'iso_code_3', 
      headerName: t('countries.isoCode3'), 
      width: 120 
    },
    { 
      field: 'name', 
      headerName: t('countries.name'), 
      width: 200 
    },
    { 
      field: 'phone_code', 
      headerName: t('countries.phoneCode'), 
      width: 150 
    },
    { 
      field: 'flag_url', 
      headerName: t('countries.flagUrl'), 
      width: 200 
    },
    { 
      field: 'statusText', 
      headerName: t('status'), 
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
      field: 'formattedUpdatedAt', 
      headerName: t('updatedAt'), 
      width: 180 
    },
    { 
      field: 'createdByUsername', 
      headerName: t('createdBy'), 
      width: 150 
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('updatedBy'), 
      width: 150 
    },
    { 
      field: 'actions', 
      headerName: t('actions'), 
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
                handleDelete(params.row.iso_code);
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

  // Define tab options
  const tabOptions = [
    { 
      value: 'all', 
      label: t('all'), 
      count: processedData.length 
    },
    { 
      value: 'active', 
      label: t('active'), 
      count: processedData.filter(row => row.is_active).length 
    },
    { 
      value: 'inactive', 
      label: t('inactive'), 
      count: processedData.filter(row => !row.is_active).length 
    }
  ];

  // Custom sidebar icons for the drawer - only show in edit mode, not in add mode
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

  // Empty sidebar content object
  const drawerSidebarContent = {};

  const handleFormSubmit = async (formData: CountryFormValues) => {
    try {
      setIsLoading(true);
      
      if (drawerMode === 'add') {
        // For create, we need to pass the complete form data
        await createCountry(formData);
        showSuccess(t('countries.addSuccess', 'Country added successfully'));
      } else if (drawerMode === 'edit' && selectedCountryCode) {
        // For update, we need to use the correct structure with iso_code and data
        await updateCountry({ 
          iso_code: selectedCountryCode, 
          data: {
            name: formData.name,
            is_active: formData.is_active,
            flag_url: formData.flag_url || '',
            phone_code: formData.phone_code || '',
            iso_code_3: formData.iso_code_3 || ''
          }
        });
        showSuccess(t('countries.updateSuccess', 'Country updated successfully'));
      } else if (drawerMode === 'edit') {
        showError(t('countries.updateError', 'Cannot update country: No country code selected'));
      }
      
      // Close drawer on success
      closeDrawer();
    } catch (error) {
      console.error('Error submitting form:', error);
      showError(drawerMode === 'add' 
        ? t('error') 
        : t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isCountriesLoading) return <Loader />;

  // Render the drawer content
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('Countries')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenAddDrawer}
        >
          {t('add')}
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
        {viewMode === 'list' ? (
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
            rowCount={countriesData?.count || 0}
            paginationMode="server"
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            loading={isCountriesLoading}
            getRowId={(row) => row.id}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            rowSelectionModel={rowSelectionModel}
            onRowClick={(params) => {
              handleOpenEditDrawer(params.row.iso_code);
            }}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t('gridViewNotImplemented')}
            </Typography>
          </Box>
        )}
      </ContentCard>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t('deleteTitle')}
        content={t('deleteConfirm')}
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
      
      <AnimatedDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === 'add' ? 'Add Country' : 'Edit Country'}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerSidebarIcons}
        sidebarContent={drawerSidebarContent}
        defaultSidebarItem={activeSidebarItem}
        onSave={!isViewMode ? () => formRef.current?.submitForm() : undefined}
        saveDisabled={isCreating || isUpdating || isLoading}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedCountryCode && (
              <Typography variant="caption" color="text.secondary">
                {t('lastUpdated')}: {formatDateTime(countryData?.updated_at || '')}
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
          <CountryForm
            ref={formRef}
            initialData={selectedCountry ? {
              iso_code: selectedCountry.iso_code,
              iso_code_3: selectedCountry.iso_code_3,
              name: selectedCountry.name,
              phone_code: selectedCountry.phone_code,
              flag_url: selectedCountry.flag_url,
              is_active: selectedCountry.is_active
            } : undefined}
            isViewMode={isViewMode}
            onSubmit={handleFormSubmit}
          />
        )}
      </AnimatedDrawer>
    </Box>
  );
}
