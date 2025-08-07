/**
 * Store Pickup Management Page
 *
 * Page component for listing, filtering, and managing store pickup locations
 */
"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  IconButton,
  Alert,
  Tooltip,
  Chip,
  Paper,
  Typography,
  Button,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import {
  useStorePickups,
  useDeleteStorePickup,
} from "@/app/hooks/api/admin/useStorePickup";
import {
  StorePickup,
  StorePickupListResponse,
} from "@/app/types/admin/storePickup";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { formatDateTime } from "@/app/utils/dateUtils";
import ContentCard from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import DeleteConfirmationDialog from "@/app/components/admin/catalogue/DeleteConfirmationDialog";

function StorePickupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant as string;

  // State for filters
  const [filters, setFilters] = useState<{
    is_active?: boolean;
    search?: string;
    ordering?: string;
  }>({});

  // State for search term
  const [searchTerm, setSearchTerm] = useState("");

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storePickupToDelete, setStorePickupToDelete] =
    useState<StorePickup | null>(null);

  // State for selected store pickup
  const [selectedStorePickupId, setSelectedStorePickupId] = useState<
    number | null
  >(null);

  // State for view (list or grid)
  const [view, setView] = useState<"list" | "grid">("list");

  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "address",
    "city",
    "state",
    "postal_code",
    "country",
    "is_active",
    "actions",
  ]);

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("all");

  // Notification state
  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });

  // API pagination params state (1-indexed)
  const [paginationParams, setPaginationParams] = useState({
    page: 1,
    page_size: 50,
  });

  // Fetch store pickup locations with filters
  const {
    data,
    isLoading: isLoadingStorePickups,
    isError: isStorePickupsError,
    error: storePickupsError,
    refetch: refetchStorePickups,
  } = useStorePickups({
    ...filters,
    ...paginationParams,
  });

  // API mutations
  const {
    mutate: deleteStorePickup,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError,
  } = useDeleteStorePickup();

  // Process data to ensure consistent format for the data grid
  const processedData = useMemo(() => {
    if (!data) return [];

    // Handle different data formats - ensure we have an array to work with
    let storePickups: StorePickup[] = [];

    if (Array.isArray(data.results)) {
      storePickups = data.results;
    } else if (data && typeof data === "object" && "results" in data) {
      storePickups = Array.isArray(data.results) ? data.results : [];
    }

    return storePickups.map((location: StorePickup) => ({
      ...location,
      formattedCreatedAt: formatDateTime(location.created_at),
      formattedUpdatedAt: formatDateTime(location.updated_at),
      fullAddress: `${location.address_line1}, ${location.city}, ${location.state} ${location.pincode}, ${location.country}`,
    }));
  }, [data]);

  // Filter options for the ContentCard component
  const filterOptions = [
    {
      field: "is_active",
      type: "boolean" as const,
      value: true,
      label: t("storePickup.active"),
    },
    {
      field: "is_active",
      type: "boolean" as const,
      value: false,
      label: t("storePickup.inactive"),
    },
  ];

  // Column options for the ContentCard component
  const columnOptions = [
    { field: "id", headerName: t("storePickup.id") },
    { field: "name", headerName: t("storePickup.name") },
    { field: "address_line1", headerName: t("storePickup.address") },
    { field: "city", headerName: t("storePickup.city") },
    { field: "state", headerName: t("storePickup.state") },
    { field: "pincode", headerName: t("storePickup.postalCode") },
    { field: "country", headerName: t("storePickup.country") },
    { field: "is_active", headerName: t("storePickup.status") },
    { field: "actions", headerName: t("storePickup.actions") },
  ];

  // Tab options for the ContentCard component
  const tabOptions = [
    { value: "all", label: t("storePickup.all"), count: data?.counts?.total || 0 },
    {
      value: "active",
      label: t("storePickup.active"),
      count: data?.counts?.active || 0,
    },
    {
      value: "inactive",
      label: t("storePickup.inactive"),
      count: data?.counts?.inactive || 0,
    },
  ];

  // Handler for search in ContentCard
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);

    // Update filters with search term
    if (searchValue.trim()) {
      setFilters((prev) => ({ ...prev, search: searchValue.trim() }));
    } else {
      // Remove search from filters if empty
      const { search, ...restFilters } = filters;
      setFilters(restFilters);
    }
  };

  // Handler for view change in ContentCard
  const handleViewChange = (newView: "list" | "grid") => {
    setView(newView);
  };

  // Handler for filter change in ContentCard
  const handleFilterChange = (newFilters: any) => {
    // Preserve search term if it exists
    const updatedFilters = searchTerm
      ? { ...newFilters, search: searchTerm }
      : newFilters;

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

    if (newTab === "active") {
      setFilters({ ...baseFilters, is_active: true });
    } else if (newTab === "inactive") {
      setFilters({ ...baseFilters, is_active: false });
    } else {
      // Remove is_active filter for 'all' tab but keep other filters
      const { is_active, ...restFilters } = baseFilters;
      setFilters(restFilters);
    }
  };

  // Handler for delete button click
  const handleDeleteClick = (storePickup: StorePickup) => {
    setStorePickupToDelete(storePickup);
    setDeleteDialogOpen(true);
  };

  // Handler for delete confirmation
  const handleDeleteConfirm = () => {
    if (storePickupToDelete) {
      deleteStorePickup(storePickupToDelete.id, {
        onSuccess: () => {
          showSuccess(t("storePickup.deleteSuccess"));
          setDeleteDialogOpen(false);
        },
        onError: (error: unknown) => {
          showError(error instanceof Error ? error.message : t("storePickup.error"));
        },
      });
    }
  };

  // Handler for delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // DataGrid columns definition
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: t("storePickup.id"),
      width: 70,
    },
    {
      field: "name",
      headerName: t("storePickup.name"),
      width: 200,
      flex: 1,
    },
    {
      field: "address_line1",
      headerName: t("storePickup.address"),
      width: 300,
      flex: 2,
    },
    {
      field: "city",
      headerName: t("storePickup.city"),
      width: 150,
    },
    {
      field: "state",
      headerName: t("storePickup.state"),
      width: 120,
    },
    {
      field: "pincode",
      headerName: t("storePickup.postalCode"),
      width: 120,
    },
    {
      field: "country",
      headerName: t("storePickup.country"),
      width: 120,
    },
    {
      field: "is_active",
      headerName: t("storePickup.status"),
      width: 120,
      renderCell: (params: GridRenderCellParams<StorePickup>) => (
        <Chip
          label={
            params.row.is_active ? t("storePickup.active") : t("storePickup.inactive")
          }
          color={params.row.is_active ? "success" : "default"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "actions",
      headerName: t("storePickup.actions"),
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams<StorePickup>) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title={t("common:edit")}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                router.push(`/${tenant}/Crm/admin/store-pickup/${params.row.id}`);
              }}
              size="small"
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("storePickup.delete")}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleDeleteClick(params.row as StorePickup);
              }}
              size="small"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Page header with title and action buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t("storePickup.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            router.push(`/${tenant}/Crm/admin/store-pickup/add`);
          }}
        >
          {t("storePickup.addNew")}
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
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          rowCount={(data as StorePickupListResponse)?.count || 0}
          loading={isLoadingStorePickups}
          getRowId={(row) => row.id}
          checkboxSelection={false}
          disableRowSelectionOnClick
        />
      </ContentCard>
      {/* Notification component */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        title={t("storePickup.deleteConfirmation")}
        message={t("storePickup.deleteConfirmationMessage", {
          item: storePickupToDelete?.name || t("storePickup.item"),
        })}
        loading={isDeleting}
      />
    </Box>
  );
}

export default StorePickupPage;
