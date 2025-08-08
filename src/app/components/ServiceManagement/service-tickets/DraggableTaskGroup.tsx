import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Paper,
  Grid,
  Typography,
  Box,
  Tooltip,
  IconButton,
  Collapse,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  ServiceTicketTask,
  ServiceTicketSubtask,
} from "../../../services_service_management/serviceTickets";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface DraggableTaskGroupProps {
  group: ServiceTicketTask;
  tasks: ServiceTicketSubtask[];
  childrenIds: (number | string)[];
  onEditClick: (task: ServiceTicketTask) => void;
  onDeleteClick: (task: ServiceTicketTask, e: React.MouseEvent) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

// Helper function to get color by status
const getStatusColor = (status: string) => {
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case "new":
      return "blue";
    case "in progress":
      return "orange";
    case "completed":
      return "green";
    case "deferred":
      return "red";
    default:
      return "default";
  }
};

export function DraggableTaskGroup(props: DraggableTaskGroupProps) {
  const {
    group,
    childrenIds,
    onEditClick,
    onDeleteClick,
    disabled = false,
    children,
    tasks = [],
  } = props;
  // Setup sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    data: {
      type: "task",
      group,
      childrenIds,
    },
    disabled,
  });

  // Define style for draggable component
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Paper
        elevation={isDragging ? 3 : 1}
        sx={{
          mb: 2,
          borderRadius: 1,
          overflow: "hidden",
          transition: "box-shadow 0.2s ease-in-out",
          "&:hover": {
            boxShadow: 3,
          },
        }}
      >
        <Grid
          container
          sx={{
            py: 1.5,
            px: 3,
            backgroundColor: "#f0f0f0",
            borderLeft: "4px solid #2196f3",
            position: "relative",
            alignItems: "center",
          }}
        >
          <Grid size={0.4}>
            <Box
              sx={{
                display: "flex",
                mr: 1,
                color: "text.secondary",
                cursor: disabled ? "default" : "grab",
              }}
              {...listeners}
              {...attributes}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Grid>
          <Grid
            size={{ xs: 11, sm: 5, md: 3 }}
            display="flex"
            alignItems="center"
            sx={{
              flexWrap: "wrap",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 500,
                cursor: "pointer",
                mb: "0px !important",
                "&:hover": {
                  color: "primary.main",
                  textDecoration: "underline",
                },
              }}
            >
              {group.task_name}
            </Typography>

            <Box sx={{ ml: 1, display: "flex" }}>
              <Tooltip title="Edit Task Group">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering drag events
                    onEditClick(group);
                  }}
                  sx={{
                    p: 0.5,
                    color: "primary.main",
                    "&:hover": {
                      color: "primary.dark",
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete Task Group with Subtasks">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering drag events
                    onDeleteClick(group, e);
                  }}
                  sx={{
                    p: 0.5,
                    color: "error.main",
                    "&:hover": {
                      color: "error.dark",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          <Grid
            size={{ xs: 0, sm: 2, md: 2 }}
            sx={{ display: { xs: "none", sm: "flex" }, flexWrap: "wrap" }}
            alignItems="center"
          >
            <Typography
              variant="h6"
              fontWeight={500}
              sx={{ mb: "0px !important" }}
            >
              Status
            </Typography>
            <span
              style={{
                fontSize: "10px",
                backgroundColor: getStatusColor(group.status),
                borderRadius: "2px",
                padding: "2px 6px",
                color: "white",
                textTransform: "capitalize",
                marginLeft: "6px",
                fontWeight: 600,
              }}
            >
              {group.status}
            </span>
          </Grid>
          <Grid
            size={{ xs: 0, sm: 2, md: 2 }}
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            <Typography
              variant="h6"
              fontWeight={500}
              sx={{ mb: "0px !important" }}
            >
              Assignee
            </Typography>
          </Grid>
          <Grid
            size={{ xs: 0, sm: 0, md: 2 }}
            sx={{ display: { xs: "none", sm: "none", md: "block" } }}
          >
            <Typography
              variant="h6"
              fontWeight={500}
              sx={{ mb: "0px !important" }}
            >
              Started On
            </Typography>
          </Grid>
          <Grid
            size={{ xs: 12, sm: 2, md: 2 }}
            sx={{
              display: "flex",
              justifyContent: { xs: "flex-start", sm: "flex-end" },
            }}
          >
            <Typography
              variant="h6"
              fontWeight={500}
              sx={{ mb: "0px !important" }}
            >
              Actions
            </Typography>
          </Grid>
        </Grid>

        {/* Subtasks container with collapsible section */}
        {tasks.length > 0 && childrenIds.length > 0 ? (
          <Box
            sx={{
              borderTop: "1px solid #eaeaea",
              pointerEvents: "auto", // Ensure events work here
            }}
          >
            <SortableContext
              items={childrenIds}
              strategy={verticalListSortingStrategy}
            >
              {children}
            </SortableContext>
          </Box>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No subtasks found.
            </Typography>
          </Box>
        )}
      </Paper>
    </div>
  );
}

export default DraggableTaskGroup;
