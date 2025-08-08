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

// MUI Icons
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

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
  useFetchOpportunityRoles,
  useDeleteOpportunityRole,
  useToggleOpportunityRoleStatus,
} from "@/app/hooks/api/opportunities";

// Types
import { OpportunityRole } from "@/app/types/opportunities";
import { FilterOption, FilterState } from "@/app/components/common/ContentCard";

// Custom Form Component
import RoleForm from "./RoleForm";
import {
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridPaginationModel,
  GridSortModel,
} from "@mui/x-data-grid";

// Main component for the opportunity roles list page
function OpportunityRolesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer, closeDrawer } = useDrawer();
  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [isViewMode, setIsViewMode] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);

  // State for active sidebar item
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
    // Not setting status by default to show all roles
  });

  // View and filter states
  const [view, setView] = useState<"list" | "grid">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<any>([
    "name",
    "desc",
    "status",
    "actions",
  ]);

  // State for selected role (for edit mode)
  const [selectedRole, setSelectedRole] = useState<OpportunityRole | null>(
    null
  );

  // Fetch opportunity roles using the custom hook
  const {
    data: rolesData,
    isLoading,
    isError,
  } = useFetchOpportunityRoles({
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
  const toggleActiveMutation = useToggleOpportunityRoleStatus();

  // Handler for toggling active status
  const handleToggleActive = useCallback(
    (id: string | number, status: boolean) => {
      toggleActiveMutation.mutate({ id, status });
    },
    [toggleActiveMutation]
  );

  // Mutation for deleting a role
  const deleteOpportunityRole = useDeleteOpportunityRole();

  // Handle delete button click
  const handleDelete = useCallback((id: string) => {
    setConfirmDelete({ open: true, id });
  }, []);

  // Handler for delete confirmation
  const confirmDeleteAction = useCallback(() => {
    if (confirmDelete.id) {
      deleteOpportunityRole.mutate(confirmDelete.id, {
        onSuccess: () => {
          setConfirmDelete({ open: false, id: null });
          showSuccess(t("roleForm.deleteSuccess"));
        },
        onError: () => {
          showError(t("roleForm.deleteError"));
        },
      });
    }
  }, [confirmDelete.id, deleteOpportunityRole, showSuccess, showError, t]);

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

  // Handler for editing a role
  const handleEdit = useCallback((role: OpportunityRole) => {
    setSelectedRole(role);
    setDrawerMode("edit");
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);

  // Handler for viewing a role
  const handleView = useCallback((role: OpportunityRole) => {
    setSelectedRole(role);
    setDrawerMode("edit");
    setIsViewMode(true);
    setDrawerOpen(true);
    setActiveSidebarItem("view");
  }, []);

  // Handler for creating a new role
  const handleCreate = useCallback(() => {
    setSelectedRole(null);
    setDrawerMode("add");
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);

  // Handler for drawer close
  const handleDrawerClose = useCallback(() => {
    setSelectedRole(null);
    setDrawerOpen(false);
  }, []);

  // Handler for form submission
  const handleFormSubmit = useCallback(() => {
    // Form submission is handled in the form component
    // Just close the drawer here
    setDrawerOpen(false);
    // Show success notification
    showSuccess(t("roleForm.saveSuccess"));
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ["opportunityRoles"] });
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
      label: t("roleFields.status"),
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
    { field: "name", headerName: t("roleFields.name") },
    { field: "desc", headerName: t("roleFields.description") },
    { field: "status", headerName: t("roleFields.status") },
    { field: "actions", headerName: t("common.actions") },
  ];

  // Calculate active and inactive counts from results
  const activeRolesCount = React.useMemo(() => {
    return rolesData?.results?.filter((role) => role.status).length || 0;
  }, [rolesData?.results]);

  const inactiveRolesCount = React.useMemo(() => {
    return rolesData?.results?.filter((role) => !role.status).length || 0;
  }, [rolesData?.results]);

  // Tab options for ContentCard
  const tabOptions = [
    {
      value: "all",
      label: t("filterStatuses.all"),
      count: rolesData?.count || 0,
    },
    {
      value: "active",
      label: t("filterStatuses.active"),
      count: activeRolesCount,
    },
    {
      value: "inactive",
      label: t("filterStatuses.inactive"),
      count: inactiveRolesCount,
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
      headerName: t("roleFields.name"),
      flex: 1,
      minWidth: 200,
    },
    {
      field: "desc",
      headerName: t("roleFields.description"),
      flex: 2,
      minWidth: 250,
    },
    {
      field: "status",
      headerName: t("roleFields.status"),
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
          {t("roleList.title", "Opportunity Roles")}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t("roleList.newButton", "New Role")}
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
            rows={rolesData?.results || []}
            columns={columns.filter((col) =>
              visibleColumns.includes(col.field)
            )}
            rowCount={rolesData?.count || 0}
            loading={isLoading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            getRowId={(row: any) => row.id}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(
              newSelection: GridRowSelectionModel
            ) => {
              setRowSelectionModel(newSelection);
            }}
            onRowClick={(params: any) => {
              handleView(params.row as OpportunityRole);
            }}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t(
                "roleList.gridViewNotImplemented",
                "Grid view not implemented"
              )}
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
            ? t("roleForm.viewTitle", "View Role")
            : drawerMode === "add"
            ? t("roleForm.createTitle", "Create Role")
            : t("roleForm.editTitle", "Edit Role")
        }
        onSave={isViewMode ? undefined : handleSave}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerMode !== "add" ? drawerSidebarIcons : undefined}
        defaultSidebarItem={
          drawerMode !== "add" ? activeSidebarItem : undefined
        }
      >
        <RoleForm
          ref={formRef}
          initialData={selectedRole}
          onSubmit={handleFormSubmit}
          isViewMode={isViewMode}
        />
      </AnimatedDrawer>

      <ConfirmDialog
        open={confirmDelete.open}
        title={t("roleForm.deleteTitle", "Delete Role")}
        content={t(
          "roleForm.deleteConfirmation",
          "Are you sure you want to delete this role?"
        )}
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
export default function OpportunityRolesPageWrapper() {
  return (
    <DrawerProvider>
      <OpportunityRolesPage />
    </DrawerProvider>
  );
}
