import React, { useState, useEffect, useMemo } from "react";
import { useConfirm } from "../../../../../components/common/useConfirm";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormHelperText,
  Divider,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { BLOCK_TYPES, validateBlock } from "./workflowBlocks";
import FormFieldsDialog from "./FormFieldsDialog";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

interface BlockDefinitionProps {
  selectedBlock: {
    id: string;
    type: string;
    objectName: string;
    data?: any;
  } | null;
  onClose: () => void;
  onSave: (blockData: any) => void;
  onDelete: () => void;
  onFieldChange?: (id: string, field: string, value: any) => void;
}

const BlockDefinition: React.FC<BlockDefinitionProps> = ({
  selectedBlock,
  onClose,
  onSave,
  onDelete,
  onFieldChange,
}) => {
  // Debug props directly when they come in
  console.log('Raw selectedBlock props:', selectedBlock);
  console.log('Raw selectedBlock.data:', selectedBlock?.data);
  console.log('Fields in props:', selectedBlock?.data?.fields);
  console.log('All keys in data:', selectedBlock?.data ? Object.keys(selectedBlock.data) : 'No data');

  const [blockData, setBlockData] = useState<any>(selectedBlock || {});
  const [showFieldsEditor, setShowFieldsEditor] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [descriptionExpanded, setDescriptionExpanded] =
    useState<boolean>(false);
  const [fillingInstructionsExpanded, setFillingInstructionsExpanded] =
    useState<boolean>(false);
  const hasFields = blockData?.data?.fields?.length > 0;
  // Initialize form data with defaults if needed
  console.log('Selected Block JSON:', JSON.stringify(selectedBlock, null, 2));
  console.log('blockData after setting state:', blockData);

  useEffect(() => {
    if (selectedBlock?.type === BLOCK_TYPES.FORM) {
      setBlockData(selectedBlock);
    }
  }, [selectedBlock]);

  if (!selectedBlock) return null;

  const handleInputChange = (field: string, value: any) => {
    // Clear field errors if any
    if (field.includes(".")) {
      // For nested fields like "data.description"
      const mainField = field.split(".")[1]; // Get "description" from "data.description"
      if (fieldErrors[mainField]) {
        setFieldErrors({ ...fieldErrors, [mainField]: "" });
      }
    } else if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: "" });
    }

    // Update block data based on field type
    if (field.startsWith("data.")) {
      // Handle nested data fields
      const nestedField = field.split(".")[1]; // Extract nested field name
      setBlockData({
        ...blockData,
        data: {
          ...(blockData.data || {}),
          [nestedField]: value,
        },
      });
    } else {
      // Handle direct fields
      setBlockData({
        ...blockData,
        [field]: value,
      });
    }

    // If we have an onFieldChange handler, call it with the field and value
    if (onFieldChange && selectedBlock) {
      // Pass the node id, field name, and value directly
      onFieldChange(selectedBlock.id, field, value);
    }

    setError("");
  };

  const validateFields = () => {
    const newErrors: { [key: string]: string } = {};
    let hasErrors = false;

    // Validate all required fields
    if (!blockData.objectName?.trim()) {
      newErrors.objectName = "Display name is required";
      hasErrors = true;
    }

    if (selectedBlock.type === BLOCK_TYPES.FORM) {
      if (!blockData.data?.description?.trim()) {
        newErrors.description = "Description is required";
        hasErrors = true;
      }

      if (!blockData.data?.fillingInstructions?.trim()) {
        newErrors.fillingInstructions = "Filling instructions are required";
        hasErrors = true;
      }
    }

    // If we have errors, update error state and don't open the editor
    if (hasErrors) {
      setFieldErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleShowFieldsEditor = () => {
    if (!validateFields()) return;
    setShowFieldsEditor(true);
  };

  const handleSave = () => {
    const data = {
      ...blockData,
      data: {
        ...(blockData.data || {}),
        objectName: blockData.objectName,
      },
    };

    // Perform validation based on block type
    const validation = validateBlock(data);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    onSave(data);
  };

  const handleSaveFields = (fields: any[]) => {
    const data = {
      ...blockData,
      data: {
        ...(blockData.data || {}),
        fields,
        objectName: blockData.objectName,
      },
    };
    setBlockData(data);
    const validation = validateBlock(data);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }
    setShowFieldsEditor(false);
    onSave(data);
  };

  const { confirm, ConfirmDialog } = useConfirm();

  const handleClose = async () => {
    if (hasFields) {
      if (!validateFields()) return;
      onClose();
    } else {
      const hasData =
        blockData?.type === "form" &&
        (blockData?.data?.description?.trim() ||
          blockData?.data?.fillingInstructions?.trim());
      if (hasData) {
        const confirmed = await confirm({
          title: "Discard changes?",
          message:
            "Are you sure you want to cancel? Doing so will remove all previously entered data.",
          confirmText: "Yes, discard",
          cancelText: "No, keep editing",
          confirmColor: "error",
        });

        if (confirmed) {
          onClose();
          onDelete();
        }
      } else {
        onDelete();
        onClose();
      }
    }
  };

  return (
    <>
      <ConfirmDialog />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontWeight: "bold" }}>Block Definition</Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={onDelete}>
              <DeleteIcon color="error" />
            </IconButton>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />
        <FormFieldsDialog
          open={showFieldsEditor}
          fields={blockData.data?.fields || []}
          displayName={blockData.objectName}
          onSave={handleSaveFields}
          onClose={() => setShowFieldsEditor(false)}
        />

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            pb: 6,
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Display Name"
              placeholder="Enter display name"
              value={blockData.objectName || ""}
              onChange={(e) => handleInputChange("objectName", e.target.value)}
              size="small"
              required
              error={!!fieldErrors.objectName}
              helperText={fieldErrors.objectName || ""}
              sx={{ mb: 3 }}
            />

            {/* Form specific fields */}
            {selectedBlock.type === BLOCK_TYPES.FORM && (
              <>
                {/* Basic Settings Section */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Basic Settings
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Form Description"
                    placeholder="Enter form description"
                    value={blockData.data?.description || ""}
                    onChange={(e) =>
                      handleInputChange("data.description", e.target.value)
                    }
                    size="small"
                    required
                    error={!!fieldErrors.description}
                    helperText={fieldErrors.description || ""}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end" sx={{ mb: -4.8 }}>
                            <IconButton
                              edge="end"
                              onClick={() => setDescriptionExpanded(true)}
                              size="small"
                            >
                              <FullscreenIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Filling Instructions"
                    placeholder="Instructions for users filling out this form"
                    value={blockData.data?.fillingInstructions || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "data.fillingInstructions",
                        e.target.value
                      )
                    }
                    size="small"
                    required
                    error={!!fieldErrors.fillingInstructions}
                    helperText={fieldErrors.fillingInstructions || ""}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end" sx={{ mb: -4.8 }}>
                            <IconButton
                              edge="end"
                              onClick={() =>
                                setFillingInstructionsExpanded(true)
                              }
                              size="small"
                            >
                              <FullscreenIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={blockData.data?.visible !== false}
                        onChange={(e) =>
                          handleInputChange("data.visible", e.target.checked)
                        }
                      />
                    }
                    label="Visible to Service User"
                  />
                  <Tooltip
                    title="When enabled, this sub step/block will be visible to the service user when viewing the case details. Disable for internal-only steps."
                    arrow
                    placement="bottom"
                  >
                    <IconButton size="small" color="primary" sx={{ ml: -1 }}>
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            )}

            {error && (
              <FormHelperText error sx={{ mb: 2 }}>
                {error}
              </FormHelperText>
            )}
          </Box>

          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              left: 0,
              bgcolor: "background.paper",
              zIndex: 1,
            }}
          >
            {hasFields && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 2, mt: 1, display: "block" }}
              >
                * Changes made are auto-saved
              </Typography>
            )}
            <Box
              sx={{
                p: 2,
                display: "flex",
                justifyContent:
                  selectedBlock.type === BLOCK_TYPES.FORM
                    ? "space-between"
                    : "flex-end",
                gap: 2,
                borderTop: "1px solid #ccc",
              }}
            >
              {selectedBlock.type === BLOCK_TYPES.FORM ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleShowFieldsEditor}
                  >
                    Define Fields
                  </Button>
                  <Button variant="outlined" onClick={handleClose}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button variant="outlined" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    startIcon={<AddIcon />}
                  >
                    Block
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Form Description Expanded Dialog */}
      <Dialog
        open={descriptionExpanded}
        onClose={() => setDescriptionExpanded(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={10}
            label="Form Description"
            placeholder="Enter form description"
            value={blockData.data?.description || ""}
            onChange={(e) =>
              handleInputChange("data.description", e.target.value)
            }
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionExpanded(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Filling Instructions Expanded Dialog */}
      <Dialog
        open={fillingInstructionsExpanded}
        onClose={() => setFillingInstructionsExpanded(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={10}
            label="Filling Instructions"
            placeholder="Instructions for users filling out this form"
            value={blockData.data?.fillingInstructions || ""}
            onChange={(e) =>
              handleInputChange("data.fillingInstructions", e.target.value)
            }
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFillingInstructionsExpanded(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BlockDefinition;
