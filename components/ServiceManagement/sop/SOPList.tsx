"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { useMultiTenantRouter } from "../../../hooks/service-management/useMultiTenantRouter";
import {
  GridColDef,
  GridRenderCellParams,
  GridPaginationModel,
} from "@mui/x-data-grid";
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import ContentCard from "../../common/ContentCard";
import CustomDataGrid from "../../common/CustomDataGrid";
import { sopApi, SOP } from "../../../services_service_management/sop";
import SOPDrawer from "./SOPDrawer";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";

interface SOPListProps {}

export interface SOPListHandle {
  openAddDrawer: () => void;
}

const SOPList = forwardRef<SOPListHandle, SOPListProps>((props, ref) => {
  const router = useMultiTenantRouter();
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
    "create"
  );

  // Define column structure for the data grid
  const columns: GridColDef[] = [
    {
      field: "sop_name",
      headerName: "Name",
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value || ""} arrow>
          <Typography
            sx={{
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
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
                  ...(statusText === "Superseded" && {
                    backgroundColor: "warning.light",
                  }),
                  ...(statusText !== "Active" &&
                    statusText !== "Superseded" && {
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
      field: "effective_date",
      headerName: "Effective Date",
      width: 150,
      valueFormatter: (value) => {
        if (!value) return "Not Set";
        try {
          return format(new Date(value), "MMM dd, yyyy");
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      field: "process_name",
      headerName: "Process",
      width: 150,
      valueGetter: (value, row) => row?.sop_group?.process?.name || "N/A",
    },
    {
      field: "updated_at",
      headerName: "Last Updated",
      width: 150,
      valueFormatter: (value) => {
        try {
          return format(new Date(value), "MMM dd, yyyy");
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="View Steps">
            <IconButton
              aria-label="view"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/sop/${params.row.id}`);
              }}
            >
              <ArrowRightAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Tab options for the ContentCard
  const tabOptions = [
    { value: "all", label: "All", count: totalCount },
    {
      value: "Active",
      label: "Active",
      count: sops.filter((sop) => sop.status === "Active").length,
    },
    {
      value: "Superseded",
      label: "Superseded",
      count: sops.filter((sop) => sop.status === "Superseded").length,
    },
    {
      value: "Archived",
      label: "Archived",
      count: sops.filter((sop) => sop.status === "Archived").length,
    },
  ];

  // Fetch SOPs data
  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const response = await sopApi.getSOPs(
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      setSOPs(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error("Error fetching SOPs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load and refresh when pagination or filters change
  useEffect(() => {
    fetchSOPs();
  }, [paginationModel.page, paginationModel.pageSize]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleAddNew = () => {
    setSelectedSOP(null);
    setDrawerOpen(true);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openAddDrawer: handleAddNew,
  }));

  const handleDrawerClose = () => {
    setViewMode("create");
    setSelectedSOP(null);
    setDrawerOpen(false);
  };

  const handleSOPSuccess = () => {
    fetchSOPs();
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
            ? sops
            : sops.filter((sop) => sop.status === activeTab)
          ).filter((sop) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
              (sop.sop_name || "").toLowerCase().includes(query) ||
              (sop.description || "").toLowerCase().includes(query) ||
              (sop.status || "").toLowerCase().includes(query) ||
              (sop.sop_group?.process?.name || "").toLowerCase().includes(query)
            );
          })}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25]}
          rowCount={totalCount}
          loading={loading}
          onRowClick={(params) => {
            setSelectedSOP(params.row as SOP);
            setDrawerOpen(true);
            setViewMode("view");
          }}
          autoHeight
        />
      </ContentCard>

      {/* SOP Drawer for Add/Edit */}
      <SOPDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        sop={selectedSOP}
        onSuccess={handleSOPSuccess}
        mode={viewMode}
      />
    </>
  );
});

export default SOPList;
