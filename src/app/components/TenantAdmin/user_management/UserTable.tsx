import React, { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  AvatarGroup,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AppsIcon from "@mui/icons-material/Apps";
import WidgetsIcon from "@mui/icons-material/Widgets";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import CustomDataGrid from "../../common/CustomDataGrid";

export interface User {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: "active" | "inactive" | "invited" | "suspended";
  role: string;
  applications: Array<{
    id: string | number;
    name: string;
    icon: React.ReactNode;
    color: string;
  }>;
  is_verified?: boolean;
  lastLogin?: string;
}

interface UserTableProps {
  users: User[];
  
  onEditUser: (userId: string | number) => void;
  onDeleteUser: (userId: string | number) => void;
  onSuspendUser?: (userId: string | number) => void;
  onApproveUser?: (userId: string | number, approve: boolean) => void;
}

const getStatusChipProps = (status: User["status"]) => {
  switch (status) {
    case "active":
      return {
        color: "success" as const,
        bg: "#e8f5e9",
        textColor: "#2e7d32",
        label: "Active",
      };
    case "invited":
      return {
        color: "warning" as const,
        bg: "#fff8e1",
        textColor: "#f57f17",
        label: "Invited",
      };
    case "inactive":
      return {
        color: "default" as const,
        bg: "#f5f5f5",
        textColor: "#757575",
        label: "Inactive",
      };
    case "suspended":
      return {
        color: "error" as const,
        bg: "#ffebee",
        textColor: "#c62828",
        label: "Suspended",
      };
    default:
      return {
        color: "default" as const,
        bg: "#f5f5f5",
        textColor: "#757575",
        label: "Unknown",
      };
  }
};

/**
 * A table component for displaying and managing users
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  onEditUser,
  onDeleteUser,
  onSuspendUser,
  onApproveUser,
}) => {
  const [anchorEl, setAnchorEl] = useState<
    Record<string | number, HTMLElement | null>
  >({});

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    userId: string | number
  ) => {
    setAnchorEl({ ...anchorEl, [userId]: event.currentTarget });
  };

  const handleCloseMenu = (userId: string | number) => {
    setAnchorEl({ ...anchorEl, [userId]: null });
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return "Never";

    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffTime = Math.abs(now.getTime() - loginDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours < 24) {
      return diffHours > 0 ? `${diffHours} hours ago` : "Just now";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      return loginDate.toLocaleDateString();
    }
  };

  const getAppIcon = (appName: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
      General: { icon: <WidgetsIcon fontSize="small" />, color: "#2196f3" },
      Admin: { icon: <AppsIcon fontSize="small" />, color: "#4caf50" },
      Dashboard: {
        icon: <DashboardCustomizeIcon fontSize="small" />,
        color: "#9c27b0",
      },
      Marketing: { icon: <GridViewIcon fontSize="small" />, color: "#f44336" },
      HR: { icon: <ViewQuiltIcon fontSize="small" />, color: "#ff9800" },
    };

    return (
      iconMap[appName] || {
        icon: <AppsIcon fontSize="small" />,
        color: "#757575",
      }
    );
  };

  const columns: GridColDef[] = [
    {
      field: "user",
      headerName: "User",
      flex: 2,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const user = params.row;
        return (
          <Box sx={{ display: "flex", alignItems: "center", py: 1 }}>
            <Avatar
              alt={`${user.firstName} ${user.lastName}`}
              src={user.avatarUrl}
              sx={{ width: 32, height: 32, mr: 1.5 }}
            />
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: "#334155" }}
              >
                {user.firstName} {user.lastName}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#64748b", fontSize: "0.75rem" }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const statusProps = getStatusChipProps(params.row.status);
        return (
          <Chip
            label={statusProps.label}
            size="small"
            color={statusProps.color}
            sx={{
              bgcolor: statusProps.bg,
              color: statusProps.textColor,
              fontWeight: 500,
              borderRadius: "4px",
              textTransform: "capitalize",
            }}
          />
        );
      },
    },
   
    {
      field: "applications",
      headerName: "Assigned Apps",
      flex: 2,
      // minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const apps = params.row.applications;
        if (!apps || apps.length === 0)
          return <Typography variant="body2">None</Typography>;

        // Show first 3 apps with avatar group for more
        const displayApps = apps.slice(0, 3);
        const hasMore = apps.length > 3;

        return (
          <Stack direction="row" spacing={1}>
            {displayApps.map((app: any) => {
              const { icon, color } = getAppIcon(app.name);
              return (
                <Chip
                  key={app.id}
                  icon={<Box sx={{ color, ml: 0.5 }}>{icon}</Box>}
                  label={app.name}
                  size="small"
                  sx={{
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    "& .MuiChip-label": { pl: 0.5 },
                  }}
                />
              );
            })}
            {hasMore && (
              <Tooltip
                title={apps
                  .slice(3)
                  .map((app: any) => app.name)
                  .join(", ")}
              >
                <Chip
                  label={`+${apps.length - 3}`}
                  size="small"
                  sx={{ bgcolor: "#f1f5f9", color: "#64748b" }}
                />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },

    {
      field: "is_verified",
      headerName: "Verified User",
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const statusProps = getStatusChipProps(params.row.is_verified);
        return (
          <Chip
            label={params.row.is_verified ? "Verified" : "Not Verified"}
            size="small"
              color={params.row.is_verified ? "success" : "error"}
              sx={{
                bgcolor: params.row.is_verified ? "success" : "error",
                color: params.row.is_verified ? "success" : "error",
                fontWeight: 500,
                borderRadius: "4px",
                textTransform: "capitalize",
              }}
            />
          );
        },
    },
    {
      field: "lastLogin",
      headerName: "Last Login",
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          {formatLastLogin(params.row.lastLogin)}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const userId = params.row.id;
        return (
          <>
            <IconButton
              aria-label="more actions"
              onClick={(event) => handleOpenMenu(event, userId)}
              size="small"
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl[userId]}
              open={Boolean(anchorEl[userId])}
              onClose={() => handleCloseMenu(userId)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                elevation: 2,
                sx: { minWidth: 150 },
              }}
            >
              <MenuItem
                onClick={() => {
                  handleCloseMenu(userId);
                  onEditUser(userId);
                }}
              >
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>

              {onSuspendUser && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu(userId);
                    onSuspendUser(userId);
                  }}
                >
                  <ListItemIcon>
                    <BlockIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Suspend</ListItemText>
                </MenuItem>
              )}
              
              {onApproveUser && !params.row.is_verified && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu(userId);
                    onApproveUser(userId, true);
                  }}
                >
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText>Approve User</ListItemText>
                </MenuItem>
              )}
              {onApproveUser && params.row.is_verified && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu(userId);
                    onApproveUser(userId, false);
                  }}
                >
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Unapprove User</ListItemText>
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  handleCloseMenu(userId);
                  onDeleteUser(userId);
                }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText sx={{ color: "error.main" }}>Delete</ListItemText>
              </MenuItem>
            </Menu>
          </>
        );
      },
    },
  ];

  return (
    <Box sx={{backgroundColor: "#fff", padding: 0.2}}>
      <CustomDataGrid
        rows={users}
        columns={columns}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[5, 10, 25]}
      />
    </Box>
  );
};

export default UserTable;
