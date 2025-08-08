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
  CircularProgress,
} from "@mui/material";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import {
  serviceSubcategoryApi,
  ServiceSubcategory,
} from "../../../services_service_management/serviceSubcategory";
import {
  serviceCategoryApi,
  ServiceCategory,
} from "../../../services_service_management/serviceCategory";
import { sopApi, SOP } from "../../../services_service_management/sop";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

interface ServiceSubcategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceSubcategory?: ServiceSubcategory | null;
  onSuccess: () => void;
  mode?: "view" | "edit" | "create";
}

interface FormErrors {
  name?: string;
  description?: string;
  status?: string;
  service_category_id?: string;
  sop_id?: string;
}

const ServiceSubcategoryDrawer: React.FC<ServiceSubcategoryDrawerProps> = ({
  open,
  onClose,
  serviceSubcategory,
  onSuccess,
  mode = "create",
}) => {
  const isEdit = Boolean(serviceSubcategory);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    service_category_id: 0,
    sop_id: 0,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);
  const [apiError, setApiError] = useState<string | null>(null);

  // Effect to sync the viewMode with the mode prop when it changes
  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [sops, setSops] = useState<SOP[]>([]);
  const [loadingSops, setLoadingSops] = useState(false);

  // Clear API errors when drawer opens/closes
  useEffect(() => {
    if (open) {
      setApiError(null);
    }
  }, [open]);

  // Fetch service categories for dropdown
  useEffect(() => {
    const fetchServiceCategories = async () => {
      try {
        setLoadingCategories(true);
        // Get all service categories without pagination
        const response = await serviceCategoryApi.getAllServiceCategories();
        setServiceCategories(response);
      } catch (error) {
        console.error("Error fetching service categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    const fetchSops = async () => {
      try {
        setLoadingSops(true);
        const sopsData = await sopApi.getAllSOPs();
        setSops(sopsData);
      } catch (error) {
        console.error("Error fetching SOPs:", error);
      } finally {
        setLoadingSops(false);
      }
    };

    if (open) {
      try {
        fetchServiceCategories();
        fetchSops();
      } catch (error) {
        console.error("Error fetching service categories or SOPs:", error);
      }
    }
  }, [open]);

  // Initialize form with service subcategory data when editing
  useEffect(() => {
    if (isEdit && serviceSubcategory) {
      setFormData({
        name: serviceSubcategory.name,
        description: serviceSubcategory.description,
        status: serviceSubcategory.status,
        service_category_id: serviceSubcategory.service_category
          ? serviceSubcategory.service_category.id
          : 0,
        sop_id: serviceSubcategory?.sop_details
          ? serviceSubcategory?.sop_details.id
          : 0,
      });
    } else {
      // Reset form for new service subcategory
      setFormData({
        name: "",
        description: "",
        status: "Active",
        service_category_id: 0,
        sop_id: 0,
      });
    }
    // Reset errors when drawer opens/closes
    setErrors({});
  }, [serviceSubcategory, open, isEdit]);

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

    if (!formData.sop_id) {
      newErrors.sop_id = "SOP is required";
    }

    if (!formData.service_category_id) {
      newErrors.service_category_id = "Service Category is required";
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

      const serviceSubcategoryPayload: Record<string, any> = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        service_category_id: formData.service_category_id,
        sop_id: formData.sop_id,
      };

      if (isEdit && serviceSubcategory) {
        await serviceSubcategoryApi.updateServiceSubcategory(
          serviceSubcategory.id,
          serviceSubcategoryPayload
        );
      } else {
        await serviceSubcategoryApi.createServiceSubcategory(
          serviceSubcategoryPayload
        );
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving service subcategory:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to save service subcategory. Please try again.");
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
            ? "Edit Service Subcategory"
            : "View Service Subcategory"
          : "Create Service Subcategory"
      }
      onSave={viewMode === "edit" || viewMode === "create" ? handleSave : undefined}
      saveDisabled={loading}
      expandedWidth={550}
      sidebarIcons={
        serviceSubcategory
          ? [
              {
                id: "view",
                icon: <VisibilityIcon />,
                tooltip: "View Subcategory",
                onClick: () => setViewMode("view"),
              },
              {
                id: "edit",
                icon: <EditIcon />,
                tooltip: "Edit Subcategory",
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

        <FormControl
          fullWidth
          disabled={loading || loadingSops || viewMode === "view"}
          required
          error={!!errors.sop_id}
        >
          <InputLabel id="sop-select-label">Associated SOP</InputLabel>
          <Select
            labelId="sop-select-label"
            id="sop_id"
            name="sop_id"
            value={formData.sop_id || ""}
            label="Associated SOP"
            onChange={handleChange}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                },
              },
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {loadingSops ? (
              <MenuItem disabled>
                <CircularProgress size={20} />
                Loading SOPs...
              </MenuItem>
            ) : (
              sops
                .filter(
                  (sop) =>
                    sop.status === "Active" || // Show active SOPs
                    (isEdit && sop.id === formData.sop_id) // Or the currently selected SOP in edit mode
                )
                .map((sop) => (
                  <MenuItem
                    key={sop.id}
                    value={sop.id}
                    sx={{
                      fontStyle: sop.status !== "Active" ? "italic" : "normal",
                      opacity: sop.status !== "Active" ? 0.7 : 1,
                    }}
                  >
                    {sop.sop_name}
                    {sop.status !== "Active" && " (Inactive)"}
                  </MenuItem>
                ))
            )}
          </Select>
          <FormHelperText>
            {errors.sop_id
              ? errors.sop_id
              : "Select the SOP associated with this function"}
          </FormHelperText>
        </FormControl>

        <FormControl
          required
          error={!!errors.service_category_id}
          disabled={loading || viewMode === "view"}
        >
          <InputLabel id="service-category-label">Service Category</InputLabel>
          <Select
            labelId="service-category-label"
            name="service_category_id"
            value={formData.service_category_id}
            onChange={handleChange}
            label="Service Category"
          >
            <MenuItem value={0} disabled>
              Select a service category
            </MenuItem>
            {loadingCategories ? (
              <MenuItem value={0} disabled>
                Loading...
              </MenuItem>
            ) : (
              serviceCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))
            )}
          </Select>
          {errors.service_category_id && (
            <FormHelperText>{errors.service_category_id}</FormHelperText>
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

export default ServiceSubcategoryDrawer;
