"use client";

import {
  Box,
  Typography,
  Chip,
  Link as MuiLink,
  Alert,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import ContentCard, {
  FilterOption,
  FilterState,
} from "@/app/components/common/ContentCard";
import CustomDataGrid from "@/app/components/common/CustomDataGrid";
import {
  GridColDef,
  GridPaginationModel,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { useAdminInvoices } from "@/app/hooks/api/admin/useAdminInvoices";
import { AdminInvoice } from "@/app/types/admin/invoices";
import EditIcon from "@mui/icons-material/Edit";

export default function AdminInvoicesPage() {
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

  // Fetch invoices using our custom hook
  const {
    invoices,
    pagination,
    isLoadingInvoices: isLoading,
    invoicesError: error,
  } = useAdminInvoices();

  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: "invoiceNumber",
      label: t("admin.invoices.filters.invoiceNumber", "Invoice Number"),
      type: "text",
    },
    {
      field: "customer",
      label: t("admin.invoices.filters.customer", "Customer"),
      type: "text",
    },
    {
      field: "invoiceStatus",
      label: t("admin.invoices.filters.invoiceStatus", "Invoice Status"),
      type: "select",
      options: [
        {
          value: "all",
          label: t("admin.invoices.filters.allStatuses", "All Statuses"),
        },
        { value: "DRAFT", label: t("admin.invoices.status.draft", "Draft") },
        { value: "SENT", label: t("admin.invoices.status.sent", "Sent") },
        { value: "VIEWED", label: t("admin.invoices.status.viewed", "Viewed") },
        { value: "PAID", label: t("admin.invoices.status.paid", "Paid") },
        {
          value: "CANCELLED",
          label: t("admin.invoices.status.cancelled", "Cancelled"),
        },
      ],
    },
    {
      field: "paymentStatus",
      label: t("admin.invoices.filters.paymentStatus", "Payment Status"),
      type: "select",
      options: [
        {
          value: "all",
          label: t(
            "admin.invoices.filters.allPaymentStatuses",
            "All Payment Statuses"
          ),
        },
        {
          value: "UNPAID",
          label: t("admin.invoices.paymentStatus.unpaid", "Unpaid"),
        },
        {
          value: "PARTIALLY_PAID",
          label: t(
            "admin.invoices.paymentStatus.partiallyPaid",
            "Partially Paid"
          ),
        },
        {
          value: "PAID",
          label: t("admin.invoices.paymentStatus.paid", "Paid"),
        },
        {
          value: "REFUNDED",
          label: t("admin.invoices.paymentStatus.refunded", "Refunded"),
        },
      ],
    },
    {
      field: "date",
      label: t("admin.invoices.filters.date", "Invoice Date"),
      type: "date",
    },
  ];

  const tabOptions = [
    {
      value: "all",
      label: t("admin.invoices.tabs.all", "All"),
      count: invoices?.length || 0,
    },
  ];

  const columnOptions = [
    {
      field: "invoice_number",
      headerName: t("admin.invoices.columns.invoiceNumber", "Invoice Number"),
    },
    { field: "date", headerName: t("admin.invoices.columns.date", "Date") },
    {
      field: "customer",
      headerName: t("admin.invoices.columns.customer", "Customer"),
    },
    {
      field: "invoice_status",
      headerName: t("admin.invoices.columns.status", "Status"),
    },
    {
      field: "payment_status",
      headerName: t("admin.invoices.columns.paymentStatus", "Payment"),
    },
    {
      field: "grand_total",
      headerName: t("admin.invoices.columns.total", "Total"),
    },
  ];

  const columns: GridColDef<AdminInvoice>[] = [
    {
      field: "invoice_number",
      headerName: t("admin.invoices.columns.invoiceNumber", "Invoice Number"),
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <MuiLink
          href={`/${tenantSlug}/Crm/admin/invoices/manage?mode=VIEW&id=${params.row.id}`}
          onClick={(e) => {
            e.preventDefault();
            router.push(
              `/${tenantSlug}/Crm/admin/invoices/manage?mode=VIEW&id=${params.row.id}`
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
      field: "account_name",
      headerName: t("admin.invoices.columns.customer", "Customer"),
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: "issue_date",
      headerName: t("admin.invoices.columns.date", "Date"),
      width: 150,
      renderCell: (params) => {
        try {
          return format(parseISO(params.row.issue_date), "MMM dd, yyyy");
        } catch (error) {
          return params.value || "—";
        }
      },
    },
    {
      field: "total_amount",
      headerName: t("admin.invoices.columns.total", "Total"),
      width: 120,
      renderCell: (params) => {
        const currency = params.row.currency || "USD";
        return `${params.value} ${currency}`;
      },
    },
    {
      field: "invoice_status",
      headerName: t("admin.invoices.columns.status", "Status"),
      width: 130,
      renderCell: (params) => {
        // Early return if no row data or status
        if (!params.row || !params.row.invoice_status) {
          return <span>—</span>;
        }

        const status = params.row.invoice_status.toString();
        const statusMap: Record<
          string,
          "success" | "warning" | "error" | "info" | "default"
        > = {
          DRAFT: "default",
          SENT: "info",
          VIEWED: "info",
          PAID: "success",
          CANCELLED: "error",
        };

        return (
          <Chip
            label={t(`admin.invoices.status.${status.toLowerCase()}`, status)}
            color={statusMap[status] || "default"}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
        );
      },
    },
    {
      field: "payment_status",
      headerName: t("admin.invoices.columns.paymentStatus", "Payment"),
      width: 150,
      renderCell: (params) => {
        // Early return if no row data or payment status
        if (!params.row || !params.row.payment_status) {
          return <span>—</span>;
        }

        const status = params.row.payment_status.toString();
        const statusMap: Record<
          string,
          "success" | "warning" | "error" | "info" | "default"
        > = {
          UNPAID: "warning",
          PARTIALLY_PAID: "info",
          PAID: "success",
          REFUNDED: "error",
        };

        return (
          <Chip
            label={t(
              `admin.invoices.paymentStatus.${status.toLowerCase()}`,
              status.replace("_", " ")
            )}
            color={statusMap[status] || "default"}
            size="small"
            variant="outlined"
            sx={{ textTransform: "capitalize" }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("admin.invoices.columns.actions", "Actions"),
      width: 100,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Tooltip title={t("admin.invoices.edit", "Edit Invoice")}>
            <IconButton
              size="small"
              onClick={() => {
                router.push(
                  `/${tenantSlug}/Crm/admin/invoices/manage?mode=EDIT&id=${params.row.id}`
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

  // Handle pagination changes
  const handlePaginationModelChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    // Update query parameters for API call
    // If implementing pagination from the backend, you'd update state here
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Add search logic here
  };

  // Handle view change (list/grid)
  const handleViewChange = (view: "list" | "grid") => {
    setView(view);
  };

  // Handle filter changes
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
    // Update filters logic here
  };

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update tab filtering logic here
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
        <Typography variant="h4" component="h1">
          {t("admin.invoices.title", "Invoices")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() =>
            router.push(`/${tenantSlug}/Crm/admin/invoices/manage?mode=create`)
          }
        >
          {t("admin.invoices.createInvoice", "Create Invoice")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("admin.invoices.error", "Error loading invoices")}
        </Alert>
      )}

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
          rows={invoices || []}
          columns={columns}
          rowCount={pagination?.totalCount || 0}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[50, 100, 150]}
          disableRowSelectionOnClick
          loading={isLoading}
          paginationMode="server"
        />
      </ContentCard>
    </>
  );
}
