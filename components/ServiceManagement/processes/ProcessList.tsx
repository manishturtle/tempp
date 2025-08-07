"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, Typography, Chip, Tooltip } from "@mui/material";
import {
  GridColDef,
  GridRenderCellParams,
  GridPaginationModel,
} from "@mui/x-data-grid";

import ContentCard from "../../common/ContentCard";
import CustomDataGrid from "../../common/CustomDataGrid";
import { processesApi, Process } from "../../../services_service_management/processes";
import ProcessDrawer from "../processes/ProcessDrawer";

interface ProcessListProps {}

export interface ProcessListHandle {
  openAddDrawer: () => void;
}

const ProcessList = forwardRef<ProcessListHandle, ProcessListProps>(
  (props, ref) => {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(
      {
        page: 0,
        pageSize: 10,
      }
    );
    const [activeTab, setActiveTab] = useState("all");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<Process | null>(
      null
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
      "create"
    );

    // Define column structure for the data grid
    const columns: GridColDef[] = [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        ),
      },
      {
        field: "description",
        headerName: "Description",
        flex: 2,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" fontWeight="medium">
            {params.value || "N/A"}
          </Typography>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        renderCell: (params: GridRenderCellParams) => {
          const status = params.value as string;
          let color = "default";
          switch (status.toLowerCase()) {
            case "active":
              color = "success";
              break;
            case "inactive":
              color = "warning";
              break;
            case "archived":
              color = "default";
              break;
          }
          return (
            <Tooltip title={status} arrow>
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
                  label={status}
                  sx={{
                    ...(status === "Active" && {
                      backgroundColor: "success.light",
                    }),
                    ...(status === "Inactive" && {
                      backgroundColor: "warning.light",
                    }),
                    ...(status !== "Active" &&
                      status !== "Inactive" && {
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
        field: "updated_at",
        headerName: "Last Updated",
        width: 200,
        valueFormatter: (value) => {
          if (!value) return "";
          return new Date(value as string).toLocaleString();
        },
      },
    ];

    // Fetch processes data on initial load and pagination change
    useEffect(() => {
      fetchProcesses();
    }, [paginationModel.page, paginationModel.pageSize]);

    // Tab options for different process views
    const tabOptions = [
      { value: "all", label: "All", count: totalCount },
      {
        value: "Active",
        label: "Active",
        count: processes.filter((process) => process.status === "Active")
          .length,
      },
      {
        value: "Inactive",
        label: "Inactive",
        count: processes.filter((process) => process.status === "Inactive")
          .length,
      },
      {
        value: "Archived",
        label: "Archived",
        count: processes.filter((process) => process.status === "Archived")
          .length,
      },
    ];

    // Fetch processes data
    const fetchProcesses = async () => {
      try {
        setLoading(true);
        const response = await processesApi.getProcesses(
          paginationModel.page + 1, // API uses 1-based pagination
          paginationModel.pageSize
        );
        setProcesses(response.results);
        setTotalCount(response.count);
      } catch (error) {
        console.error("Error fetching processes:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleTabChange = (value: string) => {
      setActiveTab(value);
    };

    const handleAddNew = () => {
      setSelectedProcess(null);
      setDrawerOpen(true);
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      openAddDrawer: handleAddNew,
    }));

    const handleDrawerClose = () => {
      setViewMode("create");
      setDrawerOpen(false);
    };

    const handleProcessSuccess = () => {
      fetchProcesses();
    };

    return (
      <>
        <ContentCard
          tabOptions={tabOptions}
          onSearch={(query) => setSearchQuery(query)}
          onTabChange={handleTabChange}
        >
          <CustomDataGrid
            rows={(activeTab === "all"
              ? processes
              : processes.filter((process) => process.status === activeTab)
            ).filter((process) => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                (process.name || "").toLowerCase().includes(query) ||
                (process.description || "").toLowerCase().includes(query) ||
                (process.status || "").toLowerCase().includes(query)
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
            onRowClick={(params) => {
              setSelectedProcess(params.row as Process);
              setDrawerOpen(true);
              setViewMode("view");
            }}
            disableRowSelectionOnClick
            autoHeight
          />
        </ContentCard>

        {/* Process Drawer for Add/Edit */}
        <ProcessDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          mode={viewMode}
          process={selectedProcess}
          onSuccess={handleProcessSuccess}
        />
      </>
    );
  }
);

export default ProcessList;
