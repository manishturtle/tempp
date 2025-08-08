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
import { serviceCategoryApi, ServiceCategory } from "../../../services_service_management/serviceCategory";
import { functionsApi, FunctionData } from "../../../services_service_management/functions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

interface ServiceCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceCategory?: ServiceCategory | null;
  onSuccess: () => void;
  mode?: "view" | "edit" | "create";
}

interface FormErrors {
  name?: string;
  description?: string;
  status?: string;
  function_id?: string;
}

const ServiceCategoryDrawer: React.FC<ServiceCategoryDrawerProps> = ({
  open,
  onClose,
  serviceCategory,
  onSuccess,
  mode = "create",
}) => {
  const isEdit = Boolean(serviceCategory);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    function_id: 0,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const [functions, setFunctions] = useState<FunctionData[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
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

  // Fetch functions for dropdown
  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        setLoadingFunctions(true);
        // Add the parameter all_records=true to get all functions without pagination
        const response = await functionsApi.getAllFunctions();
        setFunctions(response);
      } catch (error) {
        console.error("Error fetching functions:", error);
      } finally {
        setLoadingFunctions(false);
      }
    };

    if (open) {
      fetchFunctions();
    }
  }, [open]);

  // Initialize form with service category data when editing
  useEffect(() => {
    if (isEdit && serviceCategory) {
      setFormData({
        name: serviceCategory.name,
        description: serviceCategory.description,
        status: serviceCategory.status,
        function_id: serviceCategory.function ? serviceCategory.function.id : 0,
      });
    } else {
      // Reset form for new service category
      setFormData({
        name: "",
        description: "",
        status: "Active",
        function_id: 0,
      });
    }
    // Reset errors when drawer opens/closes
    setErrors({});
  }, [serviceCategory, open, isEdit]);

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

    if (!formData.function_id) {
      newErrors.function_id = "Function is required";
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
      
      const serviceCategoryPayload: Record<string, any> = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        function_id: formData.function_id, // backend API accepts function ID as a number
      };

      if (isEdit && serviceCategory) {
        await serviceCategoryApi.updateServiceCategory(serviceCategory.id, serviceCategoryPayload);
      } else {
        await serviceCategoryApi.createServiceCategory(serviceCategoryPayload);
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving service category:", error);
      
      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to save service category. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? viewMode === "edit"
            ? "Edit Service Category"
            : "View Service Category"
          : "Create Service Category"
      }
      onSave={viewMode === "edit" || viewMode === "create" ? handleSave : undefined}
      saveDisabled={loading}
      expandedWidth={550}
      sidebarIcons={
        serviceCategory
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Service Category",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Service Category",
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

        <FormControl required error={!!errors.function_id} disabled={loading || viewMode === "view"}>
          <InputLabel id="function-label">Function</InputLabel>
          <Select
            labelId="function-label"
            name="function_id"
            value={formData.function_id}
            onChange={handleChange}
            label="Function"
          >
            <MenuItem value={0} disabled>
              Select a function
            </MenuItem>
            {loadingFunctions ? (
              <MenuItem value={0} disabled>
                Loading...
              </MenuItem>
            ) : (
              functions
                .filter((func) => 
                  // Show function if active OR if it's the currently selected function in edit mode
                  func.status === "Active" || (isEdit && func.id === formData.function_id)
                )
                .map((func) => (
                  <MenuItem 
                    key={func.id} 
                    value={func.id}
                    sx={func.status !== "Active" ? {
                      fontStyle: 'italic',
                      opacity: 0.7,
                    } : {}}
                  >
                    {func.name}{func.status !== "Active" ? " (Inactive)" : ""}
                  </MenuItem>
                ))
            )}
          </Select>
          {errors.function_id && (
            <FormHelperText>{errors.function_id}</FormHelperText>
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
            <MenuItem value="Archived">Archived</MenuItem>
          </Select>
          {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
        </FormControl>
      </Box>
    </AnimatedDrawer>
  );
};

export default ServiceCategoryDrawer;
