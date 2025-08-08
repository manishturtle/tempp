"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Typography,
} from "@mui/material";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import { serviceUserTypesApi, ServiceUserType } from "../../../services_service_management/serviceUserTypes";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

interface ServiceUserTypeDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceUserType?: ServiceUserType | null;
  onSuccess: () => void;
  mode?: "view" | "edit" | "create";
}

interface FormErrors {
  name?: string;
  description?: string;
  status?: string;
  service_user_group?: string;
}

const ServiceUserTypeDrawer: React.FC<ServiceUserTypeDrawerProps> = ({
  open,
  onClose,
  serviceUserType,
  onSuccess,
  mode = "create",
}) => {
  const isEdit = Boolean(serviceUserType);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    service_user_group: "Customer",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const [apiError, setApiError] = useState<string | null>(null);

  // Effect to sync the viewMode with the mode prop when it changes
  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  // Clear API errors when drawer opens/closes
  useEffect(() => {
    if (open) {
      setApiError(null);
    }
  }, [open]);

  // Initialize form with service user type data when editing
  useEffect(() => {
    if (isEdit && serviceUserType) {
      setFormData({
        name: serviceUserType.name,
        description: serviceUserType.description,
        status: serviceUserType.status,
        service_user_group: serviceUserType.service_user_group,
      });
    } else {
      // Reset form for new service user type
      setFormData({
        name: "",
        description: "",
        status: "Active",
        service_user_group: "Customer",
      });
    }
    // Reset errors when drawer opens/closes
    setErrors({});
  }, [serviceUserType, open, isEdit]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<{ name?: string; value: unknown }>
      | any
  ) => {
    const name = e.target.name;
    const value = e.target.value;

    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error when field is updated
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.status) {
      newErrors.status = "Status is required";
    }

    if (!formData.service_user_group) {
      newErrors.service_user_group = "Service User Group is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setApiError(null); // Clear any previous errors

      if (isEdit && serviceUserType) {
        // Update existing service user type
        await serviceUserTypesApi.updateServiceUserType(serviceUserType.id, formData);
      } else {
        // Create new service user type
        await serviceUserTypesApi.createServiceUserType(formData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving service user type:", error);
      setApiError(
        error.response?.data?.message ||
          error.message ||
          "An error occurred while saving the service user type."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={
        viewMode === "view"
          ? "View Service User Type"
          : viewMode === "edit"
          ? "Edit Service User Type"
          : "Add New Service User Type"
      }
      onSave={viewMode === "edit" || viewMode === "create" ? handleSave : undefined}
      expandedWidth={550}
      saveDisabled={loading}
      sidebarIcons={
        serviceUserType
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Service User Type",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Service User Type",
                onClick: () => setViewMode("edit"),
              },
            ]
          : []
      }
      defaultSidebarItem={viewMode}
    >
      {apiError && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "error.light",
            color: "white",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {apiError}
          </Typography>
        </Box>
      )}
      <Box
        component="form"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          '& .MuiFormControl-root': { width: '100%' },
        }}
      >
        <TextField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          error={!!errors.name}
          helperText={errors.name}
          disabled={loading || viewMode === "view"}
          autoFocus
        />

        <TextField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          error={!!errors.description}
          helperText={errors.description}
          multiline
          rows={4}
          disabled={loading || viewMode === "view"}
        />

        <FormControl required error={!!errors.service_user_group} disabled={loading || viewMode === "view"}>
          <InputLabel id="service-user-group-label">Service User Group</InputLabel>
          <Select
            labelId="service-user-group-label"
            name="service_user_group"
            value={formData.service_user_group}
            onChange={handleChange}
            label="Service User Group"
          >
            <MenuItem value="Customer">Customer</MenuItem>
            <MenuItem value="Vendor">Vendor</MenuItem>
            <MenuItem value="Partner">Partner</MenuItem>
            <MenuItem value="Employee">Employee</MenuItem>
            <MenuItem value="Contractor">Contractor</MenuItem>
          </Select>
          {errors.service_user_group && (
            <FormHelperText>{errors.service_user_group}</FormHelperText>
          )}
        </FormControl>

        <FormControl required error={!!errors.status} disabled={loading || viewMode === "view"}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            name="status"
            value={formData.status}
            onChange={handleChange}
            label="Status"
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </Select>
          {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
        </FormControl>
      </Box>
    </AnimatedDrawer>
  );
};

export default ServiceUserTypeDrawer;
