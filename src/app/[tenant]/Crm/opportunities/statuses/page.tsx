"use client";

import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";

// MUI Icons
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

// Custom Components
import ContentCard from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import Notification from "@/app/components/common/Notification";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";

// Hooks
import useNotification from "@/app/hooks/useNotification";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";

// API Hooks
import {
  useFetchOpportunityStatuses,
  useDeleteOpportunityStatus,
  useToggleOpportunityStatusStatus,
} from "@/app/hooks/api/opportunities";

// Types
import { OpportunityStatus } from "@/app/types/opportunities";
import { FilterOption, FilterState } from "@/app/components/common/ContentCard";

// Custom Form Component
import StatusForm from "./StatusForm";
import {
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridPaginationModel,
  GridSortModel,
} from "@mui/x-data-grid";

// Main component for the opportunity statuses list page
function OpportunityStatusesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer, closeDrawer } = useDrawer();
  // Use notification hook to manage success/error messages
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Form reference for submission from drawer
  const formRef = useRef<{ submitForm: () => void } | null>(null);

  // Drawer state management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");

  // Dialog state for confirmation
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // Sidebar active item state
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>("view");

  // State for pagination, sorting, and filtering
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "name", sort: "asc" },
  ]);
  const [filters, setFilters] = useState<Record<string, any>>({
    // Not setting status by default to show all statuses
  });

  // View and filter states
  const [view, setView] = useState<"list" | "grid">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<any>([
    "name",
    "desc",
    "type",
    "status",
    "actions",
  ]);

  // State for selected status (for edit mode)
  const [selectedStatus, setSelectedStatus] = useState<OpportunityStatus | null>(
    null
  );

  // Fetch opportunity statuses using the custom hook
  const {
    data: statusesData,
    isLoading,
    isError,
  } = useFetchOpportunityStatuses({
    page: paginationModel.page + 1, // API uses 1-based indexing
    page_size: paginationModel.pageSize,
    status: filters.status,
    ordering:
      sortModel.length > 0
        ? sortModel[0].sort === "desc"
          ? `-${sortModel[0].field}`
          : sortModel[0].field
        : undefined,
    search: searchTerm || undefined,
  });

  // Mutation for toggling active status
  const toggleActiveMutation = useToggleOpportunityStatusStatus();

  // Handler for toggling active status
  const handleToggleActive = useCallback(
    (id: string | number, status: boolean) => {
      toggleActiveMutation.mutate({ id, status });
    },
    [toggleActiveMutation]
  );

  // Mutation for deleting a status
  const deleteOpportunityStatus = useDeleteOpportunityStatus();

  // Handle delete button click
  const handleDelete = useCallback((id: string) => {
    setConfirmDelete({ open: true, id });
  }, []);

  // Handler for delete confirmation
  const confirmDeleteAction = useCallback(() => {
    if (confirmDelete.id) {
      deleteOpportunityStatus.mutate(confirmDelete.id, {
        onSuccess: () => {
          setConfirmDelete({ open: false, id: null });
          showSuccess(t("statusForm.deleteSuccess"));
        },
        onError: () => {
          showError(t("statusForm.deleteError"));
        },
      });
    }
  }, [confirmDelete.id, deleteOpportunityStatus, showSuccess, showError, t]);

  // Handler for search from ContentCard
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle view change from ContentCard
  const handleViewChange = useCallback((newView: "list" | "grid") => {
    setView(newView);
  }, []);

  // Handle tab change from ContentCard
  const handleTabChange = useCallback(
    (newTab: string) => {
      // Update filters based on tab
      const newFilters = { ...filters };

      switch (newTab) {
        case "active":
          newFilters.status = true;
          break;
        case "inactive":
          newFilters.status = false;
          break;
        default: // 'all'
          delete newFilters.status;
          break;
      }

      setFilters(newFilters);
    },
    [filters]
  );

  // Handler for editing a status
  const handleEdit = useCallback((status: OpportunityStatus) => {
    setSelectedStatus(status);
    setDrawerMode("edit");
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);

  // Handler for viewing a status
  const handleView = useCallback((status: OpportunityStatus) => {
    setSelectedStatus(status);
    setDrawerMode("edit");
    setIsViewMode(true);
    setDrawerOpen(true);
    setActiveSidebarItem("view");
  }, []);

  // Handler for creating a new status
  const handleCreate = useCallback(() => {
    setSelectedStatus(null);
    setDrawerMode("add");
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);

  // Handler for drawer close
  const handleDrawerClose = useCallback(() => {
    setSelectedStatus(null);
    setDrawerOpen(false);
  }, []);

  // Handler for form submission
  const handleFormSubmit = useCallback(() => {
    // Form submission is handled in the form component
    // Just close the drawer here
    setDrawerOpen(false);
    // Show success notification
    showSuccess(t("statusForm.saveSuccess"));
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ["opportunityStatuses"] });
  }, [queryClient, showSuccess, t]);

  // Handle form save
  const handleSave = useCallback(() => {
    if (formRef.current) {
      formRef.current.submitForm();
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filterStates: FilterState[]) => {
    const newFilters: Record<string, any> = {};

    filterStates.forEach((filter) => {
      if (filter.field === "status" && filter.value) {
        // Convert string 'true'/'false' to boolean for status
        newFilters[filter.field] = filter.value === "true";
      } else {
        newFilters[filter.field] = filter.value;
      }
    });

    setFilters(newFilters);
  }, []);

  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: "status",
      label: t("statusFields.status"),
      type: "select",
      options: [
        { value: "", label: t("filterStatuses.all") },
        { value: "true", label: t("filterStatuses.active") },
        { value: "false", label: t("filterStatuses.inactive") },
      ],
    },
  ];

  // Column options for ContentCard
  const columnOptions = [
    { field: "name", headerName: t("statusFields.name") },
    { field: "desc", headerName: t("statusFields.description") },
    { field: "type", headerName: t("statusFields.type") },
    { field: "status", headerName: t("statusFields.status") },
    { field: "actions", headerName: t("common.actions") },
  ];

  // Calculate active and inactive counts from results
  const activeStatusesCount = React.useMemo(() => {
    return statusesData?.results?.filter((status) => status.status).length || 0;
  }, [statusesData?.results]);

  const inactiveStatusesCount = React.useMemo(() => {
    return statusesData?.results?.filter((status) => !status.status).length || 0;
  }, [statusesData?.results]);

  // Tab options for ContentCard
  const tabOptions = [
    {
      value: "all",
      label: t("filterStatuses.all"),
      count: statusesData?.count || 0,
    },
    {
      value: "active",
      label: t("filterStatuses.active"),
      count: activeStatusesCount,
    },
    {
      value: "inactive",
      label: t("filterStatuses.inactive"),
      count: inactiveStatusesCount,
    },
  ];

  // Sidebar icons for AnimatedDrawer
  const drawerSidebarIcons = [
    {
      id: "view",
      icon: <VisibilityIcon />,
      tooltip: t("common.view"),
    },
    {
      id: "edit",
      icon: <EditIcon />,
      tooltip: t("common.edit"),
      onClick: () => setIsViewMode(false),
    },
  ];

  // Column definitions for DataGrid
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("statusFields.name"),
      flex: 1,
      minWidth: 200,
    },
    {
      field: "desc",
      headerName: t("statusFields.description"),
      flex: 2,
      minWidth: 250,
    },
    {
      field: "type",
      headerName: t("statusFields.type"),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        const type = params.value as string;
        if (type === "OPEN") return "Open";
        if (type === "CLOSED_WON") return "Closed Won";
        if (type === "CLOSED_LOST") return "Closed Lost";
        return type; // Return original value if not matching any condition
      },
    },
    {
      field: "status",
      headerName: t("statusFields.status"),
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const isActive = params.value as boolean;
        return (
          <Chip
            label={isActive ? t("common.active") : t("common.inactive")}
            color={isActive ? "success" : "error"}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("common.actions.actions"),
      type: "actions",
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        return (
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click
              handleDelete(params.row.id);
            }}
            aria-label={t("delete")}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      },
    },
  ];

  // Handle row selection on the grid
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  // No longer need getCurrentTab as we use inline expression in ContentCard

  return (
    <Box>
      {/* Page Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {t("statusList.title", "Opportunity Statuses")}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t("statusList.newButton", "New Status")}
        </Button>
      </Box>
      
      {/* Main Content */}
      <ContentCard
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onColumnsChange={setVisibleColumns}
        onTabChange={handleTabChange}
        columnOptions={columnOptions}
        activeTab={
          filters.status === true
            ? "active"
            : filters.status === false
            ? "inactive"
            : "all"
        }
        tabOptions={tabOptions}
      >
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : view === "list" ? (
          <CustomDataGrid
            rows={statusesData?.results || []}
            columns={columns.filter((col) =>
              visibleColumns.includes(col.field)
            )}
            rowCount={statusesData?.count || 0}
            loading={isLoading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row: any) => row.id}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection: GridRowSelectionModel) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={(params: any) => {
              handleView(params.row as OpportunityStatus);
            }}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t("statusList.gridViewNotImplemented", "Grid view not implemented")}
            </Typography>
          </Box>
        )}
      </ContentCard>

      {/* Create/Edit Drawer */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={
          isViewMode
            ? t("statusForm.viewTitle", "View Status")
            : drawerMode === "add"
            ? t("statusForm.createTitle", "Create Status")
            : t("statusForm.editTitle", "Edit Status")
        }
        onSave={isViewMode ? undefined : handleSave}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerMode !== "add" ? drawerSidebarIcons : undefined}
        defaultSidebarItem={
          drawerMode !== "add" ? activeSidebarItem : undefined
        }
      >
        <StatusForm
          ref={formRef}
          initialData={selectedStatus}
          onSubmit={handleFormSubmit}
          isViewMode={isViewMode}
        />
      </AnimatedDrawer>

      <ConfirmDialog
        open={confirmDelete.open}
        title={t("statusForm.deleteTitle", "Delete Status")}
        content={t("statusForm.deleteConfirmation", "Are you sure you want to delete this status?")}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
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

// Wrapper component that provides the DrawerContext
export default function OpportunityStatusesPageWrapper() {
  return (
    <DrawerProvider>
      <OpportunityStatusesPage />
    </DrawerProvider>
  );
}
