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
import { processGroupsApi, ProcessGroup } from "../../../services_service_management/processGroups";
import ProcessGroupDrawer from "../process-groups/ProcessGroupDrawer";
import { useConfirm } from "../../common/useConfirm";

interface ProcessGroupListProps {}

export interface ProcessGroupListHandle {
  openAddDrawer: () => void;
}

const ProcessGroupList = forwardRef<ProcessGroupListHandle, ProcessGroupListProps>(
  (props, ref) => {
    const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([]);
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
    const [selectedProcessGroup, setSelectedProcessGroup] = useState<ProcessGroup | null>(
      null
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
      "create"
    );

    // Use confirm dialog hook
    const { confirm, ConfirmDialog } = useConfirm();

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
        field: "is_active",
        headerName: "Status",
        width: 130,
        renderCell: (params: GridRenderCellParams) => {
          const isActive = params.value as boolean;
          const status = isActive ? "Active" : "Inactive";
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

    // Fetch process groups data on initial load and pagination change
    useEffect(() => {
      fetchProcessGroups();
    }, [paginationModel.page, paginationModel.pageSize]);

    // Tab options for different process group views
    const tabOptions = [
      { value: "all", label: "All", count: totalCount },
      {
        value: "active",
        label: "Active",
        count: processGroups.filter((group) => group.is_active).length,
      },
      {
        value: "inactive",
        label: "Inactive",
        count: processGroups.filter((group) => !group.is_active).length,
      },
    ];

    // Fetch process groups data
    const fetchProcessGroups = async () => {
      try {
        setLoading(true);
        const response = await processGroupsApi.getProcessGroups(
          paginationModel.page + 1, // API uses 1-based pagination
          paginationModel.pageSize
        );
        setProcessGroups(response.results);
        setTotalCount(response.count);
      } catch (error) {
        console.error("Error fetching process groups:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleTabChange = (value: string) => {
      setActiveTab(value);
    };

    const handleAddNew = () => {
      setSelectedProcessGroup(null);
      setViewMode("create");
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

    const handleProcessGroupSuccess = () => {
      fetchProcessGroups();
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
              ? processGroups
              : activeTab === "active"
              ? processGroups.filter((group) => group.is_active)
              : processGroups.filter((group) => !group.is_active)
            ).filter((group) => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                (group.name || "").toLowerCase().includes(query) ||
                (group.description || "").toLowerCase().includes(query)
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
              setSelectedProcessGroup(params.row as ProcessGroup);
              setDrawerOpen(true);
              setViewMode("view");
            }}
            disableRowSelectionOnClick
            autoHeight
          />
        </ContentCard>

        {/* Process Group Drawer for Add/Edit */}
        <ProcessGroupDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          mode={viewMode}
          processGroup={selectedProcessGroup}
          onSuccess={handleProcessGroupSuccess}
        />

        {/* Confirmation Dialog */}
        <ConfirmDialog />
      </>
    );
  }
);

export default ProcessGroupList;
