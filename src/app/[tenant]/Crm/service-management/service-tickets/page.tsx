"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  GridColDef,
  GridRenderCellParams,
  GridPaginationModel,
} from "@mui/x-data-grid";

import ContentCard from "../../../../components/common/ContentCard";
import CustomDataGrid from "../../../../components/common/CustomDataGrid";
import {
  serviceTicketsApi,
  ServiceTicket,
} from "../../../../services_service_management/serviceTickets";

import { useMultiTenantRouter } from "../../../../hooks/service-management/useMultiTenantRouter";
import ServiceTicketDrawer from "../../../../components/ServiceManagement/service-tickets/ServiceTicketDrawer";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";

export default function ServiceTickets() {
  const router = useMultiTenantRouter();
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | undefined>(
    undefined
  );
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
    "create"
  );

  useEffect(() => {
    document.title = `Service Tickets`;
  }, []);

  // Define column structure for the data grid
  const columns: GridColDef[] = [
    {
      field: "ticket_id",
      headerName: "Ticket ID",
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="medium" color="primary.main">
          {params.value}
        </Typography>
      ),
    },
    { field: "subject", headerName: "Subject", width: 200 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const statusText = (params.value as string) || "";
        return (
          <Tooltip title={statusText} arrow>
            <Box
              sx={{
                width: 90,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              <Chip
                label={statusText}
                sx={{
                  ...(statusText.toLowerCase() === "new" && {
                    backgroundColor: "info.light",
                  }),
                  ...(statusText.toLowerCase() === "in progress" && {
                    backgroundColor: "warning.light",
                  }),
                  ...(statusText.toLowerCase() === "resolved" && {
                    backgroundColor: "success.light",
                  }),
                  ...(statusText.toLowerCase() === "closed" && {
                    backgroundColor: "action.selected",
                  }),
                  width: "100%",
                  maxWidth: "100%",
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  },
                }}
                size="small"
              />
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const priorityText = (params.value as string) || "";
        return (
          <Tooltip title={priorityText} arrow>
            <Box
              sx={{
                width: 90,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              <Chip
                label={priorityText}
                sx={{
                  ...(priorityText.toLowerCase() === "low" && {
                    backgroundColor: "info.light",
                  }),
                  ...(priorityText.toLowerCase() === "medium" && {
                    backgroundColor: "warning.light",
                  }),
                  ...(priorityText.toLowerCase() === "high" && {
                    backgroundColor: "error.light",
                  }),
                  width: "100%",
                  maxWidth: "100%",
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  },
                }}
                size="small"
              />
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "service_user",
      headerName: "Requester",
      flex: 1,
      valueGetter: (value, row) => {
        return `${row?.service_user?.first_name} ${row?.service_user?.last_name}`;
      },
    },
    {
      field: "assigned_agent",
      headerName: "Assigned Agent",
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return "N/A";
        return (
          <Typography variant="body2" fontWeight="medium" color="primary.main">
            {params.value.first_name} {params.value.last_name}
          </Typography>
        );
      },
    },
    {
      field: "created_at",
      headerName: "Created On",
      width: 180,
      valueFormatter: (value) => {
        if (!value) return "";
        return new Date(value as string).toLocaleString();
      },
    },
    {
      field: "target_resolution_date",
      headerName: "Target Resolution",
      width: 180,
      valueFormatter: (value, row) => {
        if (!value) return "N/A";
        return new Date(value as string).toLocaleString();
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View Ticket Details">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`Crm/service-management/service-tickets/${params.row.id}`);
              }}
            >
              <ArrowRightAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Fetch tickets data on pagination change
  useEffect(() => {
    fetchTickets();
  }, [paginationModel.page, paginationModel.pageSize]);

  // Filter options for the ContentCard
  const filterOptions = [
    {
      field: "status",
      label: "Status",
      type: "select" as const,
      options: [
        { value: "New", label: "New" },
        { value: "In Progress", label: "In Progress" },
        { value: "Resolved", label: "Resolved" },
        { value: "Closed", label: "Closed" },
      ],
    },
    {
      field: "priority",
      label: "Priority",
      type: "select" as const,
      options: [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ],
    },
  ];

  // Tab options for different ticket views
  const tabOptions = [
    { value: "all", label: "All Tickets", count: totalCount },
    {
      value: "New",
      label: "New",
      count: tickets.filter((ticket) => ticket.status === "New").length,
    },
    {
      value: "Open",
      label: "Open",
      count: tickets.filter((ticket) => ticket.status === "Open").length,
    },
    {
      value: "Pending Input",
      label: "Pending Input",
      count: tickets.filter((ticket) => ticket.status === "Pending Input")
        .length,
    },
    {
      value: "On Hold",
      label: "On Hold",
      count: tickets.filter((ticket) => ticket.status === "On Hold").length,
    },
    {
      value: "Resolved",
      label: "Resolved",
      count: tickets.filter((ticket) => ticket.status === "Resolved").length,
    },
    {
      value: "Closed",
      label: "Closed",
      count: tickets.filter((ticket) => ticket.status === "Closed").length,
    },
  ];

  // Handle row click to view ticket details
  const handleRowClick = (params: any) => {
    setSelectedTicketId(params.id);
    setViewMode("view");
    setDrawerOpen(true);
  };

  // Handle refresh data after ticket create/update
  const handleTicketSuccess = () => {
    fetchTickets();
  };

  // Fetch tickets data
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await serviceTicketsApi.getTickets(
        paginationModel.page + 1, // API uses 1-based pagination
        paginationModel.pageSize
      );
      setTickets(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error("Error fetching service tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Service Tickets
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedTicketId(undefined);
            setViewMode("create");
            setDrawerOpen(true);
          }}
        >
          New Ticket
        </Button>
      </Box>

      <ContentCard
        filterOptions={filterOptions}
        tabOptions={tabOptions}
        onSearch={(query) => setSearchQuery(query)}
        onTabChange={handleTabChange}
      >
        <CustomDataGrid
          rows={(activeTab === "all"
            ? tickets
            : tickets.filter((ticket) => ticket.status === activeTab)
          ).filter((ticket) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
              String(ticket.id).includes(query) ||
              (ticket.subject || "").toLowerCase().includes(query) ||
              (ticket.status || "").toLowerCase().includes(query) ||
              (ticket.priority || "").toLowerCase().includes(query) ||
              (ticket.service_user?.email || "")
                .toLowerCase()
                .includes(query) ||
              `${ticket.service_user?.first_name || ""} ${
                ticket.service_user?.last_name || ""
              }`
                .toLowerCase()
                .includes(query) ||
              (ticket.assigned_agent?.email || "")
                .toLowerCase()
                .includes(query) ||
              `${ticket.assigned_agent?.first_name || ""} ${
                ticket.assigned_agent?.last_name || ""
              }`
                .toLowerCase()
                .includes(query)
            );
          })}
          columns={columns}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          rowCount={totalCount}
          paginationMode="server"
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          disableRowSelectionOnClick
          autoHeight
        />
      </ContentCard>

      {/* Service Ticket Drawer Component */}
      <ServiceTicketDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setViewMode("create");
        }}
        ticketId={selectedTicketId}
        onSuccess={handleTicketSuccess}
        mode={viewMode}
      />
    </Box>
  );
}
