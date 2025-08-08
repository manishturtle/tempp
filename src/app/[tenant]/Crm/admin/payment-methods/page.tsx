/**
 * Payment Methods Management Page
 *
 * Page component for listing, filtering, and managing payment methods
 */
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Grid,
  Stack,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  GridColDef,
  GridRenderCellParams,
  GridValueFormatter,
} from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import {
  usePaymentMethods,
  usePaymentMethodStatistics,
  useDeletePaymentMethod,
  useCreatePaymentMethod,
  usePaymentMethod,
  useUpdatePaymentMethod,
} from "@/app/hooks/api/admin/usePaymentMethods";
import {
  PaymentMethod,
  PaginatedPaymentMethodResponse,
  PaymentMethodType,
} from "@/app/types/admin/paymentMethod";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import { formatDateTime } from "@/app/utils/dateUtils";
import ContentCard from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import DeleteConfirmationDialog from "@/app/components/admin/catalogue/DeleteConfirmationDialog";
import AnalyticsCard from "@/app/components/common/AnalyticsCard";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import PaymentMethodForm, {
  PaymentMethodFormRef,
  PaymentMethodFormValues,
} from "./PaymentMethodForm";

function PaymentMethodsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant as string;
  const drawerContext = useDrawer();

  // State for filters
  const [filters, setFilters] = useState<{
    is_active?: boolean;
    payment_type?: string;
    search?: string;
    ordering?: string;
  }>({});

  // State for search term
  const [searchTerm, setSearchTerm] = useState("");

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] =
    useState<PaymentMethod | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for sidebar - using a single source of truth for the active mode
  const [activeSidebarItem, setActiveSidebarItem] = useState<"view" | "edit">(
    "view"
  );
  // Derived state for view mode
  const isViewMode = activeSidebarItem === "view";

  // View mode state (list or grid)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Form ref to control submission from drawer
  const formRef = useRef<PaymentMethodFormRef>(null);

  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "payment_type",
    "is_active",
    "formattedCreatedAt",
    "formattedUpdatedAt",
    "actions",
    "collection_mechanism",
    "is_visible_on_store",
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

  // Get payment methods using the hook
  const {
    data,
    isLoading: isLoadingPaymentMethods,
    isError: isPaymentMethodsError,
    error: paymentMethodsError,
    refetch: refetchPaymentMethods,
  } = usePaymentMethods({
    page: paginationParams.page,
    page_size: paginationParams.page_size,
    search: filters.search,
    is_active: filters.is_active,
    payment_type: filters.payment_type,
    ordering: filters.ordering,
  });

  // Fetch statistics for payment methods
  const { data: statsData, isLoading: isLoadingStats } =
    usePaymentMethodStatistics();

  // API mutations
  const {
    mutate: deletePaymentMethod,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError,
  } = useDeletePaymentMethod();

  // Process data to ensure consistent format for the data grid
  const processedData = useMemo(() => {
    if (!data) return [];

    return data.results.map((item) => ({
      ...item,
      formattedCreatedAt: new Date(item.created_at).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      ),
      formattedUpdatedAt: new Date(item.updated_at).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      ),
      paymentTypeDisplay: t(`paymentMethod.types.${item.payment_type}`),
      statusDisplay: item.is_active
        ? t("paymentMethod.active")
        : t("paymentMethod.inactive"),
    }));
  }, [data, t]);

  // Filter options for the ContentCard component
  const filterOptions = [
    {
      field: "is_active",
      type: "boolean" as const,
      value: true,
      label: t("paymentMethod.active"),
    },
    {
      field: "is_active",
      type: "boolean" as const,
      value: false,
      label: t("paymentMethod.inactive"),
    },
    {
      field: "payment_type",
      type: "select" as const,
      value: PaymentMethodType.ONLINE_GATEWAY,
      label: t("paymentMethod.types.online_gateway"),
    },
    {
      field: "payment_type",
      type: "select" as const,
      value: PaymentMethodType.BANK_TRANSFER,
      label: t("paymentMethod.types.bank_transfer"),
    },
    {
      field: "payment_type",
      type: "select" as const,
      value: PaymentMethodType.CASH_OFFLINE,
      label: t("paymentMethod.types.cash_offline"),
    },
  ];

  // Column options for the ContentCard component
  const columnOptions = [
    { field: "id", headerName: t("paymentMethod.id") },
    { field: "name", headerName: t("paymentMethod.name") },
    { field: "payment_type", headerName: t("paymentMethod.type") },
    { field: "is_active", headerName: t("paymentMethod.status") },
    { field: "created_at", headerName: t("paymentMethod.createdAt") },
    { field: "updated_at", headerName: t("paymentMethod.updatedAt") },
    { field: "actions", headerName: t("paymentMethod.actions") },
  ];

  // Tab options for the ContentCard component
  const tabOptions = [
    {
      value: "all",
      label: t("paymentMethod.all"),
      count: statsData?.total_count || 0,
    },
    {
      value: "active",
      label: t("paymentMethod.active"),
      count: statsData?.active_count || 0,
    },
    {
      value: "inactive",
      label: t("paymentMethod.inactive"),
      count: statsData?.inactive_count || 0,
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
    setViewMode(newView);
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
  const handleDeleteClick = (paymentMethod: PaymentMethod) => {
    setPaymentMethodToDelete(paymentMethod);
    setDeleteDialogOpen(true);
  };

  // Handler for delete confirmation
  const handleDeleteConfirm = () => {
    if (paymentMethodToDelete) {
      deletePaymentMethod(paymentMethodToDelete.id, {
        onSuccess: () => {
          showSuccess(t("paymentMethod.deleteSuccess"));
          setDeleteDialogOpen(false);
        },
        onError: (error: unknown) => {
          showError(
            error instanceof Error ? error.message : t("paymentMethod.error")
          );
        },
      });
    }
  };

  // Handler for delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // Drawer handlers
  // Handle drawer close
  const handleDrawerClose = () => {
    // Close the drawer first to prevent any UI glitches
    setDrawerOpen(false);

    // Reset all form and selection states after a small delay to allow animations to complete
    setTimeout(() => {
      setSelectedId(null);
      setSelectedPaymentMethod(null);
      setActiveSidebarItem("view");
      setDrawerMode("add");

      // Reset any form state if needed
      if (formRef.current) {
        formRef.current.resetForm();
      }
    }, 300); // Match this with the drawer close animation duration
  };

  // API hooks
  const createPaymentMethodMutation = useCreatePaymentMethod();
  const updatePaymentMethodMutation = useUpdatePaymentMethod(selectedId || 0);

  // Drawer submission handler
  const handleSubmit = () => {
    if (formRef.current) {
      // Call the form's submit method which will handle validation
      formRef.current.submitForm();
    }
  };

  // Handle form submission from PaymentMethodForm
  const handleFormSubmission = (formValues: PaymentMethodFormValues) => {
    // Log the final form submission payload
    console.log(
      "%c Final Payment Method Form Payload:",
      "background: #4caf50; color: white; padding: 4px; border-radius: 3px;",
      formValues
    );

    const successMessage = selectedId
      ? t("paymentMethod.updateSuccess")
      : t("paymentMethod.saveSuccess");

    const errorMessage = selectedId
      ? t("paymentMethod.error.updateError")
      : t("paymentMethod.error.saveError");

    // Call the appropriate API based on whether we're creating or updating
    const mutation = selectedId
      ? updatePaymentMethodMutation
      : createPaymentMethodMutation;

    mutation.mutate(formValues as Partial<PaymentMethod>, {
      onSuccess: () => {
        showSuccess(successMessage);
        // Close drawer and refresh data
        handleDrawerClose();
        // Refetch payment methods list
        refetchPaymentMethods();
      },
      onError: (error: Error) => {
        console.error(
          selectedId
            ? "Error updating payment method:"
            : "Error creating payment method:",
          error
        );
        showError(errorMessage);
      },
    });
  };

  // Handle Add button click
  const handleAddClick = () => {
    setDrawerMode("add");
    setSelectedId(null);
    setSelectedPaymentMethod(null);
    setActiveSidebarItem("edit"); // This will automatically set isViewMode to false
    setDrawerOpen(true);
  };

  // Handle Edit click - opens in view mode by default
  const handleEditClick = (id: number) => {
    setDrawerMode("edit");
    setSelectedId(id);
    setSelectedPaymentMethod(null); // Reset to fetch fresh data

    // Set view mode by default when opening a payment method
    setActiveSidebarItem("view");

    // We'll open the drawer after data is fetched to avoid showing empty form
    // The drawer will be opened in the useEffect that watches selectedPaymentMethod
  };

  // Fetch payment method data when selectedId changes
  const {
    data: selectedPaymentMethodData,
    isLoading: isLoadingSelectedPaymentMethod,
  } = usePaymentMethod(selectedId || 0);

  // Transform API payment method to form values
  const transformPaymentMethodToFormValues = (
    paymentMethod: PaymentMethod
  ): Partial<PaymentMethodFormValues> => {
    // Determine payment type explicitly based on what details exist
    let paymentType: PaymentMethodType;
    if (paymentMethod.bank_transfer_details) {
      paymentType = PaymentMethodType.BANK_TRANSFER;
    } else if (paymentMethod.cash_offline_details) {
      paymentType = PaymentMethodType.CASH_OFFLINE;
    } else {
      paymentType = PaymentMethodType.ONLINE_GATEWAY;
    }

    const formValues: Partial<PaymentMethodFormValues> = {
      name: paymentMethod.name,
      payment_type: paymentType,
      is_active: paymentMethod.is_active,
      is_visible_on_store: paymentMethod.is_visible_on_store,
      description: paymentMethod.description || "",
      customer_group_selling_channels:
        paymentMethod.customer_group_selling_channels || [],
    };

    // Handle specific payment type data
    if (
      paymentMethod.payment_type === PaymentMethodType.ONLINE_GATEWAY &&
      paymentMethod.gateway_details
    ) {
      formValues.gateway_id = paymentMethod.gateway_details.id;
    } else if (
      paymentMethod.payment_type === PaymentMethodType.BANK_TRANSFER &&
      paymentMethod.bank_transfer_details
    ) {
      formValues.bank_transfer_details = paymentMethod.bank_transfer_details;
    } else if (
      paymentMethod.payment_type === PaymentMethodType.CASH_OFFLINE &&
      paymentMethod.cash_offline_details
    ) {
      const details = paymentMethod.cash_offline_details;
      formValues.collection_mechanism =
        details.collection_mechanism as CollectionMechanism;

      // Handle specific collection mechanism fields
      if (
        details.collection_mechanism === "logistics_partner" &&
        details.logistics_partner_details
      ) {
        const logistics = details.logistics_partner_details;
        formValues.logistics_partner_name = logistics.logistics_partner_name;
        formValues.merchant_id = logistics.merchant_id;
        formValues.api_key = logistics.api_key;
        formValues.cod_collection_limit = logistics.cod_collection_limit;
        formValues.partner_settlement_cycle_days =
          logistics.partner_settlement_cycle_days;
        formValues.settlement_bank_account = logistics.settlement_bank_account;
      }
      // Handle In-Store POS collection mechanism
      else if (
        details.collection_mechanism === "in_store_pos" &&
        details.pos_details
      ) {
        const pos = details.pos_details;
        formValues.physical_location_id = pos.physical_location_id;
        formValues.pos_device_provider = pos.pos_device_provider;
        formValues.terminal_id = pos.terminal_id;
        formValues.merchant_id = pos.merchant_id;
        formValues.api_key = pos.api_key;
        formValues.supported_card_networks = pos.supported_card_networks;
      }
      // Handle Direct Bank Deposit collection mechanism
      else if (
        details.collection_mechanism === "direct_bank_deposit" &&
        details.direct_deposit_details
      ) {
        const bankDetails = details.direct_deposit_details;
        formValues.customer_instructions = bankDetails.customer_instructions;
        formValues.required_proof_details = bankDetails.required_proof_details;
        formValues.beneficiary_bank_account =
          bankDetails.beneficiary_bank_account;
      }
      // Handle Cheque/DD collection mechanism
      else if (
        details.collection_mechanism === "cheque_dd" &&
        details.cheque_dd_details
      ) {
        const chequeDetails = details.cheque_dd_details;
        formValues.payee_name = chequeDetails.payee_name;
        formValues.collection_address = chequeDetails.collection_address;
        formValues.clearing_time_days = chequeDetails.clearing_time_days;
        formValues.bounced_cheque_charges =
          chequeDetails.bounced_cheque_charges;
        formValues.deposit_bank_account = chequeDetails.deposit_bank_account;
      }
    }

    console.log("Transformed form values:", formValues);
    return formValues;
  };

  // Update form data when selected payment method data is loaded
  useEffect(() => {
    // When in edit mode and data is loaded
    if (
      selectedPaymentMethodData &&
      drawerMode === "edit" &&
      !isLoadingSelectedPaymentMethod
    ) {
      // Transform API data to form values
      const formValues = transformPaymentMethodToFormValues(
        selectedPaymentMethodData
      );

      // Update the form data
      setSelectedPaymentMethod(formValues as unknown as PaymentMethod);
      console.log(
        "Loaded payment method for editing:",
        selectedPaymentMethodData
      );
      console.log("Transformed payment method form values:", formValues);

      // Only now open the drawer when data is ready
      setDrawerOpen(true);
    }
  }, [selectedPaymentMethodData, isLoadingSelectedPaymentMethod, drawerMode]);

  // Handle View click
  const handleViewClick = (id: number) => {
    setDrawerMode("edit");
    setSelectedId(id);
    setSelectedPaymentMethod(null);
    setActiveSidebarItem("view"); // This will automatically set isViewMode to true
    setDrawerOpen(true);
  };

  // DataGrid columns definition with type safety
  const columns: GridColDef<PaymentMethod>[] = [
    {
      field: "name",
      headerName: t("paymentMethod.name"),
      width: 200,
      flex: 1,
    },
    {
      field: "payment_type",
      headerName: t("paymentMethod.type"),
      width: 150,
      renderCell: (params) => t(`paymentMethod.types.${params.value}`)
    },
    {
      field: "collection_mechanism",
      headerName: t("paymentMethod.collectionMechanism"),
      width: 200,
      renderCell: (params) => {
        if (
          params.row.payment_type === PaymentMethodType.CASH_OFFLINE &&
          params.row.cash_offline_details
        ) {
          return t(
            `paymentMethod.collectionMechanisms.${params.row.cash_offline_details.collection_mechanism}`
          ) || params.row.cash_offline_details.collection_mechanism_display;
        }
        return null;
      },
    },
    {
      field: "is_active",
      headerName: t("paymentMethod.status"),
      width: 100,
      renderCell: (params) =>
        params.value ? t("paymentMethod.active") : t("paymentMethod.inactive"),
    },
    {
      field: "is_visible_on_store",
      headerName: t("paymentMethod.visibleOnStore"),
      width: 100,
      renderCell: (params) => params.value ? t("paymentMethod.yes") : t("paymentMethod.no")
    },
    {
      field: "formattedCreatedAt",
      headerName: t("paymentMethod.createdAt"),
      width: 120,
      sortable: false,
    },
    {
      field: "formattedUpdatedAt",
      headerName: t("paymentMethod.updatedAt"),
      width: 120,
      sortable: false,
    },
    {
      field: "actions",
      headerName: t("paymentMethod.actions"),
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const paymentMethod = params.row;
        return (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(paymentMethod);
            }}
          >
            <DeleteIcon fontSize="small" color="error" />
          </IconButton>
        );
      },
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header with title and add button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "medium" }}>
          {t("paymentMethod.paymentMethods")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          {t("paymentMethod.addNew")}
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsData?.payment_type_stats && (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
              <AnalyticsCard
                title={t("paymentMethod.types.online_gateway")}
                value={statsData.payment_type_stats.online_gateway.total}
                bgColor="primary.lighter"
                color="primary.main"
                icon={<PaymentIcon />}
                suffix={t("paymentMethod.methods")}
                subtitle={`${
                  statsData.payment_type_stats.online_gateway.active
                } ${t("paymentMethod.active")} • ${
                  statsData.payment_type_stats.online_gateway.inactive
                } ${t("paymentMethod.inactive")}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
              <AnalyticsCard
                title={t("paymentMethod.types.bank_transfer")}
                value={statsData.payment_type_stats.bank_transfer.total}
                bgColor="secondary.lighter"
                color="secondary.main"
                icon={<AccountBalanceIcon />}
                suffix={t("paymentMethod.methods")}
                subtitle={`${
                  statsData.payment_type_stats.bank_transfer.active
                } ${t("paymentMethod.active")} • ${
                  statsData.payment_type_stats.bank_transfer.inactive
                } ${t("paymentMethod.inactive")}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
              <AnalyticsCard
                title={t("paymentMethod.types.cash_offline")}
                value={statsData.payment_type_stats.cash_offline.total}
                bgColor="info.lighter"
                color="info.main"
                icon={<AttachMoneyIcon />}
                suffix={t("paymentMethod.methods")}
                subtitle={`${
                  statsData.payment_type_stats.cash_offline.active
                } ${t("paymentMethod.active")} • ${
                  statsData.payment_type_stats.cash_offline.inactive
                } ${t("paymentMethod.inactive")}`}
              />
            </Grid>
          </>
        )}
      </Grid>

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
          onRowClick={(params: { row: PaymentMethod }) =>
            handleEditClick(params.row.id)
          }
          pageSizeOptions={[10, 25, 50, 100]}
          rowCount={(data as PaginatedPaymentMethodResponse)?.count || 0}
          loading={isLoadingPaymentMethods}
          getRowId={(row: PaymentMethod) => row.id}
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
        title={t("paymentMethod.deleteConfirmation")}
        message={t("paymentMethod.deleteConfirmationMessage", {
          item: paymentMethodToDelete?.name || t("paymentMethod.item"),
        })}
        loading={isDeleting}
      />

      {/* Animated Drawer with PaymentMethodForm */}
      <AnimatedDrawer
        title={
          drawerMode === "add"
            ? t("paymentMethod.addNew")
            : t("paymentMethod.edit")
        }
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSave={handleSubmit}
        initialWidth={550}
        expandedWidth={550}
        saveDisabled={
          isSubmitting ||
          (drawerMode === "edit" && isLoadingSelectedPaymentMethod)
        }
        defaultSidebarItem={activeSidebarItem}
        sidebarIcons={
          drawerMode === "add"
            ? []
            : [
                {
                  id: "view",
                  icon: (
                    <VisibilityIcon
                      color={isViewMode ? "primary" : "inherit"}
                    />
                  ),
                  tooltip: t("common.view"),
                  onClick: () => setActiveSidebarItem("view"),
                },
                {
                  id: "edit",
                  icon: (
                    <EditIcon color={!isViewMode ? "primary" : "inherit"} />
                  ),
                  tooltip: t("common.edit"),
                  onClick: () => setActiveSidebarItem("edit"),
                },
              ]
        }
      >
        <PaymentMethodForm
          ref={formRef}
          onSubmit={handleFormSubmission}
          onError={showError}
          initialValues={
            drawerMode === "edit" && selectedPaymentMethod
              ? (selectedPaymentMethod as unknown as Partial<PaymentMethodFormValues>)
              : {
                  name: "",
                  payment_type: PaymentMethodType.ONLINE_GATEWAY,
                  is_active: true,
                  description: "",
                  is_visible_on_store: true,
                }
          }
          isLoading={isSubmitting || createPaymentMethodMutation.isPending}
          isViewMode={isViewMode}
          isSubmitting={isSubmitting || createPaymentMethodMutation.isPending}
        />
      </AnimatedDrawer>
    </Box>
  );
}

function PaymentMethodsPageWithDrawer() {
  return (
    <DrawerProvider>
      <PaymentMethodsPage />
    </DrawerProvider>
  );
}

export default PaymentMethodsPageWithDrawer;
