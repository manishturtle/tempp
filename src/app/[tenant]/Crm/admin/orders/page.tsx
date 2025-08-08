"use client";

import {
  Container,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Link as MuiLink,
  CircularProgress,
  Alert,
  Tooltip,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import ContentCard, {
  FilterOption,
  FilterState,
} from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import {
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

// Import our admin orders hook
import useAdminOrders, {
  useAdminOrderDetail,
} from "@/app/hooks/api/admin/useAdminOrders";
import { AdminOrderListParams, AdminOrder } from "@/app/types/admin/orders";
import { OrderStatus } from "@/app/types/store/order";
import { formatDateTime } from "@/app/utils/dateUtils";

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = typeof params?.tenant === "string" ? params.tenant : "";
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // Api query parameters
  const [queryParams, setQueryParams] = useState<AdminOrderListParams>({
    page: 1, // API uses 1-based indexing
    limit: 50,
  });

  // Fetch orders using our custom hook
  const {
    data: ordersData,
    isLoading,
    isError,
    error,
  } = useAdminOrders(queryParams);

  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: "orderId",
      label: t("admin.orders.filters.orderId", "Order ID"),
      type: "text",
    },
    {
      field: "customer",
      label: t("admin.orders.filters.customer", "Customer"),
      type: "text",
    },
    {
      field: "orderStatus",
      label: t("admin.orders.filters.orderStatus", "Order Status"),
      type: "select",
      options: [
        {
          value: "all",
          label: t("admin.orders.filters.allStatuses", "All Statuses"),
        },
        {
          value: "shipped",
          label: t("admin.orders.status.shipped", "Shipped"),
        },
        {
          value: "processing",
          label: t("admin.orders.status.processing", "Processing"),
        },
        {
          value: "delivered",
          label: t("admin.orders.status.delivered", "Delivered"),
        },
        {
          value: "cancelled",
          label: t("admin.orders.status.cancelled", "Cancelled"),
        },
        {
          value: "pending",
          label: t("admin.orders.status.pending", "Pending"),
        },
      ],
    },
    {
      field: "paymentStatus",
      label: t("admin.orders.filters.paymentStatus", "Payment Status"),
      type: "select",
      options: [
        {
          value: "all",
          label: t(
            "admin.orders.filters.allPaymentStatuses",
            "All Payment Statuses"
          ),
        },
        { value: "paid", label: t("admin.orders.paymentStatus.paid", "Paid") },
        {
          value: "pending",
          label: t("admin.orders.paymentStatus.pending", "Pending"),
        },
        {
          value: "refunded",
          label: t("admin.orders.paymentStatus.refunded", "Refunded"),
        },
      ],
    },
    {
      field: "date",
      label: t("admin.orders.filters.date", "Order Date"),
      type: "date",
    },
  ];

  const tabOptions = [
    {
      value: "all",
      label: t("admin.orders.tabs.all", "All"),
      count: ordersData?.count || 0,
    },
  ];

  const columnOptions = [
    { field: "id", headerName: t("admin.orders.columns.id", "Order ID") },
    { field: "date", headerName: t("admin.orders.columns.date", "Date") },
    {
      field: "customer",
      headerName: t("admin.orders.columns.customer", "Customer"),
    },
    { field: "status", headerName: t("Status", "Status") },
    {
      field: "paymentStatus",
      headerName: t("admin.orders.columns.paymentStatus", "Payment"),
    },
    { field: "total", headerName: t("admin.orders.columns.total", "Total") },
    {
      field: "actions",
      headerName: t("admin.orders.columns.actions", "Actions"),
    },
  ];

  const columns: GridColDef<AdminOrder>[] = [
    {
      field: "order_id",
      headerName: t("admin.orders.columns.id", "Order ID"),
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <MuiLink
          href={`/${tenantSlug}/Crm/admin/orders/${params.row.id}`}
          onClick={(e) => {
            e.preventDefault();
            router.push(
              `/${tenantSlug}/Crm/admin/orders/manage?mode=VIEW&id=${params.row.id}`
            );
          }}
          sx={{
            color: "primary.main",
            textDecoration: "none",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          {params.value}
        </MuiLink>
      ),
    },
    {
      field: "customer_details",
      headerName: t("admin.orders.columns.customer", "Customer"),
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => {
        const { customer_details, shipping_address } = params.row;

        // 1. Check for registered customer details first
        if (customer_details && customer_details.name) {
          return (
            <Box>
              <Typography variant="body2" component="span">
                {customer_details.name}
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{ ml: 0.5, color: "text.secondary" }}
              >
                ({customer_details.email})
              </Typography>
            </Box>
          );
        }

        // 2. Fallback to shipping_address for guest users
        if (shipping_address && shipping_address.full_name) {
          return (
            <Box>
              <Typography variant="body2" component="span">
                {shipping_address.full_name}
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{ ml: 0.5, color: "text.secondary" }}
              >
                (Guest)
              </Typography>
            </Box>
          );
        }

        // 3. Render a placeholder if no details are found
        return "—";
      },
    },
    {
      field: "status",
      headerName: t("Status", "Status"),
      width: 150,
      renderCell: (params) => {
        // Early return if no row data or status
        if (!params.row || !params.row.status) {
          return <span>—</span>;
        }

        const status = params.row.status.toString();
        const statusMap: Record<
          string,
          "success" | "warning" | "error" | "info" | "default"
        > = {
          COMPLETED: "success",
          PENDING_PAYMENT: "warning",
          PROCESSING: "info",
          SHIPPED: "info",
          DELIVERED: "success",
          CANCELLED: "error",
          REFUNDED: "default",
        };

        return (
          <Chip
            label={
              status
                ? t(
                    `order.status.${status.toLowerCase()}`,
                    status.replace("_", " ")
                  )
                : "Unknown"
            }
            size="small"
            color={statusMap[status] || "default"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "total_amount",
      headerName: t("admin.orders.columns.total", "Total"),
      width: 150,
      renderCell: (params: GridRenderCellParams<AdminOrder>) => {
        const currency = params.row.currency;
        const amount = params.value; // In renderCell, params.value is the value for the specified field

        if (currency && amount != null) {
          // renderCell should return a React node, so we wrap the string in a component
          return (
            <Typography variant="body2">{`${currency} ${amount}`}</Typography>
          );
        }

        // Return the amount by itself if no currency is found
        return <Typography variant="body2">{amount || ""}</Typography>;
      },
    },
    {
      field: "created_at",
      headerName: t("admin.orders.columns.date", "Date"),
      width: 180,
      renderCell: (params: GridRenderCellParams<AdminOrder>) => {
        // Check if the date value exists on the row
        if (!params.value) {
          return ""; // Return an empty string if there's no date
        }
        // Return the formatted date time string
        return formatDateTime(params.value);
      },
    },
    {
      field: "payment_status",
      headerName: t("admin.orders.columns.paymentStatus", "Payment"),
      width: 120,
      renderCell: (params) => {
        // Early return if no payment status
        if (!params.row || !params.row.payment_status) {
          return <span>—</span>;
        }

        const status = params.row.payment_status.toString();
        const statusMap: Record<
          string,
          "success" | "warning" | "error" | "info"
        > = {
          PAID: "success",
          PENDING: "warning",
          FAILED: "error",
          REFUNDED: "info",
          PARTIALLY_REFUNDED: "info",
        };

        return (
          <Chip
            label={status ? status.replace("_", " ") : "Unknown"}
            size="small"
            color={statusMap[status] || "default"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("admin.orders.columns.actions", "Actions"),
      width: 100,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Tooltip title={t("admin.orders.actions.edit", "Edit Order")}>
            <IconButton
              size="small"
              onClick={() => {
                router.push(
                  `/${tenantSlug}/Crm/admin/orders/manage?mode=EDIT&id=${params.row.id}`
                );
              }}
              aria-label="edit"
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Update query params when search term changes
  const handleSearch = (term: string): void => {
    setSearchTerm(term);
    setQueryParams((prev) => ({
      ...prev,
      order_number: term || undefined,
      page: 1, // Reset to first page on new search
    }));
  };

  const handleViewChange = (newView: "list" | "grid"): void => {
    setView(newView);
  };

  // Update query params when filters change
  const handleFilterChange = (filters: FilterState[]): void => {
    setActiveFilters(filters);

    // Build new query params from filter states
    const newParams: Partial<AdminOrderListParams> = {};

    filters.forEach((filter) => {
      switch (filter.field) {
        case "orderId":
          newParams.order_number = filter.value as string;
          break;
        case "customer":
          newParams.customer_name = filter.value as string;
          break;
        case "orderStatus":
          if (filter.value !== "all") {
            newParams.status = filter.value as OrderStatus;
          }
          break;
        case "paymentStatus":
          if (filter.value !== "all") {
            // Use payment_status instead of payment_method for proper filtering
            newParams.payment_status = filter.value as string;
          }
          break;
        case "date":
          // Handle date range
          if (typeof filter.value === "object" && filter.value) {
            const dateValue = filter.value as {
              start: Date | null;
              end: Date | null;
            };
            if (dateValue.start) {
              newParams.date_from = dateValue.start.toISOString().split("T")[0];
            }
            if (dateValue.end) {
              newParams.date_to = dateValue.end.toISOString().split("T")[0];
            }
          } else if (filter.value) {
            const dateValue = filter.value as string;
            newParams.date_from = dateValue;
          }
          break;
      }
    });

    setQueryParams((prev) => ({
      ...prev,
      ...newParams,
      page: 1, // Reset to first page on new filters
    }));
  };

  // Update query params when tab changes
  const handleTabChange = (tabValue: string): void => {
    setActiveTab(tabValue);

    setQueryParams((prev) => ({
      ...prev,
      status: tabValue !== "all" ? (tabValue as OrderStatus) : undefined,
      page: 1, // Reset to first page on tab change
    }));
  };

  const handlePaginationModelChange = (
    newPaginationModel: GridPaginationModel
  ) => {
    setPaginationModel(newPaginationModel);

    setQueryParams((prev) => ({
      ...prev,
      page: newPaginationModel.page + 1, // API uses 1-based indexing
      limit: newPaginationModel.pageSize,
    }));
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          mb: 3,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {t("admin.orders.list.title", "Orders")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              "admin.orders.list.subtitle",
              "Manage and process customer orders"
            )}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() =>
            router.push(`/${tenantSlug}/Crm/admin/orders/manage?mode=create`)
          }
        >
          {t("admin.orders.list.createOrder", "Create Order")}
        </Button>
      </Box>

      <ContentCard
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={tabOptions}
        activeTab={activeTab}
      >
        <CustomDataGrid
          rows={ordersData?.results || []}
          columns={columns}
          rowCount={ordersData?.count || 0}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[50, 100, 200]}
          disableRowSelectionOnClick
          loading={isLoading}
          paginationMode="server"
        />
      </ContentCard>
    </>
  );
}
