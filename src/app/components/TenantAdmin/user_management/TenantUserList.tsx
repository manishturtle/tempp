"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getAuthHeaders } from "../../../hooks/api/auth";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import dynamic from "next/dynamic";
import { COCKPIT_API_BASE_URL } from "../../../../utils/constants";

// Define the props interface for AddTenantUserForm
interface AddTenantUserFormProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

// Import directly from the same directory
import AddTenantUserForm from "./AddTenantUserForm";
import EditTenantUserForm from "./EditTenantUserForm";

interface User {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  applications?: Array<{
    id: string | number;
    application__application_name: string;
  }>;
  application_count?: number;
  is_active: boolean;
  is_super_admin?: boolean;
  date_joined?: string;
}

const TenantUserList = () => {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);

  // Edit user state
  const [editUserId, setEditUserId] = useState<string | number | null>(null);
  const [openEditUserModal, setOpenEditUserModal] = useState(false);
  
  // const handleOpenEditUserModal = (userId: string | number) => {
  //   setEditUserId(userId);
  //   setOpenEditUserModal(true);
  // };
  
  const handleCloseEditUserModal = useCallback(() => {
    setOpenEditUserModal(false);
    // Don't reset editUserId here to prevent unmounting the form
  }, []);
  
  const handleUserUpdated = useCallback(() => {
    loadUsers();
    setOpenEditUserModal(false);
  }, [loadUsers]);

  // Delete user state
  const [deleteUserId, setDeleteUserId] = useState<string | number | null>(
    null
  );
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (tenantSlug) {
      loadUsers();
    }
  }, [tenantSlug, page, rowsPerPage]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const authHeader = getAuthHeaders();
      if (!Object.keys(authHeader).length) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/?page=${
          page + 1
        }&page_size=${rowsPerPage}`,
        {
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.results || []);
      setTotalCount(data.count || 0);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching tenant users:", err);
      setError("Failed to load users. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenAddUserModal = () => {
    setOpenAddUserModal(true);
  };

  const handleCloseAddUserModal = () => {
    setOpenAddUserModal(false);
  };

  const handleUserCreated = () => {
    loadUsers();
    handleCloseAddUserModal();
  };

  // Edit user handlers
  const handleOpenEditUserModal = (userId: string | number) => {
    setEditUserId(userId);
    setOpenEditUserModal(true);
  };

  // Moved to the top with other state handlers

  // Delete user handlers
  const handleOpenDeleteDialog = (user: User) => {
    setDeleteUserId(user.id);
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteUserId(null);
    setUserToDelete(null);
    setOpenDeleteDialog(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setDeleteLoading(true);
    try {
      const authHeader = getAuthHeaders();
      if (!Object.keys(authHeader).length) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/${deleteUserId}/`,
        {
          method: "DELETE",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      // Reload users after successful deletion
      loadUsers();
      handleCloseDeleteDialog();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError("Failed to delete user. Please try again later.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format date to a human-readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!tenantSlug) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Please select a tenant to manage users.</Alert>
      </Box>
    );
  }

  // Add a hidden button that can be triggered by the parent component
  useEffect(() => {
    const handleAddUserClick = () => {
      handleOpenAddUserModal();
    };

    const addButton = document.querySelector('#add-user-button');
    if (addButton) {
      addButton.addEventListener('click', handleAddUserClick);
    }

    return () => {
      if (addButton) {
        addButton.removeEventListener('click', handleAddUserClick);
      }
    };
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Hidden button that can be triggered by the parent */}
      <button id="add-user-button" style={{ display: 'none' }} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="tenant users table">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Applications</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>isSuperAdmin</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{`${user.first_name || ""} ${
                        user.last_name || ""
                      }`}</TableCell>
                      <TableCell>
                        {user.applications && user.applications.length > 0 ? (
                          <>
                            {user.applications.map((app) => (
                              <Chip
                                key={app.id}
                                label={app.application__application_name}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </>
                        ) : (
                          <Chip
                            label="No applications"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? "Active" : "Inactive"}
                          color={user.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_super_admin ? "Yes" : "No"}
                          color={user.is_super_admin ? "warning" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.date_joined)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditUserModal(user.id)}
                          title="Edit user"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteDialog(user)}
                          title="Delete user"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      <AddTenantUserForm
        open={openAddUserModal}
        onClose={handleCloseAddUserModal}
        onUserCreated={handleUserCreated}
      />

      {/* Edit User Modal - Keep it in the DOM but control visibility with open prop */}
      <EditTenantUserForm
        key={editUserId || 'modal'}
        open={openEditUserModal}
        onClose={handleCloseEditUserModal}
        onUserUpdated={handleUserUpdated}
        userId={editUserId}
      />

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-user-dialog-title"
      >
        <DialogTitle id="delete-user-dialog-title">Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user {userToDelete?.email}? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantUserList;
