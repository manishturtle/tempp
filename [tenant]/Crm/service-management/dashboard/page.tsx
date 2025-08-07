"use client";

import React, { useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Pagination,
  Chip,
  IconButton,
} from "@mui/material";
import { styled, useTheme, Theme } from "@mui/material/styles";

// Icons
import InboxIcon from "@mui/icons-material/Inbox";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import TimerIcon from "@mui/icons-material/Timer";
import PauseCircleFilledIcon from "@mui/icons-material/PauseCircleFilled";
import Head from "next/head";

// MUI X Charts
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { blueGrey, lime, orange, red } from "@mui/material/colors";

// --- Data ---

const summaryCardsData = [
  {
    title: "My Assigned Tickets",
    value: "28",
    change: -4,
    changeText: "from yesterday",
    icon: <InboxIcon fontSize="large" color="primary" />,
  },
  {
    title: "Today's Incoming Tickets",
    value: "12",
    change: 8,
    changeText: "from yesterday",
    icon: <LockOpenIcon fontSize="large" color="primary" />,
  },
  {
    title: "Total Outstanding Tickets",
    value: "43",
    change: -2,
    changeText: "from yesterday",
    icon: <ErrorOutlineIcon fontSize="large" color="primary" />,
  },
  {
    title: "Tickets Solved Today",
    value: "7",
    change: -3,
    changeText: "from yesterday",
    icon: <CheckCircleOutlineIcon fontSize="large" color="primary" />,
  },
];

const pieChartData = [
  { id: 0, value: 15, label: "Low", color: lime[500] },
  { id: 1, value: 25, label: "Medium", color: blueGrey[500] },
  { id: 2, value: 18, label: "High", color: orange[500] },
  { id: 3, value: 8, label: "Urgent", color: red[500] },
];

const ticketsData = [
  {
    id: "#T-1234",
    subject: "Login issues with mobile app",
    customer: "John Smith",
    priority: "Urgent",
    status: "In Progress",
    created: "2023-06-24",
    sla: { status: "danger", text: "1h 12m left" },
  },
  {
    id: "#T-1235",
    subject: "Billing discrepancy on invoice #9876",
    customer: "Emma Johnson",
    priority: "High",
    status: "Waiting on Customer",
    created: "2023-06-23",
    sla: { status: "paused", text: "Paused" },
  },
  {
    id: "#T-1236",
    subject: "Feature request: Dark mode support",
    customer: "Michael Brown",
    priority: "Medium",
    status: "New",
    created: "2023-06-23",
    sla: { status: "ok", text: "2d 4h left" },
  },
  {
    id: "#T-1237",
    subject: "Password reset not working",
    customer: "Sophia Lee",
    priority: "High",
    status: "In Progress",
    created: "2023-06-22",
    sla: { status: "warning", text: "4h 32m left" },
  },
  {
    id: "#T-1238",
    subject: "Syncing issues between devices",
    customer: "David Wilson",
    priority: "Low",
    status: "New",
    created: "2023-06-22",
    sla: { status: "ok", text: "3d 2h left" },
  },
];

// --- Styled Components ---

const StatusChip = styled(Chip)(
  ({ theme, status }: { theme?: Theme; status: string }) => {
    const statusStyles: { [key: string]: React.CSSProperties } = {
      Urgent: { backgroundColor: "#fee2e2", color: "#dc2626" },
      High: { backgroundColor: "#ffedd5", color: "#f97316" },
      Medium: { backgroundColor: "#fef3c7", color: "#d97706" },
      Low: { backgroundColor: "#dcfce7", color: "#16a34a" },
      "In Progress": { backgroundColor: "#ccfbf1", color: "#0d9488" },
      "Waiting on Customer": { backgroundColor: "#e0e7ff", color: "#4f46e5" },
      New: { backgroundColor: "#e0f2fe", color: "#0ea5e9" },
    };
    return {
      ...statusStyles[status],
      borderRadius: "16px",
      fontSize: "0.75rem",
      height: "24px",
    };
  }
);

// --- Main Component ---

export default function ServiceAnalyticsDashboard() {
  const theme = useTheme();

  useEffect(() => {
    document.title = `Dashboard`;
  }, []);

  const renderSlaStatus = (sla: { status: string; text: string }) => {
    const statusConfig = {
      danger: {
        icon: <TimerIcon sx={{ fontSize: "1.2rem" }} />,
        color: theme.palette.error.main,
      },
      warning: {
        icon: <TimerIcon sx={{ fontSize: "1.2rem" }} />,
        color: theme.palette.warning.dark,
      },
      ok: {
        icon: <TimerIcon sx={{ fontSize: "1.2rem" }} />,
        color: theme.palette.success.main,
      },
      paused: {
        icon: <PauseCircleFilledIcon sx={{ fontSize: "1.2rem" }} />,
        color: theme.palette.info.main,
      },
    };
    const config = statusConfig[sla.status as keyof typeof statusConfig];

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: config.color,
          gap: 0.5,
        }}
      >
        {config.icon}
        <Typography
          variant="body2"
          component="span"
          sx={{ whiteSpace: "nowrap" }}
        >
          {sla.text}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      <Head>
        <title>Dashboard</title>
        <meta name="description" content="Dashboard" />
      </Head>
      <div>
        {/* Header */}
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 4, fontWeight: "medium", color: "text.secondary" }}
        >
          Service Analytics
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryCardsData.map((card, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                  {card.icon}
                </Box>
                <Typography variant="h3" sx={{ fontWeight: "bold", mt: 1 }}>
                  {card.value}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mt: 1,
                    color: card.change > 0 ? "error.main" : "success.main",
                  }}
                >
                  {card.change > 0 ? (
                    <ArrowUpwardIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  ) : (
                    <ArrowDownwardIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  )}
                  <Typography variant="body2">{`${Math.abs(card.change)}% ${
                    card.changeText
                  }`}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h3">
                  Tickets by Priority
                </Typography>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <Box sx={{ height: 300, position: "relative" }}>
                <PieChart
                  series={[
                    {
                      data: pieChartData,
                      innerRadius: 80,
                      outerRadius: 140,
                      cx: "50%",
                      cy: "50%",
                    },
                  ]}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 2,
                  mt: 2,
                }}
              >
                {pieChartData.map((item) => (
                  <Box
                    key={item.label}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: item.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h3">
                  Tickets by Source
                </Typography>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <Box sx={{ height: 328 }}>
                <BarChart
                  xAxis={[
                    {
                      data: ["Email", "Phone", "Web Portal", "Chatbot"],
                      scaleType: "band",
                    },
                  ]}
                  series={[{ data: [12, 8, 15, 5] }]}
                  height={300}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Active Tickets Table */}
        <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              component="h3"
              sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
            >
              My Active Tickets
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                width: { xs: "100%", md: "auto" },
              }}
            >
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search tickets..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 },
                }}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="contained"
                startIcon={<FilterListIcon />}
                sx={{
                  py: 1,
                  px: 2,
                  textTransform: "none",
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                }}
              >
                Advanced Filter
              </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  {[
                    "TICKET ID",
                    "SUBJECT",
                    "CUSTOMER",
                    "PRIORITY",
                    "STATUS",
                    "DATE CREATED",
                    "SLA STATUS",
                  ].map((headCell) => (
                    <TableCell key={headCell}>
                      <TableSortLabel active direction="asc">
                        {headCell}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ticketsData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.subject}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>
                      <StatusChip status={row.priority} label={row.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={row.status} label={row.status} />
                    </TableCell>
                    <TableCell>{row.created}</TableCell>
                    <TableCell>{renderSlaStatus(row.sla)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            sx={{
              display: "flex",
              justifyContent: { xs: "center", sm: "space-between" },
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              p: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Showing 5 of 28 tickets
            </Typography>
            <Pagination count={3} variant="outlined" shape="rounded" />
          </Box>
        </Paper>
      </div>
    </>
  );
}
