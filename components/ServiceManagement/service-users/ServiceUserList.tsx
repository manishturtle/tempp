"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ServiceUser, serviceUsersApi } from "../../../services_service_management/serviceUsers";
import { Box } from "@mui/material";
import {
  GridColDef,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import ServiceUserDrawer from "./ServiceUserDrawer";
import ContentCard from "../../common/ContentCard";
import CustomDataGrid from "../../common/CustomDataGrid";

// Define TabOption interface for ContentCard tabs
interface TabOption {
  value: string;
  label: string;
  count: number;
}

// Props interface for ServiceUserList component
interface ServiceUserListProps {}

// Define type for the exposed methods
export interface ServiceUserListHandle {
  openAddDrawer: () => void;
}

const ServiceUserList = forwardRef<ServiceUserListHandle, ServiceUserListProps>(
  (props, ref) => {
    // State for service users data and loading
    const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [paginationModel, setPaginationModel] = useState({
      page: 0,
      pageSize: 10,
    });

    // State for drawer and search
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [selectedServiceUser, setSelectedServiceUser] =
      useState<ServiceUser | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [viewMode, setViewMode] = useState<"view" | "edit" | "create">("create");
    const [activeTab, setActiveTab] = useState<string>("all");

    // Expose openAddDrawer method to parent component
    useImperativeHandle(ref, () => ({
      openAddDrawer: () => {
        setSelectedServiceUser(null);
        setDrawerOpen(true);
        setViewMode("create");
      },
    }));

    const columns: GridColDef[] = [
      {
        field: "full_name",
        headerName: "Name",
        flex: 1,
        renderCell: (params: GridRenderCellParams<ServiceUser>) => {
          const fullName =
            `${params.row.first_name || ""} ${params.row.last_name || ""}`.trim();
          return <Box>{fullName || "—"}</Box>;
        },
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1,
      },
      {
        field: "phone",
        headerName: "Phone Number",
        flex: 1,
        renderCell: (params: GridRenderCellParams<ServiceUser>) => {
          return <Box>{params.row.phone || "—"}</Box>;
        },
      },
      {
        field: "user_type",
        headerName: "User Type",
        flex: 1,
        renderCell: (params: GridRenderCellParams<ServiceUser>) => {
          const userTypes = params.row.user_type;
          if (!userTypes || userTypes?.length === 0) {
            return <Box>—</Box>;
          }
          return (
            <Box>
              {Array.isArray(userTypes)
                ? userTypes.join(", ")
                : String(userTypes)}
            </Box>
          );
        },
      },
    ];

    // Tab options for the ContentCard
    const tabOptions: TabOption[] = [
      {
        value: "all",
        label: "All",
        count: 0,
      }
    ];

    // Fetch service users data
    const fetchServiceUsers = async () => {
      setLoading(true);
      try {
        const response = await serviceUsersApi.getServiceUsers(
          paginationModel.page + 1,
          paginationModel.pageSize,
          searchQuery
        );
        setServiceUsers(response.results);
        setTotalCount(response.count);
      } catch (error) {
        console.error("Error fetching service users:", error);
      } finally {
        setLoading(false);
      }
    };

    // Effect for fetching service users on pagination or filter change
    useEffect(() => {
      fetchServiceUsers();
    }, [paginationModel]);

    // Edit service user handler
    const handleEditUser = (user: ServiceUser) => {
      setSelectedServiceUser(user);
      setDrawerOpen(true);
      setViewMode("edit");
    };

    // Handle drawer close
    const handleDrawerClose = () => {
      setDrawerOpen(false);
      setViewMode("create");
    };

    // Handle service user save success
    const handleServiceUserSuccess = () => {
      fetchServiceUsers();
    };

    // Handle tab change
    const handleTabChange = (value: string) => {
      setActiveTab(value);
    };

    const filteredRows = serviceUsers.filter((user: ServiceUser) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (user.first_name || "").toLowerCase().includes(query) ||
        (user.last_name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query) ||
        (user.phone || "").toLowerCase().includes(query)
      );
    });

    return (
      <>
        <ContentCard
          sx={{ height: "100%" }}
          tabOptions={tabOptions}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSearch={setSearchQuery}
        >
          <CustomDataGrid
            rows={filteredRows}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25]}
            rowCount={totalCount}
            loading={loading}
            disableRowSelectionOnClick
            autoHeight
            onRowClick={(params) => {
              setSelectedServiceUser(params.row);
              setDrawerOpen(true);
              setViewMode("view");
            }}
          />
        </ContentCard>

        {/* Service User Drawer for Add/Edit */}
        <ServiceUserDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          serviceUser={selectedServiceUser}
          onSuccess={handleServiceUserSuccess}
          mode={viewMode}
        />
      </>
    );
  }
);

ServiceUserList.displayName = "ServiceUserList";

export default ServiceUserList;
