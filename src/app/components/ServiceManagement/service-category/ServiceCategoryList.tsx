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
  serviceCategoryApi,
  ServiceCategory,
} from "../../../services_service_management/serviceCategory";
import ServiceCategoryDrawer from "../service-category/ServiceCategoryDrawer";

interface TabOption {
  value: string;
  label: string;
  count: number;
}

interface ServiceCategoryListProps {}

// Define type for the exposed methods
export interface ServiceCategoryListHandle {
  openAddDrawer: () => void;
}

const ServiceCategoryList = forwardRef<
  ServiceCategoryListHandle,
  ServiceCategoryListProps
>((props, ref) => {
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // States for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedServiceCategory, setSelectedServiceCategory] =
    useState<ServiceCategory | null>(null);
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
      setSelectedServiceCategory(null);
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
      field: "function",
      headerName: "Associated Function",
      width: 200,
      renderCell: (params) => {
        const func = params.value;
        return <Typography>{func ? func.name : "None"}</Typography>;
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
      count: serviceCategories.filter((cat) => cat.status === "Active").length,
    },
    {
      value: "Inactive",
      label: "Inactive",
      count: serviceCategories.filter((cat) => cat.status === "Inactive")
        .length,
    },
    {
      value: "Archived",
      label: "Archived",
      count: serviceCategories.filter((cat) => cat.status === "Archived")
        .length,
    },
  ];

  // Fetch service categories data
  const fetchServiceCategories = async () => {
    try {
      setLoading(true);
      const response = await serviceCategoryApi.getServiceCategories(
        paginationModel.page + 1,
        paginationModel.pageSize
      );
      setServiceCategories(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error("Error fetching service categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect for fetching service categories on pagination or filter change
  useEffect(() => {
    fetchServiceCategories();
  }, [paginationModel]);

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedServiceCategory(null);
    setViewMode("create");
  };

  // Handle service category save success
  const handleServiceCategorySuccess = () => {
    fetchServiceCategories();
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
          rows={serviceCategories}
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
            setSelectedServiceCategory(params.row);
            setDrawerOpen(true);
            setViewMode("view");
          }}
        />
      </ContentCard>

      {/* Service Category Drawer for Add/Edit */}
      <ServiceCategoryDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        serviceCategory={selectedServiceCategory}
        onSuccess={handleServiceCategorySuccess}
        mode={viewMode}
      />
    </>
  );
});

ServiceCategoryList.displayName = "ServiceCategoryList";

export default ServiceCategoryList;
