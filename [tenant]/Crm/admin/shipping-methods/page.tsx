"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  IconButton,
  Typography,
  MenuItem,
  TextField,
  Stack,
  Chip,
  Tooltip,
} from "@mui/material";
import { GridColDef, GridRenderCellParams, GridValueGetter } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import ShippingMethodForm, { ShippingMethodFormRef, ShippingMethodFormValues } from "./ShippingMethodForm";

import {
  useShippingMethods,
  useDeleteShippingMethod,
  useCreateShippingMethod,
  useUpdateShippingMethod,
  useShippingMethod
} from "@/app/hooks/api/admin/useShippingMethods";
import {
  ShippingMethod,
  ShippingMethodListResponse,
} from "@/app/types/admin/shippingMethod";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { formatDateTime } from "@/app/utils/dateUtils";
import ContentCard, { FilterOption, FilterState } from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import DeleteConfirmationDialog from "@/app/components/admin/catalogue/DeleteConfirmationDialog";

// Wrapper component that provides the DrawerContext
export default function ShippingMethodsPageWrapper() {
  return (
    <DrawerProvider>
      <ShippingMethodsPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function ShippingMethodsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant as string;

  // State for view and search
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'delivery_range', 'is_active', 'created_at', 'actions' , 'updated_at'
  ]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('all');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('view');
  const drawerContext = useDrawer();
  
  // Form ref for submitting the form from outside
  const formRef = useRef<ShippingMethodFormRef | null>(null);
  
  // State for selected shipping method
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null);
  
  // Handle form submission by triggering the form submit through ref
  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };
  
  // Create and update mutations
  const { mutateAsync: createShippingMethod, isPending: isCreating } = useCreateShippingMethod();
  const { mutateAsync: updateShippingMethod, isPending: isUpdating } = useUpdateShippingMethod();
  
  // Fetch shipping method details when editing
  // We use a separate state to control when to actually fetch the data
  const fetchId = selectedId && drawerOpen ? selectedId : 0;
  const shouldFetch = !!(selectedId && drawerOpen);
  const { data: shippingMethodData, isLoading: isLoadingShippingMethod } = useShippingMethod(
    shouldFetch ? fetchId : 0
  );
  
  // Update selected shipping method when data is fetched
  useEffect(() => {
    if (shippingMethodData && selectedId && drawerOpen) {
      // Only update when we have valid data and the drawer is actually open
      setSelectedShippingMethod(shippingMethodData);
    }
  }, [shippingMethodData, selectedId, drawerOpen]);
  
  // Form submission handler
  const handleSave = async (values: ShippingMethodFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (drawerMode === 'add') {
        await createShippingMethod(values, {
          onSuccess: () => {
            showNotification({
              type: "success",
              message: t("shippingMethod.createSuccess"),
            });
            handleDrawerClose();
            refetch();
          },
          onError: (error: any) => {
            // Try to extract API error message (e.g., duplicate name)
            const apiError = error?.response?.data;
            let errorMessage = t("shippingMethod.createError");
            if (apiError && typeof apiError === 'object') {
              if (apiError.name) {
                errorMessage = apiError.name;
              } else if (typeof apiError.detail === 'string') {
                errorMessage = apiError.detail;
              }
            }
            showNotification({
              type: "error",
              message: errorMessage,
            });
            console.error('Error creating shipping method:', error);
          }
        });
      } else {
        if (selectedId) {
          await updateShippingMethod(
            { id: selectedId, ...values },
            {
              onSuccess: () => {
                showNotification({
                  type: "success",
                  message: t("shippingMethod.updateSuccess"),
                });
                handleDrawerClose();
                refetch();
              },
              onError: (error: any) => {
                // Try to extract API error message (e.g., duplicate name)
                const apiError = error?.response?.data;
                let errorMessage = t("shippingMethod.updateError");
                if (apiError && typeof apiError === 'object') {
                  if (apiError.name) {
                    errorMessage = apiError.name;
                  } else if (typeof apiError.detail === 'string') {
                    errorMessage = apiError.detail;
                  }
                }
                showNotification({
                  type: "error",
                  message: errorMessage,
                });
                console.error('Error updating shipping method:', error);
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('Error saving shipping method:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // State for filters
  const [filters, setFilters] = useState<{
    is_active?: boolean;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }>({});

  // State for pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50
  });
  
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    page_size: 50
  });

  // State for tab options with counts
  const [tabOptions, setTabOptions] = useState([
    { value: 'all', label: t('All'), count: 0 },
    { value: 'active', label: t('Active'), count: 0 },
    { value: 'inactive', label: t('Inactive'), count: 0 }
  ]);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shippingMethodToDelete, setShippingMethodToDelete] = useState<number | null>(null);

  // Notifications
  const { notification, showNotification, hideNotification } = useNotification();

  // Define options for filters and columns
  const filterOptions: FilterOption[] = [
    {
      field: 'is_active',
      label: t('Status'),
      type: 'select',
      options: [
        { value: 'true', label: t('Active') },
        { value: 'false', label: t('Inactive') }
      ]
    }
  ];

  const columnOptions = [
    { field: 'name', headerName: t('Shipping Method') },
    { field: 'delivery_range', headerName: t('Delivery Time') },
    { field: 'is_active', headerName: t('Status') },
    { field: 'created_at', headerName: t('Created At') },
    { field: 'actions', headerName: t('Actions') }
  ];

  // Effect to update API filters when search term changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
  }, [searchTerm]);
  


  // Get shipping methods with filters
  const {
    data,
    isLoading,
    refetch,
  } = useShippingMethods({
    ...filters,
    ...paginationParams,
  });

  const shippingMethodsData = data as ShippingMethodListResponse;
  
  // Process data for display
  const processedData = shippingMethodsData?.results || [];
  
  // Update tab counts when data is loaded
  useEffect(() => {
    if (shippingMethodsData?.counts) {
      setTabOptions([
        { 
          value: 'all', 
          label: t('shippingMethod.all'), 
          count: shippingMethodsData.counts.total || 0 
        },
        { 
          value: 'active', 
          label: t('shippingMethod.active'), 
          count: shippingMethodsData.counts.active || 0 
        },
        { 
          value: 'inactive', 
          label: t('shippingMethod.inactive'), 
          count: shippingMethodsData.counts.inactive || 0 
        }
      ]);
    }
  }, [shippingMethodsData, t]);

  // Delete mutation
  const deleteMutation = useDeleteShippingMethod();

  // Column definitions
  const columns: GridColDef<ShippingMethod>[] = [
    {
      field: "name",
      headerName: t("shippingMethod.name"),
      flex: 1,
      minWidth: 200,
    },
    {
      field: "delivery_range",
      headerName: t("shippingMethod.deliveryTime"),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<ShippingMethod>) => (
        <Typography variant="body2">
          {params.row.delivery_range}
        </Typography>
      ),
    },
    {
      field: "is_active",
      headerName: t("shippingMethod.status"),
      flex: 0.5,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<ShippingMethod>) => (
        <Chip 
          label={params.row.is_active ? t("shippingMethod.active") : t("shippingMethod.inactive")}
          color={params.row.is_active ? "success" : "error"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "created_at",
      headerName: t("shippingMethod.createdAt"),
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<ShippingMethod>) => (
        <Typography variant="body2">
          {params.row.created_at ? formatDateTime(params.row.created_at) : ''}
        </Typography>
      ),
    },
    {
      field: "updated_at",
      headerName: t("shippingMethod.updatedAt"),
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<ShippingMethod>) => (
        <Typography variant="body2">
          {params.row.updated_at ? formatDateTime(params.row.updated_at) : ''}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: t("shippingMethod.actions"),
      sortable: false,
      width: 150,
      renderCell: (params: GridRenderCellParams<ShippingMethod>) => (
        <Box display="flex" justifyContent="flex-end">
          <Tooltip title={t('delete')}>
            <IconButton
              color="error"
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
      ),
    },
  ];

  // Handlers
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const handleViewChange = (view: 'list' | 'grid') => {
    setViewMode(view);
  };

  const handleFilterChange = (filters: FilterState[]) => {
    // Handle filter changes
    const isActiveFilter = filters.find(f => f.field === 'is_active');
    const isActive = isActiveFilter ? isActiveFilter.value === 'true' : undefined;
    
    setFilters(prev => ({ 
      ...prev, 
      is_active: isActive,
      page: 1 // Reset to first page when filters change
    }));
    
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Apply filter based on tab
    let isActive: boolean | undefined = undefined;
    if (tab === 'active') isActive = true;
    if (tab === 'inactive') isActive = false;
    
    setFilters(prev => ({ 
      ...prev, 
      is_active: isActive,
      page: 1 // Reset to first page when tab changes
    }));
    
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  // Drawer handlers
  const handleAddClick = () => {
    setDrawerMode('add');
    setSelectedId(null);
    setSelectedShippingMethod(null);
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
  };

  const handleEdit = (id: number) => {
    setDrawerMode('edit');
    setSelectedId(id);
    setSelectedShippingMethod(null); // Reset to fetch fresh data
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
  };

  const handleView = (id: number) => {
    setDrawerMode('edit');
    setSelectedId(id);
    setSelectedShippingMethod(null); // Reset to fetch fresh data
    setIsViewMode(true);
    setActiveSidebarItem('view');
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setSelectedShippingMethod(null);
    setIsViewMode(false);
  };

  const handleDeleteClick = (id: number) => {
    setShippingMethodToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (shippingMethodToDelete) {
      try {
        await deleteMutation.mutateAsync(shippingMethodToDelete);
        showNotification({
          type: "success",
          message: t("shippingMethod.deleteSuccess"),
        });
        refetch();
      } catch (error) {
        showNotification({
          type: "error",
          message: t("shippingMethod.deleteError"),
        });
      }
      setDeleteDialogOpen(false);
      setShippingMethodToDelete(null);
    }
  };

  const handleCreateNew = () => {
    router.push(`/${tenant}/Crm/admin/shipping-methods/new`);
  };

  if (isLoading && !shippingMethodsData) {
    return <Loader />;
  }

  return (
    <>
      {/* Header with Add Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" component="h1">
          {t("shippingMethod.title")}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          {t("shippingMethod.addButton")}
        </Button>
      </Box>
      
      {/* Data grid with ContentCard and CustomDataGrid */}
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
        <CustomDataGrid
          rows={processedData}
          columns={columns.filter((col) => visibleColumns.includes(col.field))}
          paginationModel={paginationModel}
          onPaginationModelChange={(newModel) => {
            setPaginationModel(newModel);
            // Convert to API pagination (1-indexed)
            setPaginationParams({
              page: newModel.page + 1,
              page_size: newModel.pageSize,
            });
            
            // Update filters with new pagination
            setFilters(prev => ({
              ...prev,
              page: newModel.page + 1,
              page_size: newModel.pageSize
            }));
          }}
          pageSizeOptions={[ 50, 100,150]}
          rowCount={(data as ShippingMethodListResponse)?.count || 0}
          loading={isLoading}
          getRowId={(row) => row.id}
          checkboxSelection={false}
          onRowClick={(params) => handleView(params.row.id)}
          disableRowSelectionOnClick
        />
      </ContentCard>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t("Delete Shipping Method")}
        content={t("Are you sure you want to delete this shipping method?")}
      />

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />

      {/* Animated Drawer for Add/Edit/View */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={drawerMode === 'add' ? t('Add Shipping Method') : t('Edit Shipping Method')}
        initialWidth={550}
        expandedWidth={550}
        onSave={!isViewMode ? handleSubmit : undefined}
        saveDisabled={isSubmitting}
        sidebarIcons={drawerMode === 'edit' ? [
          {
            id: 'view',
            icon: <VisibilityIcon />,
            tooltip: t('View'),
            onClick: () => {
              setIsViewMode(true);
              setActiveSidebarItem('view');
              drawerContext.setActiveSidebarItem('view');
            }
          },
          {
            id: 'edit',
            icon: <EditIcon />,
            tooltip: t('Edit'),
            onClick: () => {
              setIsViewMode(false);
              setActiveSidebarItem('edit');
              drawerContext.setActiveSidebarItem('edit');
            }
          }
        ] : []}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          drawerMode === 'edit' && selectedId ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {shippingMethodData?.updated_at && 
                  `${t('lastUpdated')}: ${formatDateTime(shippingMethodData.updated_at)}`}
              </Typography>
            </Box>
          ) : undefined
        }
      >
        {(isLoadingShippingMethod && drawerMode === 'edit') ? (
          <Loader message={t('common.loading')} />
        ) : (
          <ShippingMethodForm
            ref={formRef}
            defaultValues={
              selectedShippingMethod ? {
                name: selectedShippingMethod.name,
                min_delivery_days: selectedShippingMethod.min_delivery_days || 0,
                max_delivery_days: selectedShippingMethod.max_delivery_days || 0,
                is_active: selectedShippingMethod.is_active,
                customer_group_selling_channels: selectedShippingMethod.customer_group_selling_channels || [],
                zone_restrictions: selectedShippingMethod.zone_restrictions || [],
              } : undefined
            }
            isViewMode={isViewMode}
            isEditMode={drawerMode === 'edit'}
            onSubmit={handleSave}
          />
        )}
      </AnimatedDrawer>
    </>
  );
}