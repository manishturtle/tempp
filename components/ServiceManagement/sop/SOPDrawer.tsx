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
  FormControlLabel,
  Switch,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import { sopApi, SOP } from "../../../services_service_management/sop";
import { processesApi, Process } from "../../../services_service_management/processes";
import SOPEditConfirmationDialog, {
  SOPEditAction,
} from "./SOPEditConfirmationDialog";
import { useMultiTenantRouter } from "../../../hooks/service-management/useMultiTenantRouter";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

interface SOPDrawerProps {
  open: boolean;
  onClose: () => void;
  sop?: SOP | null;
  onSuccess: () => void;
  mode: "view" | "edit" | "create";
}

interface FormErrors {
  sop_name?: string;
  description?: string;
  status?: string;
  effective_date?: string;
  process_id?: string;
}

const SOPDrawer: React.FC<SOPDrawerProps> = ({
  open,
  onClose,
  sop,
  onSuccess,
  mode,
}) => {
  const router = useMultiTenantRouter();
  const isEdit = Boolean(sop);

  // Form state
  const [formData, setFormData] = useState({
    sop_name: "",
    description: "",
    status: "Active",
    effective_date: null as string | null,
    allow_step_reordering: true,
    process_id: 0,
    base_name: "", // Will be set to sop_name
  });
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [newProcessFormData, setNewProcessFormData] = useState({
    name: "",
    description: "",
    status: "Active",
  });
  const [newProcessErrors, setNewProcessErrors] = useState<{
    name?: string;
    description?: string;
    status?: string;
  }>({});
  const [creatingProcess, setCreatingProcess] = useState(false);

  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  // Fetch all processes for the dropdown
  const fetchProcesses = async () => {
    try {
      setLoadingProcesses(true);
      const data = await processesApi.getAllProcesses();
      setProcesses(data);
    } catch (error) {
      console.error("Error fetching processes:", error);
    } finally {
      setLoadingProcesses(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProcesses();
    }
  }, [open]);

  // Initialize form with SOP data when editing
  useEffect(() => {
    if (sop) {
      setFormData({
        sop_name: sop.sop_name || "",
        description: sop.description || "",
        status: sop.status || "Active",
        effective_date: sop.effective_date,
        allow_step_reordering: sop.allow_step_reordering || true,
        process_id: sop.sop_group?.process?.id || 0,
        base_name: sop.sop_group?.base_name || sop.sop_name || "", // Use existing base_name or sop_name
      });
    } else {
      // Reset form for new SOP with today as default effective date
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

      setFormData({
        sop_name: "",
        description: "",
        status: "Active",
        effective_date: today,
        allow_step_reordering: true,
        process_id: 0,
        base_name: "",
      });
    }
    // Reset errors when drawer opens/closes
    setErrors({});
    setApiError(null); // Clear API error when drawer opens/closes
  }, [sop, open]);

  // Keep base_name in sync with sop_name for new SOPs
  useEffect(() => {
    if (!isEdit && formData.sop_name) {
      setFormData((prev) => ({
        ...prev,
        base_name: formData.sop_name,
      }));
    }
  }, [formData.sop_name, isEdit]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<{ name?: string; value: unknown }>
      | any
  ) => {
    const name = e.target.name;
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;

    // Handle the special case of "create_new" in process_id
    if (name === "process_id" && value === "create_new") {
      // This is handled by the onClick on the MenuItem
      return;
    }

    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error when field is updated
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const handleDateChange = (date: Date | null) => {
    const dateString = date ? date.toISOString().split("T")[0] : null;
    setFormData((prev) => ({ ...prev, effective_date: dateString }));

    // Clear any date error
    if (errors.effective_date) {
      setErrors((prev) => ({ ...prev, effective_date: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.sop_name.trim()) {
      newErrors.sop_name = "Name is required";
    }

    if (!formData.status) {
      newErrors.status = "Status is required";
    }

    if (!formData.process_id) {
      newErrors.process_id = "Process is required";
    }

    if (!formData.effective_date) {
      newErrors.effective_date = "Effective date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // If this is an edit, show confirmation dialog
    if (isEdit && sop) {
      setConfirmDialogOpen(true);
    } else {
      // For new SOPs, proceed directly
      await createSOP();
    }
  };

  const handleDialogAction = async (action: SOPEditAction) => {
    setConfirmDialogOpen(false);

    if (action === SOPEditAction.CANCEL) {
      return; // Do nothing
    }

    try {
      setLoading(true);
      setApiError(null); // Clear any previous errors

      if (action === SOPEditAction.UPDATE_EXISTING) {
        await updateExistingSOP();
      } else if (action === SOPEditAction.CREATE_NEW_VERSION) {
        await createNewVersion();
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving SOP:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to save SOP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const prepareSOPData = (): any => {
    return {
      sop_name: formData.sop_name,
      description: formData.description,
      status: formData.status,
      effective_date: formData.effective_date,
      allow_step_reordering: formData.allow_step_reordering,
    };
  };

  const createSOP = async () => {
    try {
      setApiError(null); // Clear any previous errors
      const data = prepareSOPData();
      // For new SOPs, we need to provide process_id and base_name
      data.process_id = formData.process_id;
      data.base_name = formData.base_name || formData.sop_name;

      const createdSop = await sopApi.createNewSOP(data, formData.process_id);
      onSuccess();
      onClose();

      // Navigate to the newly created SOP page
      if (createdSop && createdSop.id) {
        router.push(`/sop/${createdSop.id}`);
      }
    } catch (error: any) {
      console.error("Error creating SOP:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to create SOP. Please try again.");
      }
    }
  };

  const updateExistingSOP = async () => {
    if (!sop) return;

    try {
      setApiError(null); // Clear any previous errors
      const data = prepareSOPData();
      await sopApi.updateSOP(sop.id, data);
    } catch (error: any) {
      console.error("Error updating SOP:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to update SOP. Please try again.");
      }
      throw error; // Re-throw to handle in the calling function
    }
  };

  const createNewVersion = async () => {
    if (!sop || !sop.sop_group) return;

    try {
      setApiError(null); // Clear any previous errors
      const data = prepareSOPData();
      const createdSop = await sopApi.createSOPVersion(
        sop.sop_group.id,
        data,
        sop.id
      );
      onSuccess();
      onClose();
      if (createdSop && createdSop.id) {
        router.push(`/sop/${createdSop.id}`);
      }
    } catch (error: any) {
      console.error("Error creating new SOP version:", error);

      // Extract error message from API response
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to create new SOP version. Please try again.");
      }
      throw error; // Re-throw to handle in the calling function
    }
  };

  // Process creation validation
  const validateProcessForm = (): boolean => {
    const newErrors: { name?: string; status?: string } = {};

    if (!newProcessFormData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!newProcessFormData.status) {
      newErrors.status = "Status is required";
    }

    setNewProcessErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle process creation
  const handleCreateProcess = async () => {
    if (!validateProcessForm()) {
      return;
    }

    try {
      setCreatingProcess(true);
      // Create new process
      const createdProcess = await processesApi.createProcess({
        name: newProcessFormData.name,
        description: newProcessFormData.description,
        status: "Active",
      });

      // Close dialog
      setProcessDialogOpen(false);

      // Refresh processes list
      await fetchProcesses();

      // Select the newly created process
      setFormData((prev) => ({ ...prev, process_id: createdProcess.id }));

      // Reset form
      setNewProcessFormData({
        name: "",
        description: "",
        status: "Active",
      });
    } catch (error: any) {
      console.error("Error creating process:", error);

      // Handle error (could show in the dialog)
      if (error.response?.data?.error) {
        setApiError(error.response.data.error);
      } else if (error.message) {
        setApiError(error.message);
      } else {
        setApiError("Failed to create process. Please try again.");
      }
    } finally {
      setCreatingProcess(false);
    }
  };

  const renderMenuItems = () => {
    // 1. Show a loading indicator
    if (loadingProcesses) {
      return (
        <MenuItem value={0} disabled>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} />
            <span>Loading...</span>
          </Box>
        </MenuItem>
      );
    }

    // 2. Filter the processes based on the logic
    const filteredProcesses = processes.filter(
      (process) =>
        process.status === "Active" ||
        (isEdit && process.id === formData.process_id)
    );

    // 3. Map the filtered processes to MenuItem components
    const processItems = filteredProcesses.map((process) => (
      <MenuItem
        key={process.id}
        value={process.id}
        sx={{
          fontStyle: process.status !== "Active" ? "italic" : "normal",
          opacity: process.status !== "Active" ? 0.7 : 1,
        }}
      >
        {process.name}
        {process.status !== "Active" && " (Inactive)"}
      </MenuItem>
    ));

    // 4. Create the "Create New" MenuItem
    const createNewItem = (
      <MenuItem
        key="create_new"
        value="create_new"
        onClick={(e) => {
          // This stops the select from closing when this option is clicked
          e.preventDefault();
          setProcessDialogOpen(true);
        }}
        sx={{
          color: "primary.main",
          fontWeight: "bold",
        }}
      >
        + Create Process
      </MenuItem>
    );

    // 5. Combine all items into a single array
    return [
      <MenuItem value={0} disabled key="placeholder">
        Select a process
      </MenuItem>,
      ...processItems,
      <Divider key="divider" />,
      createNewItem,
    ];
  };

  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={
        isEdit ? (viewMode === "edit" ? "Edit SOP" : "View SOP") : "Create SOP"
      }
      onSave={handleSave}
      saveDisabled={loading}
      sidebarIcons={
        sop
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
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SOPEditConfirmationDialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onAction={handleDialogAction}
        />

        {/* Process Creation Dialog */}
        <Dialog
          open={processDialogOpen}
          onClose={() => setProcessDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>New Process</DialogTitle>
          <DialogContent>
            <Box
              component="form"
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                mt: 2,
                "& .MuiFormControl-root": { width: "100%" },
              }}
            >
              <TextField
                label="Name"
                name="name"
                value={newProcessFormData.name}
                onChange={(e) => {
                  setNewProcessFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }));
                  if (newProcessErrors.name) {
                    setNewProcessErrors((prev) => ({
                      ...prev,
                      name: undefined,
                    }));
                  }
                }}
                required
                error={!!newProcessErrors.name}
                helperText={newProcessErrors.name}
                disabled={creatingProcess}
                autoFocus
                fullWidth
              />

              <TextField
                label="Description"
                name="description"
                value={newProcessFormData.description}
                onChange={(e) => {
                  setNewProcessFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  if (newProcessErrors.description) {
                    setNewProcessErrors((prev) => ({
                      ...prev,
                      description: undefined,
                    }));
                  }
                }}
                error={!!newProcessErrors.description}
                helperText={newProcessErrors.description}
                multiline
                rows={4}
                disabled={creatingProcess}
                fullWidth
              />
              {creatingProcess && (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setProcessDialogOpen(false)}
              disabled={creatingProcess}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateProcess}
              disabled={creatingProcess}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
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
            label="SOP Name"
            name="sop_name"
            value={formData.sop_name}
            onChange={handleChange}
            required
            error={!!errors.sop_name}
            helperText={errors.sop_name}
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
            error={!!errors.process_id}
            disabled={loading || viewMode === "view"}
            fullWidth
          >
            <InputLabel id="process-label">Process</InputLabel>
            <Select
              labelId="process-label"
              name="process_id"
              value={formData.process_id || 0} // Ensure value is controlled
              onChange={handleChange}
              label="Process"
            >
              {renderMenuItems()}
            </Select>
            {errors.process_id && (
              <FormHelperText>{errors.process_id}</FormHelperText>
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
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              {/* <MenuItem value="Superseded">Superseded</MenuItem> */}
              <MenuItem value="Archived">Archived</MenuItem>
            </Select>
            {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
          </FormControl>

          <DatePicker
            label="Effective Date"
            value={
              formData.effective_date ? new Date(formData.effective_date) : null
            }
            onChange={handleDateChange}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error: !!errors.effective_date,
                helperText: errors.effective_date,
              },
            }}
            disabled={loading || viewMode === "view"}
            format="dd/MM/yyyy"
          />

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allow_step_reordering}
                  onChange={handleChange}
                  name="allow_step_reordering"
                  disabled={loading || viewMode === "view"}
                />
              }
              label="Allow Step Reordering"
            />
            <Tooltip
              title="Toggling this option enables/disables the ability for agents to rearrange the order of predefined steps when working on a Case/SOP. This gives agents flexibility to adapt the procedure to their specific situation."
              arrow
              placement="bottom"
            >
              <IconButton size="small" color="primary" sx={{ ml: -1 }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      </LocalizationProvider>
    </AnimatedDrawer>
  );
};

export default SOPDrawer;
