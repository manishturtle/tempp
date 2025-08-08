"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  CircularProgress,
  Typography,
} from "@mui/material";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { processGroupsApi, ProcessGroup } from "../../../services_service_management/processGroups";

interface ProcessGroupDrawerProps {
  open: boolean;
  onClose: () => void;
  processGroup?: ProcessGroup | null;
  onSuccess: () => void;
  mode: "view" | "edit" | "create";
}

interface FormErrors {
  name?: string;
  description?: string;
  is_active?: string;
}

const ProcessGroupDrawer: React.FC<ProcessGroupDrawerProps> = ({
  open,
  onClose,
  processGroup,
  onSuccess,
  mode = "create",
}) => {
  const isEdit = Boolean(processGroup);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clear API errors when drawer opens/closes
  useEffect(() => {
    if (open) {
      setApiError(null);
    }
  }, [open]);

  // Initialize form with processGroup data when editing
  useEffect(() => {
    if (processGroup) {
      setFormData({
        name: processGroup.name || "",
        description: processGroup.description || "",
        is_active: processGroup.is_active !== undefined ? processGroup.is_active : true,
      });
    } else {
      // Reset form for new process group
      setFormData({
        name: "",
        description: "",
        is_active: true,
      });
    }
    // Reset errors when drawer opens/closes
    setErrors({});
  }, [processGroup, open]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<{ name?: string; value: unknown }>
      | any
  ) => {
    const name = e.target.name;
    let value = e.target.value;

    if (name === "is_active") {
      value = e.target.checked;
    }

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

      if (isEdit && processGroup) {
        // Update existing process group
        await processGroupsApi.updateProcessGroup(processGroup.id, formData);
      } else {
        // Create new process group
        await processGroupsApi.createProcessGroup(formData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving process group:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to save process group. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect to sync the viewMode with the mode prop when it changes
  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? viewMode === "edit"
            ? "Edit Process Group"
            : "View Process Group"
          : "Create Process Group"
      }
      onSave={handleSave}
      saveDisabled={loading || viewMode === "view"}
      expandedWidth={550}
      sidebarIcons={
        processGroup
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Process Group",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Process Group",
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
          "& .MuiFormControl-root": { width: "100%" },
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
          fullWidth
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
          fullWidth
        />

        <FormControlLabel
          control={
            <Switch
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              disabled={loading || viewMode === "view"}
            />
          }
          label="Active"
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    </AnimatedDrawer>
  );
};

export default ProcessGroupDrawer;
