"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
} from "@mui/material";

import AnimatedDrawer from "../../common/AnimatedDrawer";
import { functionsApi, FunctionData } from "../../../services_service_management/functions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

interface FunctionDrawerProps {
  open: boolean;
  onClose: () => void;
  functionData: FunctionData | null;
  onSuccess: () => void;
  mode?: "view" | "edit" | "create";
}

interface FormDataType {
  name: string;
  description: string;
  status: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  status?: string;
}

const FunctionDrawer: React.FC<FunctionDrawerProps> = ({
  open,
  onClose,
  functionData,
  onSuccess,
  mode = "create",
}) => {
  // Determine if this is an edit operation
  const isEdit = !!functionData;

  // Form state
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    description: "",
    status: "Active",
  });

  // Error state for validation
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clear API error when drawer is opened/closed
  useEffect(() => {
    if (open) {
      setApiError(null);
    }
  }, [open]);

  // Effect to sync the viewMode with the mode prop when it changes
  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  // Set form data when editing an existing function
  useEffect(() => {
    if (isEdit && functionData) {
      setFormData({
        name: functionData.name || "",
        description: functionData.description || "",
        status: functionData.status || "Active",
      });
    } else {
      // Reset form for new function
      setFormData({
        name: "",
        description: "",
        status: "Active",
      });
    }
    setErrors({});
  }, [isEdit, functionData, open]);

  // Handle form field changes
  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name?: string; value: unknown } }
  ) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error when field is changed
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    }
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.status) {
      newErrors.status = "Status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save action
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setApiError(null); // Clear any previous errors

      // Prepare data for API
      const functionPayload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
      };

      if (isEdit && functionData) {
        // Update existing function
        await functionsApi.updateFunction(functionData.id, functionPayload);
      } else {
        // Create new function
        await functionsApi.createFunction(functionPayload);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving function:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to save function. Please try again.");
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
            ? "Edit Function"
            : "View Function"
          : "Create Function"
      }
      onSave={viewMode === "edit" || viewMode === "create" ? handleSave : undefined}
      saveDisabled={loading}
      expandedWidth={550}
      sidebarIcons={
        functionData
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Function",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Function",
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
        }}
      >
        <TextField
          fullWidth
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={!!errors.name}
          helperText={errors.name}
          disabled={loading || viewMode === "view"}
          required
          autoFocus
        />

        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          error={!!errors.description}
          helperText={errors.description}
          disabled={loading || viewMode === "view"}
          multiline
          rows={3}
        />

        <FormControl
          fullWidth
          error={!!errors.status}
          disabled={loading || viewMode === "view"}
          required
        >
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            id="status"
            name="status"
            value={formData.status}
            label="Status"
            onChange={handleChange}
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

export default FunctionDrawer;
