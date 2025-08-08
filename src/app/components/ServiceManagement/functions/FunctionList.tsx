"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, Typography, Tooltip, Chip } from "@mui/material";
import {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import { format } from "date-fns";
import ContentCard from "../../common/ContentCard";
import CustomDataGrid from "../../common/CustomDataGrid";
import { functionsApi, FunctionData } from "../../../services_service_management/functions";
import FunctionDrawer from "../functions/FunctionDrawer";

interface TabOption {
  value: string;
  label: string;
  count: number;
}

interface FunctionListProps {}

// Define type for the exposed methods
export interface FunctionListHandle {
  openAddDrawer: () => void;
}

const FunctionList = forwardRef<FunctionListHandle, FunctionListProps>(
  (props, ref) => {
    const [functions, setFunctions] = useState<FunctionData[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // States for drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedFunction, setSelectedFunction] =
      useState<FunctionData | null>(null);
    const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
      "create"
    );

    // Pagination model
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(
      {
        pageSize: 10,
        page: 0,
      }
    );

    // Search and filter
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Expose the openAddDrawer method to the parent component
    useImperativeHandle(ref, () => ({
      openAddDrawer: () => {
        setSelectedFunction(null);
        setDrawerOpen(true);
      },
    }));

    const columns: GridColDef[] = [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        renderCell: (params) => (
          <Tooltip title={params.value?.toString() || ""} arrow>
            <Typography
              sx={{
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {params.value?.toString()}
            </Typography>
          </Tooltip>
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
        flex: 1,
        renderCell: (params: GridRenderCellParams) => {
          const statusText = params.value || "";
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
                    ...(statusText === "Active" && {
                      backgroundColor: "success.light",
                    }),
                    ...(statusText === "Inactive" && {
                      backgroundColor: "warning.light",
                    }),
                    ...(statusText !== "Active" &&
                      statusText !== "Inactive" && {
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
        width: 150,
        valueFormatter: (value) => {
          try {
            return format(new Date(value as string), "MMM dd, yyyy");
          } catch (error) {
            return "Invalid Date";
          }
        },
      },
    ];

    // Tab options for the ContentCard
    const tabOptions: TabOption[] = [
      { value: "all", label: "All", count: totalCount },
      {
        value: "Active",
        label: "Active",
        count: functions.filter((func) => func.status === "Active").length,
      },
      {
        value: "Inactive",
        label: "Inactive",
        count: functions.filter((func) => func.status === "Inactive").length,
      },
      {
        value: "Archived",
        label: "Archived",
        count: functions.filter((func) => func.status === "Archived").length,
      },
    ];

    // Fetch functions data
    const fetchFunctions = async () => {
      try {
        setLoading(true);
        const response = await functionsApi.getFunctions(
          paginationModel.page + 1,
          paginationModel.pageSize
        );
        setFunctions(response.results);
        setTotalCount(response.count);
      } catch (error) {
        console.error("Error fetching functions:", error);
      } finally {
        setLoading(false);
      }
    };

    // Effect for fetching functions on pagination or filter change
    useEffect(() => {
      fetchFunctions();
    }, [paginationModel]);

    // Handle drawer close
    const handleDrawerClose = () => {
      setDrawerOpen(false);
      setSelectedFunction(null);
      setViewMode("create");
    };

    // Handle function save success
    const handleFunctionSuccess = () => {
      fetchFunctions();
    };

    // Handle tab change
    const handleTabChange = (value: string) => {
      setActiveTab(value);
      setPaginationModel((prev) => ({ ...prev, page: 0 })); // Reset to first page
    };

    return (
      <>
        <ContentCard
          sx={{ height: "100%" }}
          tabOptions={tabOptions}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        >
          <CustomDataGrid
            columns={columns}
            rows={functions}
            rowCount={totalCount}
            paginationModel={paginationModel}
            paginationMode="server"
            onPaginationModelChange={setPaginationModel}
            loading={loading}
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            onRowClick={(params) => {
              setSelectedFunction(params.row);
              setDrawerOpen(true);
              setViewMode("view");
            }}
            autoHeight
          />
        </ContentCard>

        {/* Function Drawer for Add/Edit */}
        <FunctionDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          functionData={selectedFunction}
          onSuccess={handleFunctionSuccess}
          mode={viewMode}
        />
      </>
    );
  }
);

FunctionList.displayName = "FunctionList";

export default FunctionList;
