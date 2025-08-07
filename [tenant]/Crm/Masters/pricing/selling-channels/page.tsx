"use client";

/**
 * Selling Channels Listing Page
 * 
 * Page component for listing, filtering, and managing selling channels
 */
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  Tooltip,
  Paper,
  
} from "@mui/material";
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import ContentCard, { FilterOption, FilterState } from "@/app/components/common/ContentCard";

import { useTranslation } from "react-i18next";
import { useQueryClient } from '@tanstack/react-query';
import {
  useFetchSellingChannels,
  useCreateSellingChannel,
  useUpdateSellingChannel,
  useDeleteSellingChannel,
  useFetchSellingChannel
} from "@/app/hooks/api/pricing";
import { SellingChannel, User } from "@/app/types/pricing";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { formatDateTime } from "@/app/utils/dateUtils";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import SellingChannelForm, { SellingChannelFormRef } from "@/app/components/admin/pricing/forms/SellingChannelForm";
import { SellingChannelFormValues } from "@/app/components/admin/pricing/schemas";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import CircularProgress from '@mui/material/CircularProgress';
import api from "@/lib/api";
import { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";

// Processed type for DataGrid display
interface ProcessedSellingChannel extends SellingChannel {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
  statusText: string;
}

// Wrapper component that provides the DrawerContext
export default function SellingChannelsPageWrapper() {
  return (
    <DrawerProvider>
      <SellingChannelsPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function SellingChannelsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);

  // Notification state
  const { 
    notification, 
    showNotification, 
    hideNotification 
  } = useNotification();
  
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: number | null;
  }>({
    open: false,
    id: null,
  });

  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'code', 'description', 'statusText', 'formattedCreatedAt', 
    'createdByUsername', 'formattedUpdatedAt', 'updatedByUsername', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');

  const queryClient = useQueryClient();
  const { data: sellingChannelsData, isLoading: isSellingChannelsLoading } = useFetchSellingChannels({
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    is_active: activeTab === 'all' ? undefined : activeTab === 'active'
  });
  const { data: selectedChannel, isLoading: isLoadingChannel, refetch: refetchSelectedChannel } = useFetchSellingChannel(selectedChannelId || 0, {
    enabled: !!selectedChannelId && drawerMode === 'edit',
    refetchOnWindowFocus: false,
    staleTime: 0 // Disable caching to ensure fresh data
  });
  const { mutate: deleteSellingChannel, isPending: isDeleting } = useDeleteSellingChannel();
  const { mutate: createSellingChannel, isPending: isCreating } = useCreateSellingChannel();
  const { mutate: updateSellingChannel, isPending: isUpdating } = useUpdateSellingChannel();

  // State for selected rows
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  // Pagination handler
  const handlePaginationModelChange = (model: any) => {
    setPaginationModel(model);
    // No need to manually refetch - the query will automatically refetch
    // when the paginationModel changes
  };

  // State for drawer mode (view/edit)
  const [isViewMode, setIsViewMode] = useState(false);

  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');

  // State for loading
  const [isLoading, setIsLoading] = useState(false);

  // Toggle between view and edit mode
  const toggleViewMode = () => {
    setIsViewMode(!isViewMode);
  };

  // Open drawer for adding a new selling channel
  const handleOpenAddDrawer = () => {
    setSelectedChannelId(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setActiveSidebarItem('edit');
    // Remove context update to prevent loops
    setDrawerOpen(true);
    drawerContext.openDrawer('add');
    drawerContext.updateFormData({});
  };

  // Open drawer for editing a selling channel
  const handleOpenEditDrawer = (id: number) => {
    // Prevent multiple calls if already loading or if the same channel is already selected
    if (isLoading || (selectedChannelId === id && drawerOpen)) {
      return;
    }
    
    // Set loading state first
    setIsLoading(true);
    
    // Set the ID and mode
    setSelectedChannelId(id);
    setDrawerMode('edit');
    setIsViewMode(true); // Set to true initially since we're setting activeSidebarItem to 'view'
    setActiveSidebarItem('view');
    
    // First fetch the data, then open the drawer
    // We need to create a new instance of the query with the correct ID
    const fetchChannel = async () => {
      try {
        const response = await api.get<SellingChannel>(
          apiEndpoints.pricing.sellingChannels.detail(id),
          { headers: getAuthHeaders() }
        );
        if (response.data) {
          // Open drawer and update context with the fetched data
          setDrawerOpen(true);
          drawerContext.openDrawer('edit');
          // Remove context update to prevent loops
          drawerContext.updateFormData(response.data);
        } else {
          // Handle case where data wasn't fetched successfully
          showNotification({
            title: t('error', 'Error'),
            message: t('error', 'Failed to load selling channel data'),
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Error fetching selling channel:', error);
        showNotification({
          title: t('error', 'Error'),
          message: t('error', 'Failed to load selling channel data'),
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChannel();
  };

  // Close drawer
  const closeDrawer = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
    setSelectedChannelId(null);
  };

  // Handle form submission for creating/editing
  const handleSubmit = async (data: SellingChannelFormValues) => {
    try {
      setIsLoading(true);
      
      if (drawerMode === 'add') {
        // Create a properly typed object for the API call
        const submitData = {
          name: data.name,
          code: data.code,
          description: data.description || '',
          is_active: true // Default for new channels
        };
        
        createSellingChannel(submitData, {
          onSuccess: () => {
            showNotification({
              title: t('success', 'Success'),
              message: t('pricing.sellingChannel.createSuccess', 'Selling channel created successfully'),
              type: 'success'
            });
            // Close drawer and invalidate the query to trigger a refetch
            closeDrawer();
            queryClient.invalidateQueries({ queryKey: ['sellingChannels'] });
          },
          onError: (error: any) => {
            console.error('Error creating selling channel:', error);
            showNotification({
              title: t('error', 'Error'),
              message: error?.message || t('error', 'An error occurred'),
              type: 'error'
            });
          },
          onSettled: () => {
            setIsLoading(false);
          }
        });
      } else {
        // Create update data with id from selectedChannel and form values
        const updateData = {
          id: selectedChannelId || 0,
          name: data.name,
          code: data.code,
          description: data.description || '',
          is_active: data.is_active
        };
        
        updateSellingChannel(updateData, {
          onSuccess: () => {
            showNotification({
              title: t('success', 'Success'),
              message: t('pricing.sellingChannel.updateSuccess', 'Selling channel updated successfully'),
              type: 'success'
            });
            // Close drawer and invalidate the query to trigger a refetch
            closeDrawer();
            queryClient.invalidateQueries({ queryKey: ['sellingChannels'] });
          },
          onError: (error: any) => {
            console.error('Error updating selling channel:', error);
            showNotification({
              title: t('error', 'Error'),
              message: error?.message || t('error', 'An error occurred'),
              type: 'error'
            });
          },
          onSettled: () => {
            setIsLoading(false);
          }
        });
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      showNotification({
        title: t('error', 'Error'),
        message: error instanceof Error ? error.message : t('error', 'An error occurred'),
        type: 'error'
      });
      setIsLoading(false);
    }
  };

  const formRef = useRef<SellingChannelFormRef>(null);

  // Handle save button click in drawer footer
  const handleSave = () => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  };

  // Handle row click
  const handleRowClick = (params: any) => {
    handleOpenEditDrawer(params.row.id);
  };

  // Filter options for the ContentCard
  const filterOptions: FilterOption[] = [
    { 
      field: 'name', 
      label: 'Name', 
      type: 'text' 
    },
    { 
      field: 'code', 
      label: 'Code', 
      type: 'text' 
    },
    { 
      field: 'description', 
      label: 'Description', 
      type: 'text' 
    },
    { 
      field: 'is_active', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    { 
      field: 'created_at', 
      label: 'Created At', 
      type: 'date' 
    },
    { 
      field: 'updated_at', 
      label: 'Updated At', 
      type: 'date' 
    }
  ];

  // Column options for the ContentCard
  const columnOptions = [
    { field: 'id', headerName: 'ID' },
    { field: 'name', headerName: 'Name' },
    { field: 'code', headerName: 'Code' },
    { field: 'description', headerName: 'Description' },
    { field: 'statusText', headerName: 'Status' },
    { field: 'formattedCreatedAt', headerName: 'Created At' },
    { field: 'createdByUsername', headerName: 'Created By' },
    { field: 'formattedUpdatedAt', headerName: 'Updated At' },
    { field: 'updatedByUsername', headerName: 'Updated By' },
    { field: 'actions', headerName: 'Actions' }
  ];

  // Process data for display
  const processedData = useMemo(() => {
    if (!sellingChannelsData || !sellingChannelsData.results) return [];
    
    return sellingChannelsData.results.map((channel: SellingChannel) => ({
      ...channel,
      formattedCreatedAt: formatDateTime(channel.created_at),
      formattedUpdatedAt: formatDateTime(channel.updated_at),
      createdByUsername: channel.created_by?.username || 'System',
      updatedByUsername: channel.updated_by?.username || 'System',
      statusText: channel.is_active ? 'Active' : 'Inactive'
    })) as ProcessedSellingChannel[];
  }, [sellingChannelsData]);

  // Apply all filters to the data
  const filteredData = useMemo(() => {
    let filtered = processedData;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(channel => 
        channel.name.toLowerCase().includes(lowerCaseSearch) ||
        channel.code.toLowerCase().includes(lowerCaseSearch) ||
        (channel.description && channel.description.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Apply date filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(channel => {
        const createdAt = new Date(channel.created_at);
        return createdAt >= dateRange.start! && createdAt <= dateRange.end!;
      });
    }
    
    // Apply advanced filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(channel => {
        return activeFilters.every(filter => {
          const value = channel[filter.field as keyof ProcessedSellingChannel];
          
          // Handle different filter types
          switch (filter.operator) {
            case 'equals':
              if (filter.field === 'is_active') {
                // Convert filter.value to boolean properly
                const boolValue = filter.value === true || filter.value === 'true';
                return channel.is_active === boolValue;
              }
              return String(value).toLowerCase() === String(filter.value).toLowerCase();
            case 'contains':
              return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'startsWith':
              return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
            case 'endsWith':
              return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
            case 'greaterThan':
              if (typeof value === 'number') {
                return value > Number(filter.value);
              }
              return false;
            case 'lessThan':
              if (typeof value === 'number') {
                return value < Number(filter.value);
              }
              return false;
            case 'before':
              try {
                const dateValue = value ? new Date(value as string) : null;
                const filterDate = filter.value ? new Date(filter.value) : null;
                return dateValue && filterDate ? dateValue < filterDate : false;
              } catch (error) {
                console.error('Error comparing dates:', error);
                return false;
              }
            case 'after':
              try {
                const dateValue = value ? new Date(value as string) : null;
                const filterDate = filter.value ? new Date(filter.value) : null;
                return dateValue && filterDate ? dateValue > filterDate : false;
              } catch (error) {
                console.error('Error comparing dates:', error);
                return false;
              }
            case 'between':
              try {
                if (typeof filter.value === 'object' && filter.value.start && filter.value.end) {
                  const dateValue = value ? new Date(value as string) : null;
                  const startDate = new Date(filter.value.start);
                  const endDate = new Date(filter.value.end);
                  return dateValue ? (dateValue >= startDate && dateValue <= endDate) : false;
                }
                return false;
              } catch (error) {
                console.error('Error comparing date ranges:', error);
                return false;
              }
            case 'notEquals':
              return String(value).toLowerCase() !== String(filter.value).toLowerCase();
            default:
              return true;
          }
        });
      });
    }
    
    return filtered;
  }, [processedData, searchTerm, dateRange, activeFilters]);

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
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    // Reset to first page when changing tabs
    setPaginationModel(prev => ({
      ...prev,
      page: 0
    }));
    // No need to manually refetch - the query will automatically refetch
    // when the paginationModel or activeTab changes
  };

  const handleEdit = (id: number) => {
    handleOpenEditDrawer(id);
  };

  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete.id) {
      deleteSellingChannel(confirmDelete.id, {
        onSuccess: () => {
          showNotification({
            title: t('success', 'Success'),
            message: t("pricing.sellingChannel.deleteSuccess", "Selling channel deleted successfully"),
            type: 'success'
          });
          setConfirmDelete({ open: false, id: null });
          queryClient.invalidateQueries({ queryKey: ['sellingChannels'] });
        },
        onError: (error) => {
          console.error('Error deleting selling channel:', error);
          showNotification({
            title: t('error', 'Error'),
            message: error instanceof Error ? error.message : t("pricing.sellingChannel.deleteError", "Failed to delete selling channel"),
            type: 'error'
          });
          setConfirmDelete({ open: false, id: null });
        }
      });
    }
  };

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
        tooltip: 'View', 
        onClick: () => {
          console.log('View icon clicked');
          setIsViewMode(true);
          setDrawerMode('edit');
          setActiveSidebarItem('view');
          drawerContext.setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: 'Edit', 
        onClick: () => {
          console.log('Edit icon clicked');
          setIsViewMode(false);
          setDrawerMode('edit');
          setActiveSidebarItem('edit');
          drawerContext.setActiveSidebarItem('edit');
        }
      }
    ];
  }, [drawerMode]);

  const drawerSidebarContent = {};


  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
  
    { field: "name", headerName: "Name", flex: 1 },
    { field: "code", headerName: "Code", width: 120 },
    { field: "description", headerName: "Description", width: 200 },
    { 
      field: "statusText", 
      headerName: "Status", 
      width: 120,
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
      field: "formattedCreatedAt",
      headerName: "createdAt",
      width: 180,
    },
    {
      field: "createdByUsername",
      headerName: "createdBy",
      width: 150,
    },
    {
      field: "formattedUpdatedAt",
      headerName: "updatedAt",
      width: 180,
    },
    {
      field: "updatedByUsername",
      headerName: "updatedBy",
      width: 150,
    },
    {
      field: "actions",
      headerName: "actions",
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ProcessedSellingChannel>) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleDelete(params.row.id)
                          }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Calculate counts for tabs from API response
  const tabCounts = useMemo(() => {
    if (!sellingChannelsData) return { all: 0, active: 0, inactive: 0 };
    
    return {
      all: sellingChannelsData.counts?.total || 0,
      active: sellingChannelsData.counts?.active || 0,
      inactive: sellingChannelsData.counts?.inactive || 0
    };
  }, [sellingChannelsData]);

  // Tab options for ContentCard
  const tabOptions = [
    { value: 'all', label: 'All', count: tabCounts.all },
    { value: 'active', label: 'Active', count: tabCounts.active },
    { value: 'inactive', label: 'Inactive', count: tabCounts.inactive }
  ];

  useEffect(() => {
    // Add custom CSS for clickable rows
    const style = document.createElement('style');
    style.innerHTML = `
      .clickable-rows .MuiDataGrid-row {
        cursor: pointer;
      }
      .clickable-rows .MuiDataGrid-row:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (isSellingChannelsLoading || isLoadingChannel) return <Loader />;

  return (
    <Box >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t( 'Selling Channels')}
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
            rows={processedData}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[5, 10, 25]}
            checkboxSelection={true}
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            autoHeight
            loading={isLoading || isSellingChannelsLoading}
            rowCount={sellingChannelsData?.count || 0}
          />
        ) : (
          // Grid view implementation
          <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            {filteredData.length > 0 ? (
              filteredData.map((channel) => (
                <Paper
                  key={channel.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {channel.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(channel.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(channel.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Code
                    </Typography>
                    <Typography variant="body2">
                      {channel.code}
                    </Typography>
                  </Box>
                  
                  {channel.description && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {channel.description}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Created: {channel.formattedCreatedAt}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1, 
                        bgcolor: channel.is_active ? 'success.light' : 'error.light',
                        color: 'white'
                      }}
                    >
                      {channel.statusText}
                    </Typography>
                  </Box>
                </Paper>
              ))
            ) : (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ gridColumn: '1 / -1' }}>
                No selling channels found
              </Typography>
            )}
          </Box>
        )}
      </ContentCard>
      
      <ConfirmDialog
        open={confirmDelete.open}
        title={t("pricing.sellingChannel.deleteTitle", "Delete Selling Channel")}
        content={t(
          "pricing.sellingChannel.deleteConfirm",
          "Are you sure you want to delete this selling channel? This action cannot be undone."
        )}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        isLoading={isDeleting}
      />

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />

      {/* Animated Drawer for Add/Edit */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === 'add' 
          ? t('Add Selling Channel') 
          : t('Edit Selling Channel')}
        onSave={!isViewMode && !isLoading ? handleSave : undefined}
        saveDisabled={isCreating || isUpdating || isLoading}
        disableBackdropClick={true}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerSidebarIcons}
        sidebarContent={drawerSidebarContent}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {drawerMode === 'edit' && selectedChannel && (
              <Typography variant="caption" color="text.secondary">
                {t('lastUpdated', 'Last updated')}: {formatDateTime(selectedChannel.updated_at)}
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
          <SellingChannelForm
            ref={formRef}
            onSubmit={handleSubmit}
            defaultValues={selectedChannel || {}}
            isEditMode={drawerMode === 'edit'}
            isLoading={isCreating || isUpdating}
            isViewMode={isViewMode}
          />
        )}
      </AnimatedDrawer>
    </Box>
  );
}
