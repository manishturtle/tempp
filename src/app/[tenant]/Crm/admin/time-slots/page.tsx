"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { FilterState, FilterOption } from "@/app/components/common/ContentCard";

import {
  useTimeSlots,
  useDeleteTimeSlot,
  useTimeSlot,
  useCreateTimeSlot,
  useUpdateTimeSlot
} from "@/app/hooks/api/admin/useTimeSlots";
import {
  TimeSlot,
  TimeSlotListResponse,
} from "@/app/types/admin/timeSlot";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { formatDateTime } from "@/app/utils/dateUtils";
import ContentCard from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import DeleteConfirmationDialog from "@/app/components/admin/catalogue/DeleteConfirmationDialog";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import TimeSlotForm, { TimeSlotFormRef, TimeSlotFormValues } from "./TimeSlotForm";

function TimeSlotsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant as string;
  const drawerContext = useDrawer();

  // State for view and search
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'start_time', 'end_time', 'is_active', 'created_at', 'actions', 'updated_at'
  ]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('all');
  
  // State for filters
  const [filters, setFilters] = useState<{
    is_active?: boolean;
    search?: string;
    ordering?: string;
  }>({});

  // State for pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 1,
    pageSize: 50
  });
  
  // Derived state for API pagination (1-indexed)
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    page_size: 50
  });

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timeSlotToDelete, setTimeSlotToDelete] = useState<number | null>(null);

  // Notifications
  const { notification, showNotification, hideNotification } = useNotification();
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form ref to control submission from drawer
  const formRef = useRef<TimeSlotFormRef>(null);

  // Define options for filters, columns, and tabs
  const filterOptions: FilterOption[] = [
    {
      field: 'is_active',
      label: t('timeSlot.activeOnly'),
      type: 'boolean',
      options: [
        { value: 'true', label: t('timeSlot.active') },
        { value: 'false', label: t('timeSlot.inactive') }
      ]
    },
  ];

  const columnOptions = [
    { field: 'name', headerName: t('timeSlot.name') },
    { field: 'start_time', headerName: t('timeSlot.startTime') },
    { field: 'end_time', headerName: t('timeSlot.endTime') },
    { field: 'is_active', headerName: t('timeSlot.status') },
    { field: 'created_at', headerName: t('timeSlot.createdAt') },
    { field: 'actions', headerName: t('timeSlot.actions') }
  ];

  // Initialize tab options with default counts
  const [tabOptions, setTabOptions] = useState<Array<{
    value: string;
    label: string;
    count: number;
  }>>([
    { value: 'all', label: 'All', count: 0 },
    { value: 'active', label: 'Active', count: 0 },
    { value: 'inactive', label: 'Inactive', count: 0 }
  ]);

  // Get time slots with filters and pagination
  const {
    data: timeSlotsData,
    isLoading,
    error,
    refetch,
  } = useTimeSlots({
    page: paginationParams.page,
    page_size: paginationParams.page_size,
    search: filters.search,
    is_active: filters.is_active,
    ordering: filters.ordering,
  });
  
  // Create and update mutations
  const { mutateAsync: createTimeSlot, isPending: isCreating } = useCreateTimeSlot();
  const { mutateAsync: updateTimeSlot, isPending: isUpdating } = useUpdateTimeSlot();
  
  // Fetch time slot details when editing
  // We use a separate state to control when to actually fetch the data
  const fetchId = selectedId && drawerOpen ? selectedId : 0;
  const shouldFetch = !!(selectedId && drawerOpen);
  const { data: timeSlotData, isLoading: isLoadingTimeSlot } = useTimeSlot(
    shouldFetch ? fetchId : 0
  );
  
  // Update selected time slot when data is fetched
  useEffect(() => {
    if (timeSlotData && selectedId && drawerOpen) {
      // Only update when we have valid data and the drawer is actually open
      setSelectedTimeSlot(timeSlotData);
    }
  }, [timeSlotData, selectedId, drawerOpen]);

  // Update tab counts when data is loaded
  useEffect(() => {
    if (timeSlotsData) {
      setTabOptions(prevOptions => {
        // Keep the existing labels to avoid re-renders due to translation changes
        return [
          { 
            ...prevOptions[0], 
            label: t('timeSlot.all'),
            count: timeSlotsData.counts?.total || 0 
          },
          { 
            ...prevOptions[1], 
            label: t('timeSlot.active'),
            count: timeSlotsData.counts?.active || 0 
          },
          { 
            ...prevOptions[2], 
            label: t('timeSlot.inactive'),
            count: timeSlotsData.counts?.inactive || 0 
          }
        ];
      });
    }
  }, [timeSlotsData, t]);

  // Handle API errors
  useEffect(() => {
    if (error) {
      showNotification({
        type: "error",
        message: t("timeSlot.loadError"),
      });
    }
  }, [error]);

  // Process data for display with proper typing
  const processedData: TimeSlot[] = timeSlotsData?.results || [];

  // Effect to update API filters when search term changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
  }, [searchTerm]);



  // Delete mutation
  const deleteMutation = useDeleteTimeSlot();

  // Column definitions
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("timeSlot.name"),
      flex: 1,
      minWidth: 150,
    },
    {
      field: "start_time",
      headerName: t("timeSlot.startTime"),
      flex: 1,
      minWidth: 120,
    },
    {
      field: "end_time",
      headerName: t("timeSlot.endTime"),
      flex: 1,
      minWidth: 120,
    },
    {
      field: "is_active",
      headerName: t("timeSlot.status"),
      flex: 0.5,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<TimeSlot>) => (
          <Chip
          label={params.row.is_active ? t("timeSlot.active") : t("timeSlot.inactive")}
          color={params.row.is_active ? "success" : "error"}
            size="small"
          variant="outlined"
          />
      ),
    },
    {
      field: "created_at",
      headerName: t("timeSlot.createdAt"),
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<TimeSlot>) => (
        <Typography variant="body2">
          {formatDateTime(params.row.created_at)}
        </Typography>
      ),
    },
    {
      field: "updated_at",
      headerName: t("timeSlot.updatedAt"),
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<TimeSlot>) => (
        <Typography variant="body2">
          {formatDateTime(params.row.updated_at)}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: t("timeSlot.actions"),
      sortable: false,
      flex: 0.5,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<TimeSlot>) => {
        return (
          <Stack direction="row" spacing={1}>
            <IconButton
              aria-label="delete"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteClick(params.row.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      },
    },
  ];

  // Handlers
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
    
    // Update filters with search term
    if (term.trim()) {
      setFilters(prev => ({ ...prev, search: term.trim() }));
    } else {
      // Remove search filter if empty
      const { search, ...rest } = filters;
      setFilters(rest);
    }
  };

  const handleViewChange = (view: 'list' | 'grid') => {
    setViewMode(view);
  };

  const handleFilterChange = (newFilters: FilterState[]) => {
    // Handle filter changes
    const activeFilter = newFilters.find(f => f.field === 'is_active');
    const isActive = activeFilter ? activeFilter.value : undefined;
    
    setFilters(prev => ({
      ...prev,
      is_active: isActive,
      // Preserve search term if it exists
      ...(searchTerm ? { search: searchTerm } : {})
    }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Apply filter based on tab
    let isActive: boolean | undefined = undefined;
    if (tab === 'active') isActive = true;
    if (tab === 'inactive') isActive = false;
    
    setFilters(prev => ({ ...prev, is_active: isActive }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // Form submission handler
  const handleSave = async (values: TimeSlotFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (drawerMode === 'add') {
        await createTimeSlot(values);
        showNotification({
          type: "success",
          message: t("timeSlot.createSuccess"),
        });
      } else if (drawerMode === 'edit' && selectedId) {
        await updateTimeSlot({ id: selectedId, ...values });
        showNotification({
          type: "success",
          message: t("timeSlot.updateSuccess"),
        });
      }
      
      handleDrawerClose();
      refetch();
    } catch (error) {
      showNotification({
        type: "error",
        message: t("timeSlot.saveError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drawer submission handler
  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };
  
  // Handle Add button click
  const handleAddClick = () => {
    setDrawerMode('add');
    setSelectedId(null);
    setSelectedTimeSlot(null);
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
  };

  // Handle Edit click
  const handleEdit = (id: number) => {
    setDrawerMode('edit');
    setSelectedId(id);
    setSelectedTimeSlot(null); // Reset to fetch fresh data
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    setDrawerOpen(true);
  };
  
  // Handle View click
  const handleView = (id: number) => {
    setDrawerMode('edit');
    setSelectedId(id);
    setSelectedTimeSlot(null); // Reset to fetch fresh data
    setIsViewMode(true);
    setActiveSidebarItem('view');
    setDrawerOpen(true);
  };
  
  // Close drawer
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setSelectedTimeSlot(null);
    setIsViewMode(false);
  };

  // Delete button click handler
  const handleDeleteClick = (id: number) => {
    setTimeSlotToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Delete confirmation handler
  const handleDelete = async () => {
    if (!timeSlotToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(timeSlotToDelete);
      showNotification({
        type: "success",
        message: t("timeSlot.deleteSuccess"),
      });
      refetch();
    } catch (error) {
      showNotification({
        type: "error",
        message: t("timeSlot.deleteError"),
      });
    } finally {
      setDeleteDialogOpen(false);
      setTimeSlotToDelete(null);
    }
  };

  if (isLoading && !timeSlotsData) {
    return <Loader />;
  }

  return (
    <>
      {/* Header with Add Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" component="h1">
          {t("timeSlot.title")}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          {t("timeSlot.addButton")}
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
            // The paginationParams will be derived from the new model
          }}
          pageSizeOptions={[50, 100, 200]}
          rowCount={(timeSlotsData as TimeSlotListResponse)?.count || 0}
          loading={isLoading}
          getRowId={(row) => row.id}
          checkboxSelection={false}
          onRowClick={(params) => handleView(params.id as number)}
        />
      </ContentCard>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t("timeSlot.deleteTitle")}
        message={t("timeSlot.deleteMessage")}
      />

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />

      {/* Animated Drawer */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={drawerMode === 'add' 
          ? t('timeSlot.addNewTimeSlot') 
          : isViewMode 
            ? t('timeSlot.viewTimeSlot')
            : t('timeSlot.editTimeSlot')
        }
        initialWidth={550}
        expandedWidth={550}
        onSave={!isViewMode ? handleSubmit : undefined}
        defaultSidebarItem={activeSidebarItem}
        sidebarIcons={drawerMode === 'add' ? [] : [
          {
            id: 'view',
            icon: <VisibilityIcon />,
            tooltip: t('common.view'),
            onClick: () => {
              setIsViewMode(true);
              setActiveSidebarItem('view');
              drawerContext.setActiveSidebarItem('view');
            },
          },
          {
            id: 'edit',
            icon: <EditIcon />,
            tooltip: t('common.edit'),
            onClick: () => {
              setIsViewMode(false);
              setActiveSidebarItem('edit');
              drawerContext.setActiveSidebarItem('edit');
            },
          },
        ]}
      >
        {isLoadingTimeSlot && selectedId ? (
          <Loader message={t('common.loading')} />
        ) : (
          <TimeSlotForm
            ref={formRef}
            defaultValues={selectedTimeSlot || undefined}
            onSubmit={handleSave}
            isSubmitting={isSubmitting}
            isViewMode={isViewMode}
          />
        )}
      </AnimatedDrawer>
    </>
  );
}

// Wrap the page component with DrawerProvider
function TimeSlotsPageWrapper() {
  return (
    <DrawerProvider>
      <TimeSlotsPage />
    </DrawerProvider>
  );
}

export default TimeSlotsPageWrapper;