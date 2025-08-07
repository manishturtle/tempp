"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Tooltip,
  Chip,
  CircularProgress,
  IconButton,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { sopApi, SOPStep, SOP } from "../../../../../services_service_management/sop";
import { useMultiTenantRouter } from "../../../../../hooks/service-management/useMultiTenantRouter";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CommentIcon from "@mui/icons-material/Comment";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
// import { useConfirm } from "../../../../../components/ServiceManagement/shared/useConfirm";
import {useConfirm} from "../../../../../components/common/useConfirm"
import StepFormDrawer from "../../../../../components/ServiceManagement/sop/steps/StepFormDrawer"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings } from "@mui/icons-material";

// Sortable Step Card Component
interface SortableStepCardProps {
  step: SOPStep;
  onEdit: (stepId: number) => void;
  onDelete: (stepId: number) => void;
  onConfigure: (stepId: number) => void;
}

function SortableStepCard({
  step,
  onEdit,
  onDelete,
  onConfigure,
}: SortableStepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  // Check if comment is more than 3 lines (roughly 150 characters)
  const isLongComment = step.comments && step.comments.length > 150;
  const displayComment = isLongComment
    ? `${step.comments.substring(0, 150)}...`
    : step.comments;

  // Separate handlers to prevent event propagation issues
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(step.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(step.id);
  };

  const handleConfigureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigure(step.id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        position: "relative",
        "&:hover": {
          boxShadow: 3,
        },
        display: "flex",
        alignItems: "center",
      }}
      {...attributes}
    >
      {/* Drag Handle */}
      <Box
        {...listeners}
        sx={{
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          padding: "16px",
          touchAction: "none",
        }}
      >
        <DragIndicatorIcon />
      </Box>
      <CardContent>
        <Box
          sx={{
            position: "absolute",
            left: 16,
            top: 16,
            bgcolor: "primary.main",
            color: "white",
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {step.sequence}
        </Box>
        <Box sx={{ ml: 5 }}>
          <Typography variant="h6" component="div">
            {step.step_name}
          </Typography>

          <Box display="flex" alignItems="center" mt={1} mb={1}>
            <AccessTimeIcon
              fontSize="small"
              sx={{ mr: 1, color: "text.secondary" }}
            />
            <Typography variant="body2" color="text.secondary">
              Estimated Duration: {step.estimated_duration} day
              {step.estimated_duration !== 1 ? "s" : ""}
            </Typography>
          </Box>

          <Box display="flex" alignItems="flex-start" mt={1}>
            <CommentIcon
              fontSize="small"
              sx={{ mr: 1, color: "text.secondary" }}
            />
            {step.comments ? (
              <Tooltip
                title={isLongComment ? step.comments : ""}
                arrow
                placement="bottom-start"
              >
                <Typography variant="body2" color="text.secondary">
                  {displayComment}
                </Typography>
              </Tooltip>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No comments
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action buttons with separate event handling */}
        <Box
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            pointerEvents: "all",
            gap: 1,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            sx={{
              minWidth: "auto",
              padding: "2px 8px",
            }}
            onClick={handleEditClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <EditIcon fontSize="small" />
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="error"
            sx={{
              minWidth: "auto",
              padding: "2px 8px",
            }}
            onClick={handleDeleteClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DeleteIcon fontSize="small" />
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            sx={{
              minWidth: "auto",
              padding: "2px 8px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleConfigureClick}
          >
            <Settings fontSize="small" />
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SOPDetailPage() {
  const router = useMultiTenantRouter();
  const params = useParams();
  const sopId = Number(params.id);

  const [sop, setSop] = useState<SOP | null>(null);
  const [steps, setSteps] = useState<SOPStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for delete operation
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Use the confirm hook at the component level
  const confirmHook = useConfirm();
  const { confirm, ConfirmDialog } = confirmHook;

  // Step selected for actions
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);

  // State for notifications
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const [viewMode, setViewMode] = useState<"view" | "edit" | "create">(
    "create"
  );

  useEffect(() => {
    document.title = `SOP | ${sop?.sop_name || ""}`;
  }, [sop]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchSOPDetails() {
      if (!sopId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch SOP details
        const sopData = await sopApi.getSOPById(sopId);
        setSop(sopData);

        // Fetch SOP steps
        const stepsData = await sopApi.getSOPSteps(sopId);
        const results = stepsData?.results;
        setSteps(results);
      } catch (err) {
        console.error("Error fetching SOP details:", err);
        setError("Failed to load SOP details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchSOPDetails();
  }, [sopId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !steps) {
      return;
    }

    // Find the indices of the dragged item and the drop target
    const oldIndex = steps.findIndex((step) => step.id === active.id);
    const newIndex = steps.findIndex((step) => step.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Update the local state first for a responsive UI
      const newSteps = arrayMove(steps, oldIndex, newIndex);

      // Update the sequence numbers
      const updatedSteps = newSteps.map((step, idx) => ({
        ...step,
        sequence: idx + 1,
      }));

      setSteps(updatedSteps);

      try {
        // Format the data for the API call according to backend requirements
        const reorderData = updatedSteps.map((step) => ({
          step_id: step.id,
          sequence: step.sequence,
        }));

        // Call the API to update the sequence on the server
        const response = await sopApi.reorderSOPSteps(sopId, reorderData);
        console.log("Step sequence updated successfully:", response.message);
      } catch (err) {
        console.error("Error updating step sequence:", err);
        // Optionally show an error message to the user
        // You could also revert the UI if the API call fails
      }
    }
  };

  const handleEditStep = (stepId: number) => {
    setEditingStepId(stepId);
    setFormDrawerOpen(true);
    setViewMode("edit");
  };

  // Simple function to delete without confirmation (for testing)
  const deleteStepDirectly = async (stepId: number) => {
    if (!sopId) {
      console.error("No SOP ID available");
      return;
    }

    setDeleteInProgress(true);

    try {
      // Call the API to delete the step
      const response = await sopApi.deleteSOPStep(sopId, stepId);
      console.log("API response:", response);

      // Remove the deleted step from the local state
      if (steps) {
        const updatedSteps = steps.filter((step) => step.id !== stepId);
        setSteps(updatedSteps);
      }

      // Show success notification
      setNotification({
        open: true,
        message: "Step deleted successfully",
        severity: "success",
      });
    } catch (err) {
      console.error("Error deleting step:", err);
      // Show error notification
      setNotification({
        open: true,
        message: "Failed to delete step. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    const stepToDelete = steps?.find((step) => step.id === stepId);
    if (!stepToDelete || !sopId) {
      console.error("Step not found or no SOP ID");
      return;
    }

    try {
      // Try/catch the confirm call
      let confirmed = false;
      try {
        confirmed = await confirm({
          title: "Delete Step",
          message: `Are you sure you want to delete "${stepToDelete.step_name}"?`,
          confirmText: "Delete",
          cancelText: "Cancel",
          confirmColor: "error",
        });
      } catch (confirmError) {
        confirmed = window.confirm(
          `Are you sure you want to delete "${stepToDelete.step_name}"?`
        );
      }

      if (!confirmed) {
        return;
      }

      // If confirmed, delete the step
      await deleteStepDirectly(stepId);
    } catch (err) {
      console.error("Error in delete flow:", err);
      setNotification({
        open: true,
        message: "An error occurred in the delete process.",
        severity: "error",
      });
    }
  };

  const handleStepSaved = async () => {
    setEditingStepId(null);
    const stepsData = await sopApi.getSOPSteps(sopId);
    const results = stepsData?.results;
    setSteps(results);
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  const handleConfigureStep = (stepId: number) => {
    router.push(`Crm/service-management/sop/${sopId}/workflow?step_id=${stepId}`);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ mb: "0px !important" }}>
          {sop?.sop_name}
        </Typography>
        <Chip
          label={sop?.status}
          color={
            sop?.status === "Active"
              ? "success"
              : sop?.status === "Superseded"
              ? "warning"
              : "default"
          }
          size="small"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ ml: "auto" }}
          onClick={() => {
            setEditingStepId(null);
            setViewMode("create");
            setFormDrawerOpen(true);
          }}
        >
          Add Step
        </Button>
      </Box>

      {!sop && <Typography variant="h6">SOP not found</Typography>}

      {sop && sop.allow_step_reordering && steps.length > 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Drag steps to reorder them
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        {steps.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { bgcolor: "action.hover" },
            }}
            onClick={() => {
              setEditingStepId(null);
              setFormDrawerOpen(true);
            }}
          >
            <Typography variant="h6" color="primary" gutterBottom>
              Get started with your new SOP!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create steps that this SOP will follow. Click the 'Add Step'
              button above or click anywhere in this box to add your first step.
            </Typography>
          </Paper>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps?.map((step) => step.id)}
              strategy={verticalListSortingStrategy}
            >
              {steps?.map((step) => (
                <SortableStepCard
                  key={step.id}
                  step={step}
                  onEdit={handleEditStep}
                  onDelete={handleDeleteStep}
                  onConfigure={handleConfigureStep}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Box>

      {/* Render the ConfirmDialog component from useConfirm */}
      <ConfirmDialog />

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      <StepFormDrawer
        open={formDrawerOpen}
        onClose={() => {
          setFormDrawerOpen(false);
          setViewMode("create");
        }}
        sopId={sopId}
        steps={steps}
        editStepId={editingStepId}
        onStepSaved={handleStepSaved}
        mode={viewMode}
      />
    </Box>
  );
}
