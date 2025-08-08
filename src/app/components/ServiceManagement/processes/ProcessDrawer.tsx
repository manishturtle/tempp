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
  CircularProgress,
  Typography,
  Chip,
  Autocomplete,
} from "@mui/material";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { processesApi, Process } from "../../../services_service_management/processes";
import { processGroupsApi, ProcessGroup } from "../../../services_service_management/processGroups";

interface ProcessDrawerProps {
  open: boolean;
  onClose: () => void;
  process?: Process | null;
  onSuccess: () => void;
  mode: "view" | "edit" | "create";
}

interface FormErrors {
  name?: string;
  description?: string;
  status?: string;
  process_groups?: string;
}

const ProcessDrawer: React.FC<ProcessDrawerProps> = ({
  open,
  onClose,
  process,
  onSuccess,
  mode = "create",
}) => {
  const isEdit = Boolean(process);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    process_groups: [] as number[],
  });
  
  // Process groups state
  const [availableProcessGroups, setAvailableProcessGroups] = useState<ProcessGroup[]>([]);
  const [loadingProcessGroups, setLoadingProcessGroups] = useState(false);

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

  // Initialize form with process data when editing
  useEffect(() => {
    if (process) {
      setFormData({
        name: process.name || "",
        description: process.description || "",
        status: process.status || "Active",
        process_groups: process.process_groups || [],
      });
    } else {
      // Reset form for new process
      setFormData({
        name: "",
        description: "",
        status: "Active",
        process_groups: [],
      });
    }
    // Reset errors when drawer opens/closes
    setErrors({});
  }, [process, open]);

  // Fetch available process groups
  useEffect(() => {
    const fetchProcessGroups = async () => {
      try {
        setLoadingProcessGroups(true);
        const groups = await processGroupsApi.getAllProcessGroups();
        setAvailableProcessGroups(groups);
      } catch (error) {
        console.error("Error fetching process groups:", error);
        setApiError("Failed to load process groups");
      } finally {
        setLoadingProcessGroups(false);
      }
    };

    if (open) {
      fetchProcessGroups();
    }
  }, [open]);

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
  
  const handleProcessGroupChange = (_event: React.SyntheticEvent, selectedGroups: ProcessGroup[]) => {
    const selectedGroupIds = selectedGroups.map(group => group.id);
    setFormData(prev => ({ ...prev, process_groups: selectedGroupIds }));
    
    // Clear error when field is updated
    if (errors.process_groups) {
      setErrors(prev => ({ ...prev, process_groups: undefined }));
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

      // Prepare the data to submit (including process_groups)
      const dataToSubmit = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        process_groups: formData.process_groups,
      };

      if (isEdit && process) {
        // Update existing process
        await processesApi.updateProcess(process.id, dataToSubmit);
      } else {
        // Create new process
        await processesApi.createProcess(dataToSubmit);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving process:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to save process. Please try again.");
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
            ? "Edit Process"
            : "View Process"
          : "Create Process"
      }
      onSave={handleSave}
      saveDisabled={loading}
      expandedWidth={550}
      sidebarIcons={
        process
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Ticket",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Ticket",
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

        <FormControl
          required
          error={!!errors.status}
          disabled={loading || viewMode === "view"}
        >
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            name="status"
            value={formData.status}
            onChange={handleChange}
            label="Status"
            fullWidth
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
            <MenuItem value="Archived">Archived</MenuItem>
          </Select>
          {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
        </FormControl>
        
        <FormControl disabled={loading || viewMode === "view"}>
          <Autocomplete
            multiple
            id="process-groups"
            options={availableProcessGroups.filter(group => 
              // Show active groups OR inactive groups that are already selected in edit mode
              group.is_active || (!isEdit ? false : formData.process_groups?.includes(group.id))
            )}
            getOptionLabel={(option) => 
              option.is_active ? option.name : `${option.name} (Inactive)`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={loadingProcessGroups}
            value={availableProcessGroups.filter(group => 
              formData.process_groups?.includes(group.id)
            )}
            onChange={handleProcessGroupChange}
            renderOption={(props, option) => (
              <li 
                {...props} 
                key={option.id}
                style={!option.is_active ? { fontStyle: 'italic', opacity: 0.7 } : undefined}
              >
                {option.name}{!option.is_active ? " (Inactive)" : ""}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Process Groups"
                error={!!errors.process_groups}
                helperText={errors.process_groups}
              />
            )}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  label={option.is_active ? option.name : `${option.name} (Inactive)`}
                  {...getTagProps({ index })}
                  size="small"
                  key={option.id}
                  sx={!option.is_active ? { fontStyle: 'italic', opacity: 0.7 } : undefined}
                />
              ))
            }
            disabled={loading || viewMode === "view"}
          />
        </FormControl>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    </AnimatedDrawer>
  );
};

export default ProcessDrawer;
