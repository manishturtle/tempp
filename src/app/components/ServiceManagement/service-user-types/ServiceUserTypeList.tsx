"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, Typography, Tooltip, Chip } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { format } from "date-fns";
import ContentCard from "../../common/ContentCard";
import CustomDataGrid from "../../common/CustomDataGrid";
import {
  serviceUserTypesApi,
  ServiceUserType,
} from "../../../services_service_management/serviceUserTypes";
import ServiceUserTypeDrawer from "../service-user-types/ServiceUserTypeDrawer";

interface TabOption {
  value: string;
  label: string;
  count: number;
}

interface ServiceUserTypeListProps {}

// Define type for the exposed methods
export interface ServiceUserTypeListHandle {
  openAddDrawer: () => void;
}

const ServiceUserTypeList = forwardRef<
  ServiceUserTypeListHandle,
  ServiceUserTypeListProps
>((props, ref) => {
  const [serviceUserTypes, setServiceUserTypes] = useState<ServiceUserType[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // States for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedServiceUserType, setSelectedServiceUserType] =
    useState<ServiceUserType | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
    "create"
  );

  // Pagination model
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Expose the openAddDrawer method to the parent component
  useImperativeHandle(ref, () => ({
    openAddDrawer: () => {
      setSelectedServiceUserType(null);
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
    { field: "description", headerName: "Description", flex: 2 },
    {
      field: "service_user_group",
      headerName: "User Group",
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const groupText = params.value || "";
        return (
          <Tooltip title={groupText} arrow>
            <Typography
              sx={{
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {groupText}
            </Typography>
          </Tooltip>
        );
      },
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
      count: serviceUserTypes.filter((type) => type.status === "Active").length,
    },
    {
      value: "Inactive",
      label: "Inactive",
      count: serviceUserTypes.filter((type) => type.status === "Inactive")
        .length,
    },
  ];

  // Fetch service user types data
  const fetchServiceUserTypes = async () => {
    try {
      setLoading(true);
      const response = await serviceUserTypesApi.getServiceUserTypes(
        paginationModel.page + 1,
        paginationModel.pageSize,
      );
      setServiceUserTypes(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error("Error fetching service user types:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect for fetching service user types on pagination or filter change
  useEffect(() => {
    fetchServiceUserTypes();
  }, [paginationModel]);

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedServiceUserType(null);
    setViewMode("create");
  };

  // Handle service user type save success
  const handleServiceUserTypeSuccess = () => {
    fetchServiceUserTypes();
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <>
      <ContentCard
        sx={{ height: "100%" }}
        tabOptions={tabOptions}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSearch={(query) => setSearchQuery(query)}
      >
        <CustomDataGrid
          columns={columns}
          rows={(activeTab === "all"
            ? serviceUserTypes
            : serviceUserTypes.filter((type) => type.status === activeTab)
          ).filter((type) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
              (type.name || "").toLowerCase().includes(query) ||
              (type.description || "").toLowerCase().includes(query) ||
              (type.status || "").toLowerCase().includes(query)
            );
          })}
          rowCount={totalCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25]}
          loading={loading}
          paginationMode="server"
          autoHeight
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          onRowClick={(params) => {
            setSelectedServiceUserType(params.row);
            setDrawerOpen(true);
            setViewMode("view");
          }}
        />
      </ContentCard>

      {/* Service User Type Drawer for Add/Edit/View */}
      <ServiceUserTypeDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        serviceUserType={selectedServiceUserType}
        onSuccess={handleServiceUserTypeSuccess}
        mode={viewMode}
      />
    </>
  );
});

ServiceUserTypeList.displayName = "ServiceUserTypeList";

export default ServiceUserTypeList;
