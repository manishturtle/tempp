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
  serviceSubcategoryApi,
  ServiceSubcategory,
} from "../../../services_service_management/serviceSubcategory";
import ServiceSubcategoryDrawer from "../service-subcategory/ServiceSubcategoryDrawer";

interface TabOption {
  value: string;
  label: string;
  count: number;
}

interface ServiceSubcategoryListProps {}

// Define type for the exposed methods
export interface ServiceSubcategoryListHandle {
  openAddDrawer: () => void;
}

const ServiceSubcategoryList = forwardRef<
  ServiceSubcategoryListHandle,
  ServiceSubcategoryListProps
>((props, ref) => {
  const [serviceSubcategories, setServiceSubcategories] = useState<
    ServiceSubcategory[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // States for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedServiceSubcategory, setSelectedServiceSubcategory] =
    useState<ServiceSubcategory | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">("create");

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
      setSelectedServiceSubcategory(null);
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
      field: "sop",
      headerName: "SOP",
      width: 150,
      renderCell: (params) => {
        const sop = params.row.sop_details?.sop_name;
        return <Typography>{sop ? sop : "N/A"}</Typography>;
      },
    },
    {
      field: "service_category",
      headerName: "Service Category",
      width: 200,
      renderCell: (params) => {
        const category = params.value;
        return <Typography>{category ? category.name : "None"}</Typography>;
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
      count: serviceSubcategories.filter(
        (subcategory) => subcategory.status === "Active"
      ).length,
    },
    {
      value: "Inactive",
      label: "Inactive",
      count: serviceSubcategories.filter(
        (subcategory) => subcategory.status === "Inactive"
      ).length,
    },
    {
      value: "Archived",
      label: "Archived",
      count: serviceSubcategories.filter(
        (subcategory) => subcategory.status === "Archived"
      ).length,
    },
  ];

  // Fetch service subcategories data
  const fetchServiceSubcategories = async () => {
    try {
      setLoading(true);
      const response = await serviceSubcategoryApi.getServiceSubcategories(
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      setServiceSubcategories(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error("Error fetching service subcategories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect for fetching service subcategories on pagination or filter change
  useEffect(() => {
    fetchServiceSubcategories();
  }, [paginationModel]);

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedServiceSubcategory(null);
    setViewMode("create");
  };

  // Handle service subcategory save success
  const handleServiceSubcategorySuccess = () => {
    fetchServiceSubcategories();
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
          rows={serviceSubcategories}
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
            setSelectedServiceSubcategory(params.row);
            setDrawerOpen(true);
            setViewMode("view");
          }}
        />
      </ContentCard>

      {/* Service Subcategory Drawer for Add/Edit */}
      <ServiceSubcategoryDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        serviceSubcategory={selectedServiceSubcategory}
        onSuccess={handleServiceSubcategorySuccess}
        mode={viewMode}
      />
    </>
  );
});

ServiceSubcategoryList.displayName = "ServiceSubcategoryList";

export default ServiceSubcategoryList;
