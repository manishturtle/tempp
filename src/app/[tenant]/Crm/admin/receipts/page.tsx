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
import { useGetReceipts } from "@/app/hooks/api/receipts";
import EditIcon from "@mui/icons-material/Edit";

export default function AdminReceiptsPage() {
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

  // Fetch receipts using our custom hook
  const {
    data: receipts,
    isLoading,
    error,
  } = useGetReceipts();

  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: "receiptNumber",
      label: t("admin.receipts.filters.receiptNumber", "Receipt Number"),
      type: "text",
    },
    {
      field: "customer",
      label: t("admin.receipts.filters.customer", "Customer"),
      type: "text",
    },
    {
      field: "paymentMethod",
      label: t("admin.receipts.filters.paymentMethod", "Payment Method"),
      type: "text",
    },
    {
      field: "date",
      label: t("admin.receipts.filters.date", "Receipt Date"),
      type: "date",
    },
  ];

  const tabOptions = [
    {
      value: "all",
      label: t("admin.receipts.tabs.all", "All"),
      count: receipts?.length || 0,
    },
  ];

  const columnOptions = [
    {
      field: "receipt_number",
      headerName: t("admin.receipts.columns.receiptNumber", "Receipt Number"),
    },
    {
      field: "account_name",
      headerName: t("admin.receipts.columns.customerName", "Customer Name"),
    },
    {
      field: "amount_received",
      headerName: t("admin.receipts.columns.amountReceived", "Amount Received"),
    },
    {
      field: "receipt_date",
      headerName: t("admin.receipts.columns.receiptDate", "Receipt Date"),
    },
    {
      field: "payment_method_name",
      headerName: t("admin.receipts.columns.paymentMethod", "Payment Method"),
    },
    {
      field: "updated_at",
      headerName: t("admin.receipts.columns.lastUpdated", "Last Updated"),
    },
  ];

  // Format currency in Indian numbering system
  const formatIndianCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: t("admin.receipts.columns.id", "ID"),
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "account_name",
      headerName: t("admin.receipts.columns.customerName", "Customer Name"),
      width: 200,
      renderCell: (params) => {
        if (!params.row || !params.row.account_name) {
          return <span>—</span>;
        }
        return (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.account_name}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "receipt_number",
      headerName: t("admin.receipts.columns.receiptNumber", "Receipt Number"),
      width: 150,
      renderCell: (params) => {
        if (!params.row || !params.row.receipt_number) {
          return <span>—</span>;
        }
        return (
          <MuiLink
            component="button"
            variant="body2"
            onClick={() => {
              router.push(
                `/${tenantSlug}/Crm/admin/receipts/manage?mode=VIEW&id=${params.row.id}`
              );
            }}
            sx={{
              textDecoration: "none",
              color: "primary.main",
              fontWeight: "medium",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {params.row.receipt_number}
          </MuiLink>
        );
      },
    },
    {
      field: "amount_received",
      headerName: t("admin.receipts.columns.amountReceived", "Amount Received"),
      width: 150,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        if (!params.row || params.row.amount_received === null || params.row.amount_received === undefined) {
          return <span>—</span>;
        }
        return (
          <Typography variant="body2" fontWeight="medium">
            {formatIndianCurrency(parseFloat(params.row.amount_received))}
          </Typography>
        );
      },
    },
    {
      field: "receipt_date",
      headerName: t("admin.receipts.columns.receiptDate", "Receipt Date"),
      width: 130,
      renderCell: (params) => {
        if (!params.row || !params.row.receipt_date) {
          return <span>—</span>;
        }
        try {
          const date = parseISO(params.row.receipt_date);
          return (
            <Typography variant="body2">
              {format(date, "MMM dd, yyyy")}
            </Typography>
          );
        } catch {
          return <span>—</span>;
        }
      },
    },
    {
      field: "payment_method_name",
      headerName: t("admin.receipts.columns.paymentMethod", "Payment Method"),
      width: 150,
      renderCell: (params) => {
        if (!params.row || !params.row.payment_method_name) {
          return <span>—</span>;
        }
        return (
          <Chip
            label={params.row.payment_method_name}
            color="primary"
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: "updated_at",
      headerName: t("admin.receipts.columns.lastUpdated", "Last Updated"),
      width: 150,
      renderCell: (params) => {
        if (!params.row || !params.row.updated_at) {
          return <span>—</span>;
        }
        try {
          const date = parseISO(params.row.updated_at);
          return (
            <Typography variant="body2" color="text.secondary">
              {format(date, "MMM dd, yyyy HH:mm")}
            </Typography>
          );
        } catch {
          return <span>—</span>;
        }
      },
    },
    {
      field: "actions",
      headerName: t("admin.receipts.columns.actions", "Actions"),
      width: 100,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Tooltip title={t("admin.receipts.edit", "Edit Receipt")}>
            <IconButton
              size="small"
              onClick={() => {
                router.push(
                  `/${tenantSlug}/Crm/admin/receipts/manage?mode=EDIT&id=${params.row.id}`
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
          {t("admin.receipts.title", "Receipts")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() =>
            router.push(`/${tenantSlug}/Crm/admin/receipts/manage?mode=Create`)
          }
        >
          {t("admin.receipts.createReceipt", "Create Receipt")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("admin.receipts.error", "Error loading receipts")}
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
          rows={receipts || []}
          columns={columns}
          rowCount={receipts?.length || 0}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[50, 100, 150]}
          disableRowSelectionOnClick
          loading={isLoading}
          paginationMode="client"
        />
      </ContentCard>
    </>
  );
}