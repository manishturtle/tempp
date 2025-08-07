"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Chip,
  IconButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DrawerProvider } from "@/app/contexts/DrawerContext";
import AddIcon from "@mui/icons-material/Add";
import ContentCard, {
  FilterOption,
  FilterState,
} from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  GridColDef,
  GridSortModel,
  GridPaginationModel,
  GridRowSelectionModel,
  GridRenderCellParams,
  GridRowParams,
} from "@mui/x-data-grid";
import {
  useFetchOpportunities,
  useDeleteOpportunity,
} from "@/app/hooks/api/opportunities";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { useParams } from "next/navigation";
// Wrapper component that provides the DrawerContext
export default function OpportunitiesPageWrapper() {
  return (
    <DrawerProvider>
      <OpportunitiesPage />
    </DrawerProvider>
  );
}

// Main component for the opportunities list page
function OpportunitiesPage() {
  const { t } = useTranslation();
  const params = useParams();
  const tenant = params?.tenant as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  // Local state for confirmation dialog
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // State for pagination, sorting, and filtering
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "name", sort: "asc" },
  ]);
  const [filters, setFilters] = useState<Record<string, any>>({
    // Not setting is_active by default to show all opportunities
  });

  // View and filter states
  const [view, setView] = useState<"list" | "grid">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "name",
    "account",
    "amount",
    "close_date",
    "owner",
    "actions",
  ]);

  // Fetch opportunities using the custom hook
  const {
    data: opportunitiesData,
    isLoading,
    isError,
  } = useFetchOpportunities({
    page: paginationModel.page + 1, // API uses 1-based indexing
    page_size: paginationModel.pageSize,
    ordering:
      sortModel.length > 0
        ? sortModel[0].sort === "desc"
          ? `-${sortModel[0].field}`
          : sortModel[0].field
        : undefined,
  });

  // Mutation for deleting an opportunity
  const deleteOpportunity = useDeleteOpportunity();

  // Handle delete button click
  const handleDelete = useCallback((id: string) => {
    setConfirmDelete({ open: true, id });
  }, []);

  // Handler for delete confirmation
  const confirmDeleteAction = useCallback(() => {
    if (confirmDelete.id) {
      deleteOpportunity.mutate(confirmDelete.id, {
        onSuccess: () => {
          setConfirmDelete({ open: false, id: null });
          showSuccess(
            t(
              "opportunitiesPage.deleteSuccess",
              "Opportunity deleted successfully"
            )
          );
        },
        onError: () => {
          showError(
            t("opportunitiesPage.deleteError", "Error deleting opportunity")
          );
        },
      });
    }
  }, [confirmDelete.id, deleteOpportunity, showSuccess, showError, t]);

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
          newFilters.is_active = true;
          break;
        case "inactive":
          newFilters.is_active = false;
          break;
        default: // 'all'
          delete newFilters.is_active;
          break;
      }

      setFilters(newFilters);
    },
    [filters]
  );

  const handleCreate = useCallback(() => {
    router.push(`/${tenant}/Crm/opportunities/form?mode=create`);
  }, [router]);

  // Handle row click to navigate to view mode
  const handleRowClick = useCallback(
    (params: GridRowParams) => {
      router.push(
        `/${tenant}/Crm/opportunities/form?id=${params.id}&mode=view`
      );
    },
    [router]
  );

  // Handler for editing an opportunity
  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/${tenant}/Crm/opportunities/form?id=${id}&mode=edit`);
    },
    [router]
  );

  // Handle filter changes
  const handleFilterChange = useCallback((filterStates: FilterState[]) => {
    const newFilters: Record<string, any> = {};

    filterStates.forEach((filter) => {
      if (filter.field === "is_active" && filter.value) {
        // Convert string 'true'/'false' to boolean for is_active
        newFilters[filter.field] = filter.value === "true";
      } else if (
        filter.field === "stage_id" ||
        filter.field === "account_id" ||
        filter.field === "owner"
      ) {
        // Handle numeric values
        if (filter.value) {
          newFilters[filter.field] = filter.value;
        }
      } else {
        newFilters[filter.field] = filter.value;
      }
    });

    setFilters(newFilters);
  }, []);

  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: "is_active",
      label: t("opportunityFields.isActive", "Status"),
      type: "select",
      options: [
        { value: "", label: t("filterStatuses.all", "All") },
        { value: "true", label: t("filterStatuses.active", "Active") },
        { value: "false", label: t("filterStatuses.inactive", "Inactive") },
      ],
    },
  ];

  // Column options for ContentCard
  const columnOptions = [
    { field: "name", headerName: t("opportunityFields.name", "Name") },
    { field: "account", headerName: t("opportunityFields.account", "Account") },
    { field: "amount", headerName: t("opportunityFields.amount", "Amount") },
    {
      field: "close_date",
      headerName: t("opportunityFields.closeDate", "Close Date"),
    },
    { field: "owner", headerName: t("opportunityFields.owner", "Owner") },
    { field: "actions", headerName: t("common.actions", "Actions") },
  ];

  // Calculate active and inactive counts from results
  const activeOpportunitiesCount = React.useMemo(() => {
    return (
      opportunitiesData?.results?.filter((opportunity: any) => opportunity.is_active)
        .length || 0
    );
  }, [opportunitiesData?.results]);

  const inactiveOpportunitiesCount = React.useMemo(() => {
    return (
      opportunitiesData?.results?.filter(
        (opportunity: any) => !opportunity.is_active
      ).length || 0
    );
  }, [opportunitiesData?.results]);

  // Tab options for ContentCard
  const tabOptions = [
    {
      value: "all",
      label: t("filterStatuses.all", "All"),
      count: opportunitiesData?.count || 0,
    },
    {
      value: "active",
      label: t("filterStatuses.active", "Active"),
      count: activeOpportunitiesCount,
    },
    {
      value: "inactive",
      label: t("filterStatuses.inactive", "Inactive"),
      count: inactiveOpportunitiesCount,
    },
  ];

  // Column definitions for DataGrid
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("opportunityFields.name", "Name"),
      flex: 1,
      minWidth: 200,
      cellClassName: "clickable-cell",
    },
    {
      field: "account",
      headerName: t("opportunityFields.account", "Account"),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.account?.name || "-";
      },
    },
    {
      field: "amount",
      headerName: t("opportunityFields.amount", "Amount"),
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(params.row.amount) || 0);
      },
    },
    {
      field: "close_date",
      headerName: t("opportunityFields.closeDate", "Close Date"),
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        return params.row.close_date
          ? new Date(params.row.close_date).toLocaleDateString()
          : "-";
      },
    },
    {
      field: "owner",
      headerName: t("opportunityFields.owner", "Owner"),
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        // In a real implementation, you might fetch user details or pass them with the response
        return params.row.owner || "-";
      },
    },
    {
      field: "actions",
      headerName: t("common.actions", "Actions"),
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
            aria-label={t("delete", "Delete")}
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
          {t("opportunitiesList.title", "Opportunities")}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t("opportunitiesList.newButton", "New Opportunity")}
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
          filters.is_active === true
            ? "active"
            : filters.is_active === false
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
            rows={opportunitiesData?.results || []}
            columns={columns.filter((col) =>
              visibleColumns.includes(col.field)
            )}
            rowCount={opportunitiesData?.count || 0}
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
            onRowClick={handleRowClick}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t(
                "opportunitiesList.gridViewNotImplemented",
                "Grid view is not implemented"
              )}
            </Typography>
          </Box>
        )}
      </ContentCard>

      <ConfirmDialog
        open={confirmDelete.open}
        title={t("opportunitiesPage.deleteTitle", "Delete Opportunity")}
        content={t(
          "opportunitiesPage.deleteConfirmation",
          "Are you sure you want to delete this opportunity?"
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
