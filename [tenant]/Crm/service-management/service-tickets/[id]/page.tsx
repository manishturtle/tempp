"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Container,
  IconButton,
  CircularProgress,
  Divider,
  Grid,
  Chip,
} from "@mui/material";
import { useMultiTenantRouter } from "../../../../../hooks/service-management/useMultiTenantRouter";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import ServiceTicketDrawer from "../../../../../components/ServiceManagement/service-tickets/ServiceTicketDrawer";
import Tasks from "../../../../../components/ServiceManagement/service-tickets/Tasks";
import {
  ServiceTicket,
  serviceTicketsApi,
} from "../../../../../services_service_management/serviceTickets";
import { useParams } from "next/navigation";
import { format } from "date-fns";

export default function ServiceTicketView() {
  const router = useMultiTenantRouter();
  const params = useParams();
  const ticketId = params.id;
  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Tasks");
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">("edit");

  useEffect(() => {
    document.title = `Service Ticket | ${ticket?.ticket_id || ""}`;
  }, [ticket]);

  const fetchTicket = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await serviceTicketsApi.getTicketById(
        parseInt(ticketId as string, 10)
      );
      setTicket(data);
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTicket(false);
  };

  const handleEditClick = () => {
    setDrawerOpen(true);
    setViewMode("edit");
  };

  const handleSuccess = () => {
    setDrawerOpen(false);
    fetchTicket(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "primary";
      case "open":
        return "info";
      case "pending input":
        return "warning";
      case "on hold":
        return "secondary";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      // Check if the time part is not midnight (00:00:00)
      const hasTime =
        date.getHours() !== 0 ||
        date.getMinutes() !== 0 ||
        date.getSeconds() !== 0;
      // If it has a meaningful time component, include it in the display
      return hasTime
        ? format(date, "MMM dd, yyyy HH:mm")
        : format(date, "MMM dd, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          mt: 4,
          mb: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (!ticket) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h6" color="error">
          Ticket not found or error loading ticket details.
        </Typography>
      </Container>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ mb: "0px !important" }}>
          {ticket.ticket_id} | {ticket.subject}
        </Typography>
        <Box sx={{ ml: "auto" }}>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={handleEditClick}>
            <EditIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Service User Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Name:
              </Typography>
              <Typography>
                {ticket.service_user?.first_name}{" "}
                {ticket.service_user?.last_name}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Email:
              </Typography>
              <Typography>{ticket.service_user?.email}</Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Assigned To:
              </Typography>
              <Typography>
                {ticket.assigned_agent
                  ? ticket.assigned_agent.first_name +
                    " " +
                    ticket.assigned_agent.last_name
                  : "Not assigned"}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Status:
              </Typography>
              <Chip
                label={ticket.status || "New"}
                color={getStatusColor(ticket.status || "New")}
                size="small"
              />
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Priority:
              </Typography>
              <Chip
                label={ticket.priority || "Not set"}
                color={getPriorityColor(ticket.priority || "")}
                size="small"
                variant={!ticket.priority ? "outlined" : "filled"}
              />
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Created On:
              </Typography>
              <Typography>{formatDate(ticket.created_at)}</Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Target Resolution Date:
              </Typography>
              <Typography>
                {formatDate(ticket.target_resolution_date)}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Resolved At:
              </Typography>
              <Typography>
                {ticket.resolved_at
                  ? formatDate(ticket.resolved_at)
                  : "Not resolved yet"}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Closed On:
              </Typography>
              <Typography>
                {ticket.closed_at
                  ? formatDate(ticket.closed_at)
                  : "Not closed yet"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Description:
              </Typography>
              <Typography style={{ whiteSpace: "pre-wrap" }}>
                {ticket.body || "No description provided."}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          {/* <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              mb: 1,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              aria-label="main tabs"
            >
              <Tab label="Tasks" value="Tasks" />
              <Tab label="Documents" value="Documents" disabled />
              <Tab label="Credentials" value="Credentials" disabled />
              <Tab label="History" value="History" disabled />
              <Tab label="Notes" value="Notes" disabled />
              <Tab label="Messages" value="Messages" disabled />
            </Tabs>
          </Box> */}
          <Box>
            {activeTab === "Tasks" && ticket && (
              <Tasks ticket={ticket} onRefresh={handleRefresh} />
            )}
          </Box>
        </Grid>
      </Grid>

      <ServiceTicketDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticketId={parseInt(ticketId, 10)}
        onSuccess={handleSuccess}
        mode={viewMode}
      />
    </Box>
  );
}
