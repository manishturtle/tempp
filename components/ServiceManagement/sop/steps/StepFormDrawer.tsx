import React, { useState, useEffect, useRef } from "react";
import { useMultiTenantRouter } from "../../../../hooks/service-management/useMultiTenantRouter";
// import { sopApi, SOPStep, CreateStepData } from "@/services/api/sop";
import { sopApi, SOPStep, CreateStepData } from "../../../../services_service_management/sop";
import { useConfirm } from "../../../common/useConfirm";
import AnimatedDrawer from "../../../common/AnimatedDrawer";
import {
  Box,
  TextField,
  Switch,
  Typography,
  FormControlLabel,
  Button,
  Tabs,
  Tab,
  MenuItem,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Alert,
  Divider,
  Paper,
  Tooltip,
  Menu,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  OpenInFull as ExpandIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Fullscreen as FullScreenIcon,
  InfoOutlined as InfoOutlinedIcon,
  Save as SaveIcon,
  ArrowDropDown as ArrowDropDownIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

type AssetTab = "url" | "file";

// Interface for temporary assets
interface TempAsset {
  id?: number; // Only for existing assets
  asset_type: string;
  asset_url?: string; // For URL type
  asset_file?: File; // For File type
  title?: string; // Optional title
  description?: string; // Optional description
  isNew: boolean; // Flag to determine if this is a new asset or existing one
  fileName?: string; // Display name for file
}

interface StepFormDrawerProps {
  open: boolean;
  onClose: () => void;
  sopId: number;
  steps: SOPStep[] | null;
  editStepId?: number | null;
  onStepSaved: () => void;
  mode?: "view" | "edit" | "create";
  popover?: boolean;
}

const StepFormDrawer: React.FC<StepFormDrawerProps> = ({
  open,
  onClose,
  sopId,
  steps,
  editStepId,
  onStepSaved,
  mode = "create",
  popover = true,
}) => {
  // Form state
  const [stepName, setStepName] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState<number>(1);
  const [allowSubtaskReordering, setAllowSubtaskReordering] = useState(true);
  const [visible, setVisible] = useState(true);
  const [prerequisiteSteps, setPrerequisiteSteps] = useState<number[]>([]);
  const [comments, setComments] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [postrequisites, setPostrequisites] = useState("");

  // Assets state
  const [assetTab, setAssetTab] = useState<AssetTab>("url");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assets, setAssets] = useState<TempAsset[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useMultiTenantRouter();

  // Menu state
  const [actionMenuAnchorEl, setActionMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const isActionMenuOpen = Boolean(actionMenuAnchorEl);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(mode);

  // Functions for action menu
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchorEl(event.currentTarget);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
  };

  // Expansion dialogs state
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [prerequisitesExpanded, setPrerequisitesExpanded] = useState(false);
  const [postrequisitesExpanded, setPostrequisitesExpanded] = useState(false);

  const [disablePrerequisites, setDisablePrerequisites] = useState(false);

  // File input reference
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmation dialog hook
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  // Fetch step data if in edit mode
  useEffect(() => {
    const fetchStepData = async () => {
      if (!editStepId) return;

      try {
        setLoading(true);
        // Find the step in the existing steps array
        const stepToEdit = steps?.find((step) => step.id === editStepId);

        if (stepToEdit) {
          // Populate form with step data
          setStepName(stepToEdit.step_name);
          setEstimatedDuration(stepToEdit.estimated_duration);
          setAllowSubtaskReordering(stepToEdit.allow_subtask_reordering);
          setVisible(
            stepToEdit.visible !== undefined ? stepToEdit.visible : true
          );
          setPrerequisiteSteps(stepToEdit.prerequisite_steps || []);
          setComments(stepToEdit.comments || "");
          setPrerequisites(stepToEdit.prerequisites || "");
          setPostrequisites(stepToEdit.postrequisites || "");

          if (stepToEdit.sequence === 1) {
            setDisablePrerequisites(true);
          }

          // Fetch assets for this step
          const assetsResponse = await sopApi.getStepAssets(editStepId);

          if (assetsResponse && assetsResponse.results) {
            // Convert to TempAsset format
            const existingAssets: TempAsset[] = assetsResponse.results.map(
              (asset) => ({
                id: asset.id,
                sop_step: asset.sop_step,
                asset_type: asset.asset_type,
                asset_url: asset.asset_url,
                isNew: false,
                fileName: asset.asset_url.split("/").pop() || "file",
              })
            );

            setAssets(existingAssets);
          }
        }
      } catch (err) {
        console.error("Error fetching step data:", err);
        setError("Failed to load step data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchStepData();
    }
  }, [editStepId, open, steps]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      // Small delay to ensure the drawer is closed before resetting
      setTimeout(() => {
        setStepName("");
        setEstimatedDuration(1);
        setAllowSubtaskReordering(true);
        setVisible(true);
        setPrerequisiteSteps([]);
        setComments("");
        setPrerequisites("");
        setPostrequisites("");
        setAssetUrl("");
        setAssetFile(null);
        setAssets([]);
        setError(null);
        setDisablePrerequisites(false);
      }, 300);
    }
  }, [open]);

  // Handle tab change for assets
  const handleAssetTabChange = (
    _: React.SyntheticEvent,
    newValue: AssetTab
  ) => {
    setAssetTab(newValue);
    // Reset asset inputs
    setAssetUrl("");
    setAssetFile(null);
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf", // PDF
      "application/msword", // DOC
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
      "image/jpeg",
      "image/png",
      "image/gif", // Images
      "application/vnd.ms-excel", // XLS
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
      "text/csv", // CSV
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "File type not allowed. Please upload docx, pdf, images, excel, or csv."
      );
      return;
    }

    setAssetFile(file);
    setError(null);
  };

  // Add asset (URL or File) to the list
  const handleAddAsset = () => {
    if (assetTab === "url") {
      // Validate URL
      if (!assetUrl.trim()) {
        setError("Please enter a valid URL.");
        return;
      }

      try {
        new URL(assetUrl); // Will throw if invalid URL

        // Add URL asset
        const newAsset: TempAsset = {
          asset_type: "LINK",
          asset_url: assetUrl,
          isNew: true,
        };

        setAssets([...assets, newAsset]);
        setAssetUrl("");
        setError(null);
      } catch (err) {
        setError("Please enter a valid URL.");
      }
    } else if (assetFile) {
      // Add File asset
      const newAsset: TempAsset = {
        asset_type: "FILE",
        asset_file: assetFile,
        isNew: true,
        fileName: assetFile.name,
      };

      setAssets([...assets, newAsset]);
      setAssetFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setError(null);
    } else {
      setError("Please select a file to upload.");
    }
  };

  // Remove asset from the list
  const handleRemoveAsset = async (index: number) => {
    const assetToRemove = assets[index];

    // If this is an existing asset (not new), ask for confirmation
    if (!assetToRemove.isNew && assetToRemove.id) {
      try {
        const confirmed = await confirm({
          title: "Delete Asset",
          message:
            "Are you sure you want to delete this asset? This action cannot be undone.",
          confirmText: "Delete",
          cancelText: "Cancel",
          confirmColor: "error",
        });

        if (confirmed) {
          try {
            // Call API to delete the asset
            await sopApi.deleteStepAsset(assetToRemove.id);

            // Remove from state after successful API call
            const newAssets = [...assets];
            newAssets.splice(index, 1);
            setAssets(newAssets);
          } catch (err) {
            console.error("Error deleting asset:", err);
            setError("Failed to delete asset. Please try again.");
          }
        }
      } catch (err) {
        console.error("Error showing confirmation dialog:", err);
      }
    } else {
      // For new assets, just remove from state
      const newAssets = [...assets];
      newAssets.splice(index, 1);
      setAssets(newAssets);
    }
  };

  // Handle form submission
  const handleSave = async (navigateToConfig = false) => {
    // Validation
    if (!stepName.trim()) {
      setError("Step name is required.");
      return;
    }

    try {
      setSaveLoading(true);

      // Prepare step data
      const stepData: CreateStepData = {
        step_name: stepName,
        sequence: editStepId
          ? steps?.find((s) => s.id === editStepId)?.sequence ||
            (steps?.length || 0) + 1
          : (steps?.length || 0) + 1,
        estimated_duration: estimatedDuration,
        allow_subtask_reordering: allowSubtaskReordering,
        visible: visible,
        prerequisite_steps:
          prerequisiteSteps.length > 0 ? prerequisiteSteps : undefined,
        comments: comments.trim() || undefined,
        prerequisites: prerequisites.trim() || undefined,
        postrequisites: postrequisites.trim() || undefined,
      };

      let savedStep: SOPStep;

      if (editStepId) {
        // Update existing step
        savedStep = await sopApi.updateSOPStep(sopId, editStepId, stepData);
      } else {
        // Create new step
        savedStep = await sopApi.createSOPStep(sopId, stepData);
      }

      // Process assets if any
      if (assets.length > 0) {
        for (const asset of assets) {
          console.log(asset);
          if (asset.isNew) {
            // Create new asset
            const formData = new FormData();

            if (asset.asset_type === "LINK") {
              formData.append("asset_type", "LINK");
              formData.append("asset_url", asset.asset_url || "");
            } else if (asset.asset_type === "FILE" && asset.asset_file) {
              formData.append("asset_type", "FILE");
              formData.append("asset_file", asset.asset_file);
            }
            formData.append("sop_step", savedStep.id.toString());

            try {
              await sopApi.createStepAsset(savedStep.id, formData as any);
            } catch (assetErr) {
              console.error("Error creating asset:", assetErr);
              // Continue with other assets even if one fails
            }
          }
        }
      }

      // Notify parent component
      onStepSaved();

      // If navigateToConfig is true, redirect to the step configuration page
      if (navigateToConfig) {
        router.push(`/sop/${sopId}/workflow?step_id=${savedStep.id}`);
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Error saving step:", err);
      setError("Failed to save step. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Configure button click
  const handleConfigure = () => {
    handleActionMenuClose();
    handleSave(true);
  };

  // Handle Save from menu
  const handleSaveFromMenu = () => {
    handleActionMenuClose();
    handleSave(false);
  };

  return (
    <>
      <AnimatedDrawer
        open={open}
        onClose={onClose}
        title={
          editStepId
            ? viewMode === "edit"
              ? "Edit Step"
              : "View Step"
            : "Create Step"
        }
        rightActionButton={
          popover && viewMode !== "view"
            ? {
                icon: (
                  <>
                    <SaveIcon />
                    <ArrowDropDownIcon />
                  </>
                ),
                text: "Save",
                onClick: handleActionMenuOpen,
              }
            : undefined
        }
        {...(!popover && viewMode !== "view"
          ? { onSave: handleSaveFromMenu }
          : {})}
        saveDisabled={saveLoading}
        sidebarIcons={
          editStepId
            ? [
                {
                  id: "view",
                  icon: <VisibilityIcon />,
                  tooltip: "View User",
                  onClick: () => setViewMode("view"),
                },
                {
                  id: "edit",
                  icon: <EditIcon />,
                  tooltip: "Edit User",
                  onClick: () => setViewMode("edit"),
                },
              ]
            : []
        }
        defaultSidebarItem={viewMode}
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Typography variant="h6">Step Details</Typography>

            <TextField
              fullWidth
              label="Step Name"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              required
              margin="normal"
              size="small"
              disabled={viewMode === "view"}
            />

            <TextField
              fullWidth
              label="Estimated Duration (days)"
              type="number"
              value={estimatedDuration}
              onChange={(e) =>
                setEstimatedDuration(parseInt(e.target.value) || 1)
              }
              inputProps={{ min: 1, step: 1 }}
              margin="normal"
              size="small"
              disabled={viewMode === "view"}
            />

            <Box sx={{ display: "flex", alignItems: "center", mt: 1, mb: 1 }}>
              <FormControlLabel
                disabled={viewMode === "view"}
                control={
                  <Switch
                    checked={allowSubtaskReordering}
                    onChange={(e) =>
                      setAllowSubtaskReordering(e.target.checked)
                    }
                  />
                }
                label="Allow subtask reordering"
              />
              <Tooltip
                title="Toggling this option enables/disables the ability for agents to rearrange the order of predefined sub steps when working on a Case/SOP. This gives agents flexibility to adapt the procedure to their specific situation."
                arrow
                placement="right"
              >
                <IconButton size="small" color="primary" sx={{ ml: -1 }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", mt: 1, mb: 1 }}>
              <FormControlLabel
                disabled={viewMode === "view"}
                control={
                  <Switch
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                  />
                }
                label="Visible to Service User"
              />
              <Tooltip
                title="When enabled, this step will be visible to the service user when viewing the case details. Disable for internal-only steps."
                arrow
                placement="right"
              >
                <IconButton size="small" color="primary" sx={{ ml: -1 }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {steps && steps?.length > 0 && (
              <TextField
                select
                fullWidth
                label="Prerequisite Step"
                value={prerequisiteSteps.length > 0 ? prerequisiteSteps[0] : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setPrerequisiteSteps(value ? [parseInt(value)] : []);
                }}
                margin="normal"
                size="small"
                helperText="Select a step that must be completed before this one"
                disabled={disablePrerequisites || viewMode === "view"}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {steps
                  ?.filter((step) => !editStepId || step.id !== editStepId) // Filter out current step if editing
                  .sort((a, b) => a.sequence - b.sequence) // Sort by sequence
                  .map((step) => (
                    <MenuItem key={step.id} value={step.id}>
                      {step.sequence}. {step.step_name}
                    </MenuItem>
                  ))}
              </TextField>
            )}

            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <Divider />
            </Box>

            {/* Comments field with expand button */}
            <Box sx={{ position: "relative", mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Comments"
                placeholder="Comments about this step..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                variant="outlined"
                size="small"
                disabled={viewMode === "view"}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mb: -4.8 }}>
                        <IconButton
                          edge="end"
                          onClick={() => setCommentsExpanded(true)}
                          size="small"
                        >
                          <FullScreenIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Prerequisites field with expand button */}
            <Box sx={{ position: "relative", mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Prerequisites"
                placeholder="Prerequisites for this step..."
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                variant="outlined"
                size="small"
                disabled={viewMode === "view"}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mb: -4.8 }}>
                        <IconButton
                          edge="end"
                          onClick={() => setPrerequisitesExpanded(true)}
                          size="small"
                        >
                          <FullScreenIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Postrequisites field with expand button */}
            <Box sx={{ position: "relative", mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Post-requisites"
                placeholder="Post-requisites or follow-up actions..."
                value={postrequisites}
                onChange={(e) => setPostrequisites(e.target.value)}
                variant="outlined"
                size="small"
                disabled={viewMode === "view"}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mb: -4.8 }}>
                        <IconButton
                          edge="end"
                          onClick={() => setPostrequisitesExpanded(true)}
                          size="small"
                        >
                          <FullScreenIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Assets</Typography>
              <Divider />
            </Box>

            {/* Asset tabs for URL vs File upload */}
            <Tabs
              value={assetTab}
              onChange={handleAssetTabChange}
              aria-label="asset tabs"
              sx={{ mb: 2, mt: -2, height: "40px" }}
            >
              <Tab
                label="URL"
                value="url"
                icon={<LinkIcon />}
                iconPosition="start"
                sx={{ minHeight: 'auto' }}
              />
              <Tab
                label="File Upload"
                value="file"
                icon={<UploadIcon />}
                iconPosition="start"
                sx={{ minHeight: 'auto' }}
              />
            </Tabs>

            {/* URL input */}
            {assetTab === "url" && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <TextField
                  fullWidth
                  label="Asset URL"
                  value={assetUrl}
                  onChange={(e) => setAssetUrl(e.target.value)}
                  placeholder="https://example.com/resource"
                  size="small"
                  disabled={viewMode === "view"}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddAsset}
                  sx={{ ml: 1, whiteSpace: "nowrap" }}
                  size="small"
                  disabled={viewMode === "view"}
                >
                  Add
                </Button>
              </Box>
            )}

            {/* File upload */}
            {assetTab === "file" && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{ mr: 1 }}
                  size="small"
                  disabled={viewMode === "view"}
                >
                  Select File
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv"
                  />
                </Button>
                <Box sx={{ flexGrow: 1, ml: 1 }}>
                  {assetFile ? (
                    <Typography noWrap variant="body2" title={assetFile.name}>
                      {assetFile.name} ({Math.round(assetFile.size / 1024)} KB)
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No file selected (Max: 5MB)
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddAsset}
                  disabled={!assetFile || viewMode === "view"}
                  size="small"
                >
                  Add
                </Button>
              </Box>
            )}

            {/* Display list of added assets */}
            {assets.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Added Assets:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {assets.map((asset, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: "background.default",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        {asset.asset_type?.toLowerCase() === "link" ? (
                          <LinkIcon
                            sx={{ mr: 1 }}
                            fontSize="small"
                            color="primary"
                          />
                        ) : (
                          <UploadIcon
                            sx={{ mr: 1 }}
                            fontSize="small"
                            color="primary"
                          />
                        )}
                        <Typography
                          noWrap
                          sx={{ maxWidth: "250px" }}
                          title={asset.asset_url || asset.fileName}
                        >
                          {asset.asset_type?.toLowerCase() === "link"
                            ? asset.asset_url
                            : asset.fileName}
                        </Typography>
                      </Box>
                      <Box>
                        {!asset.isNew &&
                          asset.asset_type?.toLowerCase() === "file" && (
                            <IconButton
                              size="small"
                              onClick={async () => {
                                try {
                                  // Get the signed download URL
                                  if (asset.id) {
                                    const result =
                                      await sopApi.downloadStepAsset(asset.id);
                                    if (result && result.signed_url) {
                                      // Open the signed URL in a new tab
                                      window.open(result.signed_url, "_blank");
                                    }
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error downloading file:",
                                    error
                                  );
                                  setError(
                                    "Failed to download file. Please try again."
                                  );
                                }
                              }}
                              title="Download file"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          )}
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveAsset(index)}
                          color="error"
                          title="Remove asset"
                          disabled={viewMode === "view"}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </AnimatedDrawer>

      {/* Expanded text field dialogs */}
      <Dialog
        open={commentsExpanded}
        onClose={() => setCommentsExpanded(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            label="Comments"
            rows={10}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentsExpanded(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={prerequisitesExpanded}
        onClose={() => setPrerequisitesExpanded(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            label="Prerequisites"
            rows={10}
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrerequisitesExpanded(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={postrequisitesExpanded}
        onClose={() => setPostrequisitesExpanded(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            label="Post-requisites"
            rows={10}
            value={postrequisites}
            onChange={(e) => setPostrequisites(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPostrequisitesExpanded(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog rendered by useConfirm hook */}
      <ConfirmDialog />
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={isActionMenuOpen}
        onClose={handleActionMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleSaveFromMenu} disabled={saveLoading}>
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleConfigure} disabled={saveLoading}>
          <ListItemIcon>
            <FormatListBulletedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save & Add Substeps</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default StepFormDrawer;
