import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Grid, Typography, Box, IconButton, Tooltip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { format } from "date-fns";
import { ServiceTicketSubtask } from "../../../services_service_management/serviceTickets";

interface DraggableTaskProps {
  task: ServiceTicketSubtask;
  groupId: number | string;
  onEditClick: (task: ServiceTicketSubtask) => void;
  onDeleteClick: (task: ServiceTicketSubtask, e: React.MouseEvent) => void;
  onStartTask?: (task: ServiceTicketSubtask) => void;
  onCompleteTask?: (task: ServiceTicketSubtask) => void;
  onViewFormClick?: (task: ServiceTicketSubtask) => void;
  disabled?: boolean;
}

export function DraggableTask({
  task,
  groupId,
  onEditClick,
  onDeleteClick,
  onStartTask,
  onCompleteTask,
  onViewFormClick,
  disabled = false,
}: DraggableTaskProps) {
  // Set up sortable hooks from dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    disabled,
    id: task.id,
    data: {
      type: "subtask",
      task,
      groupId,
    },
  });

  // Define the style for the draggable component
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    cursor: isDragging ? "grabbing" : undefined,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Grid
        container
        sx={{
          py: 1.5,
          px: 3,
          borderBottom: "1px solid #f0f0f0",
          "&:hover": {
            bgcolor: "#fafafa",
          },
          alignItems: "center",
          flexWrap: "wrap",
          backgroundColor: isDragging ? "#f5f5f5" : undefined,
        }}
      >
        <Grid
          size={0.4}
          sx={{ display: "flex", alignItems: "center", mb: { xs: 1, sm: 0 } }}
        >
          {/* Drag handle */}
          <Box
            sx={{
              display: "inline-flex",
              mr: 1,
              color: disabled ? "#bdbdbd" : "text.secondary",
              cursor: disabled ? "default" : "grab",
              zIndex: 10,
              position: "relative",
              p: 0.5,
              borderRadius: '4px',
              opacity: disabled ? 0.6 : 1,
              '&:hover': {
                bgcolor: disabled ? undefined : '#f5f5f5',
              },
            }}
            {...listeners}
            {...attributes}
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
          >
            <DragIndicatorIcon fontSize="small"/>
          </Box>
        </Grid>
        <Grid size={{ xs: 11, sm: 5, md: 3 }} display="flex">
          {/* Status indicator */}
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 2,
              bgcolor:
                task.status === "Completed"
                  ? "#4caf50"
                  : task.status === "In Progress"
                  ? "#ff9800"
                  : task.status === "Deferred"
                  ? "#f44336"
                  : "#2196f3",
              flexShrink: 0,
            }}
          >
            {task.status === "Completed" && (
              <CheckIcon sx={{ fontSize: 12, color: "#fff" }} />
            )}
          </Box>

          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {task.subtask_name}
          </Typography>
        </Grid>

        {/* Status */}
        <Grid
          size={{ xs: 0, sm: 2, md: 2 }}
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          <Typography
            variant="body2"
            sx={{
              color:
                task.status === "Completed"
                  ? "#4caf50"
                  : task.status === "In Progress"
                  ? "#ff9800"
                  : task.status === "Deferred"
                  ? "#f44336"
                  : "#2196f3",
              fontWeight: 500,
            }}
          >
            {task.status}
          </Typography>
        </Grid>

        {/* Assignee */}
        <Grid
          size={{ xs: 0, sm: 2, md: 2 }}
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          <Typography variant="body2" color="text.secondary">
            {task.assigned_agent ? `${task.assigned_agent.first_name} ${task.assigned_agent.last_name}` : "Unassigned"}
          </Typography>
        </Grid>

        {/* Date info */}
        <Grid
          size={{ xs: 0, sm: 0, md: 2 }}
          sx={{ display: { xs: "none", sm: "none", md: "block" } }}
        >
          <Typography variant="body2" color="text.secondary">
            {task.subtask_start_date
              ? format(new Date(task.subtask_start_date), "d MMM yyyy")
              : "N/A"}
            {task.subtask_end_date && task.status === "Completed" && (
              <>
                <br />
                <span style={{ fontSize: "0.8rem", color: "#4caf50" }}>
                  Completed:{" "}
                  {format(new Date(task.subtask_end_date), "d MMM yyyy")}
                </span>
              </>
            )}
          </Typography>
        </Grid>

        {/* Actions */}
        <Grid
          size={{ xs: 12, sm: 2, md: 2 }}
          sx={{
            display: "flex",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
            {/* Start/Stop/Completed status */}
            {onStartTask && onCompleteTask && (
              <>
                {task.status === "New" ? (
                  <Tooltip title="Start Subtask">
                    <IconButton
                      size="small"
                      color="primary"
                      sx={{ padding: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartTask(task);
                      }}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : task.status === "In Progress" ? (
                  <Tooltip title="Complete Subtask">
                    <IconButton
                      size="small"
                      color="warning"
                      sx={{ padding: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteTask(task);
                      }}
                    >
                      <StopIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </>
            )}

            {/* Edit button */}
            <Tooltip title="Edit Subtask">
              <IconButton
                size="small"
                color="info"
                sx={{ padding: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(task);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Delete button */}
            <Tooltip title="Delete Subtask">
              <IconButton
                size="small"
                color="error"
                sx={{ padding: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(task, e);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* View Form button - if we have a form type */}
            {onViewFormClick && task.form_fields?.length > 0 && (
              <Tooltip title="View Form">
                <IconButton
                  size="small"
                  color="primary"
                  sx={{ padding: 0.5 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewFormClick(task);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Grid>
      </Grid>
    </div>
  );
}

export default DraggableTask;
