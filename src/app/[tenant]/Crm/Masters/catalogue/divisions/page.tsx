/**
 * Divisions Listing Page
 *
 * Page component for listing, filtering, and managing divisions
 */
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Alert,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  GridColDef,
  GridRenderCellParams,
  GridRowParams,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  useFetchDivisions,
  useDeleteDivision,
  useCreateDivision,
  useUpdateDivision,
} from "@/app/hooks/api/catalogue";
import DeleteConfirmationDialog from "@/app/components/admin/catalogue/DeleteConfirmationDialog";
import { Division, CatalogueFilter } from "@/app/types/catalogue";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { formatDateTime } from "@/app/utils/dateUtils";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import ContentCard from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import DivisionForm from "@/app/components/admin/catalogue/forms/DivisionForm";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import { DivisionFormValues } from "@/app/components/admin/catalogue/schemas";

// Wrapper component that provides the DrawerContext
function DivisionsPageWrapper() {
  return (
    <DrawerProvider>
      <DivisionsPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function DivisionsPage(): React.ReactElement {
  const { t } = useTranslation();

  // Use drawer context
  const drawerContext = useDrawer();

  // State for filters
  const [filters, setFilters] = useState<CatalogueFilter>({});

  // State for search term
  const [searchTerm, setSearchTerm] = useState("");

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState<Division | null>(
    null
  );

  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | "view">("add");
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(
    null
  );
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(
    null
  );
  const [isViewMode, setIsViewMode] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);

  // Form reference for controlling form submission
  const formRef = useRef<{ submitForm: () => void }>(null);

  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>("view");

  // State for view (list or grid)
  const [view, setView] = useState<"list" | "grid">("list");

  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "description",
    "is_active",
    "formattedCreatedAt",
    "createdByUsername",
    "formattedUpdatedAt",
    "updatedByUsername",
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

  // API pagination params state
  const [paginationParams, setPaginationParams] = useState({
    page: 1, // API uses 1-indexed pages
    page_size: 50,
  });

  // Fetch divisions with filters - merge pagination params with other filters
  const {
    data,
    isLoading: isLoadingDivisions,
    isError: isDivisionsError,
    error: divisionsError,
    refetch: refetchDivisions,
  } = useFetchDivisions({
    ...filters,
    ...paginationParams,
    // Add is_active filter from activeTab if not 'all'
    is_active: activeTab === "all" ? undefined : activeTab === "true",
  });

  // Process data to add username fields directly and format dates
  const processedData = useMemo(() => {
    if (!data) return [];

    // Access results from the pagination response
    const divisions = data.results || [];

    // Map over the data to add formatted date fields and username fields
    return divisions.map((division) => ({
      ...division,
      // Format other fields
      createdByUsername: division.created_by?.username || "N/A",
      updatedByUsername: division.updated_by?.username || "N/A",
      formattedCreatedAt: formatDateTime(division.created_at),
      formattedUpdatedAt: formatDateTime(division.updated_at),
    }));
  }, [data]);

  // API mutations
  const {
    mutate: deleteDivision,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError,
  } = useDeleteDivision();

  const { mutate: createDivision, isPending: isCreating } = useCreateDivision();

  const { mutate: updateDivision, isPending: isUpdating } = useUpdateDivision();

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value) {
      setFilters((prev) => ({ ...prev, search: e.target.value }));
    } else {
      const { search, ...rest } = filters;
      setFilters(rest);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (division: Division) => {
    setDivisionToDelete(division);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (divisionToDelete) {
      deleteDivision(divisionToDelete.id, {
        onSuccess: () => {
          showSuccess(t("deleteSuccess"));
          setDeleteDialogOpen(false);
        },
        onError: (error: unknown) => {
          showError(error instanceof Error ? error.message : t("error"));
        },
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
      field: "id",
      headerName: t("id"),
      width: 70,
    },
    {
      field: "name",
      headerName: t("name"),
      width: 150,
      flex: 1,
    },
    {
      field: "is_active",
      headerName: t("isActive"),
      width: 100,
    },
    {
      field: "formattedCreatedAt",
      headerName: t("createdAt"),
      width: 100,
    },
    {
      field: "createdByUsername",
      headerName: t("createdBy"),
      width: 100,
    },
    {
      field: "formattedUpdatedAt",
      headerName: t("updatedAt"),
      width: 100,
    },
    {
      field: "updatedByUsername",
      headerName: t("updatedBy"),
      width: 100,
    },
    {
      field: "description",
      headerName: t("description"),
      width: 200,
      flex: 1,
    },
    {
      field: "actions",
      headerName: t("Actions"),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Division>) => (
        <Tooltip title={t("delete")}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click
              handleDeleteClick(params.row as Division);
            }}
            size="small"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
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

    // Reset to first page when changing tabs
    setPaginationModel((prev) => ({ ...prev, page: 0 }));

    // Update pagination params to trigger refetch
    setPaginationParams((prev) => ({
      ...prev,
      page: 1, // Reset to first page (1-indexed for API)
      // is_active will be handled by the useFetchDivisions dependency array
    }));

    // Update filters to include the tab filter
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (newTab === "all") {
        // Remove is_active filter for 'all' tab
        const { is_active, ...rest } = newFilters;
        return rest;
      } else {
        // Set is_active based on tab
        return {
          ...newFilters,
          is_active: newTab === "true",
        };
      }
    });
  };

  const drawerSidebarIcons = useMemo(() => {
    if (drawerMode === "add") {
      return [];
    }
    return [
      {
        id: "view",
        icon: <VisibilityIcon />,
        tooltip: t("view", "View"),
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem("view");
          drawerContext.setActiveSidebarItem("view");
        },
      },
      {
        id: "edit",
        icon: <EditIcon />,
        tooltip: t("edit", "Edit"),
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem("edit");
          drawerContext.setActiveSidebarItem("edit");
        },
      },
    ];
  }, [drawerMode, t, drawerContext]);

  // Filter options for ContentCard
  const filterOptions = useMemo(
    () => [
      { field: "name", label: t("name"), type: "text" as const },
      { field: "is_active", label: t("Status"), type: "boolean" as const },
    ],
    [t]
  );

  // Column options for ContentCard
  const columnOptions = useMemo(
    () =>
      columns.map((col) => ({
        field: col.field,
        headerName: col.headerName?.toString() || col.field,
      })),
    [columns]
  );

  // Tab options for ContentCard with counts from API
  const tabOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("all"),
        count: data?.counts?.total || 0,
      },
      {
        value: "true",
        label: t("active"),
        count: data?.counts?.active || 0,
      },
      {
        value: "false",
        label: t("inactive"),
        count: data?.counts?.inactive || 0,
      },
    ],
    [data, t]
  );

  // Handle drawer open for adding a new division
  const handleAddDivision = () => {
    setSelectedDivisionId(null);
    setSelectedDivision(null);
    setDrawerMode("add");
    setIsViewMode(false);
    setActiveSidebarItem("edit");
    setDrawerOpen(true);
    drawerContext.openDrawer("add");
  };

  // Handle drawer open for editing a division
  const handleOpenEditDrawer = (id: number) => {
    setSelectedDivisionId(id);
    setDrawerMode("edit");
    setIsViewMode(false);
    setActiveSidebarItem("edit");
    // Find the division by id
    const division = processedData.find((item: Division) => item.id === id);
    if (division) {
      setSelectedDivision(division);
      setDrawerOpen(true);
    }
    drawerContext.openDrawer("edit");
  };

  // Handle drawer open for viewing a division
  const handleViewClick = (id: number) => {
    setSelectedDivisionId(id);
    setDrawerMode("view");
    setIsViewMode(true);
    setActiveSidebarItem("view");
    // Find the division by id
    const division = processedData.find((item: Division) => item.id === id);
    if (division) {
      setSelectedDivision(division);
      setDrawerOpen(true);
    }
    drawerContext.openDrawer("view");
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  // State for API validation errors
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({});

  // Handle form submission
  const handleFormSubmit = (values: DivisionFormValues) => {
    // Clear any previous API errors
    setApiErrors({});

    // Prepare data for API by converting null to undefined
    const preparedData = {
      ...values,
      image: values.image || null, // Convert undefined to null
      description: values.description || null, // Convert undefined to null
      image_alt_text: values.image_alt_text || null, // Convert undefined to null
    };

    if (drawerMode === "add") {
      // Create new division
      createDivision(preparedData, {
        onSuccess: () => {
          showSuccess(t("createSuccess"));
          setDrawerOpen(false);
          refetchDivisions();
        },
        onError: (error: unknown) => {
          // Handle API validation errors
          if (error && typeof error === "object" && "response" in error) {
            const axiosError = error as {
              response?: { data?: Record<string, string[]> };
            };
            if (axiosError.response?.data) {
              // Set API errors to be displayed in the form
              setApiErrors(axiosError.response.data);

              // Create a message for the notification
              const errorMessages = Object.entries(axiosError.response.data)
                .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
                .join("\n");

              showError(errorMessages);
            } else {
              showError(t("error"));
            }
          } else {
            showError(error instanceof Error ? error.message : t("error"));
          }
        },
      });
    } else if (selectedDivisionId) {
      // Update existing division
      // Use type assertion to tell TypeScript we know what we're doing
      updateDivision({ id: selectedDivisionId, ...preparedData } as Division, {
        onSuccess: () => {
          showSuccess(t("updateSuccess"));
          setDrawerOpen(false);
          refetchDivisions();
        },
        onError: (error: unknown) => {
          // Handle API validation errors
          if (error && typeof error === "object" && "response" in error) {
            const axiosError = error as {
              response?: { data?: Record<string, string[]> };
            };
            if (axiosError.response?.data) {
              // Set API errors to be displayed in the form
              setApiErrors(axiosError.response.data);

              // Create a message for the notification
              const errorMessages = Object.entries(axiosError.response.data)
                .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
                .join("\n");

              showError(errorMessages);
            } else {
              showError(t("error"));
            }
          } else {
            showError(error instanceof Error ? error.message : t("error"));
          }
        },
      });
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">{t("divisions")}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDivision}
        >
          {t("divisions")}
        </Button>
      </Box>

      {/* Error alerts */}
      {isDivisionsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {divisionsError instanceof Error
            ? divisionsError.message
            : t("error")}
        </Alert>
      )}

      {isDeleteError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {deleteError instanceof Error ? deleteError.message : t("error")}
        </Alert>
      )}

      {/* Loading indicator */}
      {isLoadingDivisions && <Loader message={t("loading")} />}

      {/* Data grid with ContentCard and CustomDataGrid */}
      {!isLoadingDivisions && (
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
          {view === "list" ? (
            <CustomDataGrid
              rows={processedData}
              columns={columns.filter((col) =>
                visibleColumns.includes(col.field)
              )}
              paginationModel={paginationModel}
              onPaginationModelChange={(newModel) => {
                setPaginationModel(newModel);
                // Convert to API pagination (1-indexed)
                setPaginationParams({
                  page: newModel.page + 1,
                  page_size: newModel.pageSize,
                });
              }}
              pageSizeOptions={[50, 100, 200]}
              checkboxSelection={true}
              disableRowSelectionOnClick={false}
              autoHeight
              getRowId={(row: Division) => row.id}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={(newSelection) => {
                setRowSelectionModel(newSelection);
              }}
              onRowClick={(params: GridRowParams<Division>) => {
                handleViewClick(params.row.id);
              }}
              // Server-side pagination properties
              rowCount={data?.count || 0}
              paginationMode="server"
              loading={isLoadingDivisions}
            />
          ) : (
            // Grid view can be implemented here
            <Box sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" align="center">
                {t("Grid view is not implemented yet")}
              </Typography>
            </Box>
          )}

          {/* Pagination statistics - below the data grid */}
          {data && !isLoadingDivisions && (
            <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end" }}>
              <Typography variant="body2" color="text.secondary">
                {t("showing")} {data.results?.length || 0} {t("of")}{" "}
                {data.count || 0} {t("entries")}
                {data.total_pages &&
                  data.total_pages > 0 &&
                  ` - ${t("page")} ${data.current_page || 1} ${t("of")} ${
                    data.total_pages
                  }`}
              </Typography>
            </Box>
          )}
        </ContentCard>
      )}

      {/* AnimatedDrawer for adding/editing divisions */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        initialWidth={550}
        expandedWidth={550}
        title={
          isViewMode
            ? t("viewDivision")
            : drawerMode === "add"
            ? t("addDivision")
            : t("editDivision")
        }
        onSave={
          isViewMode
            ? undefined
            : () => {
                console.log("Save button clicked", { formRef });
                if (formRef.current) {
                  console.log("Form ref exists, calling submitForm");
                  formRef.current.submitForm();
                } else {
                  console.error("Form ref is null or undefined");
                }
              }
        }
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        footerContent={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {drawerMode === "edit" && selectedDivisionId && (
              <Typography variant="caption" color="text.secondary">
                {t("lastUpdated")}:{" "}
                {selectedDivision?.updated_at
                  ? formatDateTime(selectedDivision.updated_at)
                  : ""}
              </Typography>
            )}
          </Box>
        }
      >
        <DivisionForm
          ref={formRef}
          defaultValues={
            selectedDivision
              ? {
                  ...(selectedDivisionId ? { id: selectedDivisionId } : {}), // Only include ID when it's not null
                  name: selectedDivision.name,
                  is_active: selectedDivision.is_active,
                  description: selectedDivision.description || "",
                  image: selectedDivision.image || undefined,
                  image_alt_text: selectedDivision.image_alt_text || "",
                  // Map customer_group_selling_channels to customer_group_selling_channel_ids
                  customer_group_selling_channel_ids: selectedDivision.customer_group_selling_channels?.map(
                    (channel: { id: number }) => channel.id
                  ) || []
                }
              : undefined
          }
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
          readOnly={isViewMode}
          apiErrors={apiErrors}
        />
      </AnimatedDrawer>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        title={t("deleteTitle")}
        content={t("deleteMessage")}
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
}

export default DivisionsPageWrapper;
