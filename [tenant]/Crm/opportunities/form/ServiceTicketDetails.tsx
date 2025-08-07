"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Divider from "@mui/material/Divider";

// Icons
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {
  StaffUser,
  useUpdateTask,
  useUpdateSubtask,
} from "@/app/hooks/api/opportunities";

// Types
interface ServiceUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  linked_account: number;
  user_type: number[];
  phone: string | null;
  org_id: number;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

interface AssignedAgent {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface SubTask {
  id: number;
  task: number;
  subtask_name: string;
  subtask_start_date: string | null;
  subtask_end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  client_id: string;
  company_id: string;
  sequence: number;
  status: string;
  assigned_agent: AssignedAgent | null;
  visible: boolean;
}

interface Task {
  id: number;
  source_step: {
    id: number;
    step_name: string;
    sequence: number;
    sop: {
      id: number;
    };
  };
  assigned_agent: AssignedAgent | null;
  subtasks: SubTask[];
  client_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  task_name: string;
  sequence: number;
  status: string;
  allow_subtask_reordering: boolean;
  visible: boolean;
  service_ticket: number;
}

interface ServiceTicket {
  id: number;
  service_user: ServiceUser;
  assigned_agent: AssignedAgent | null;
  tasks: Task[];
  client_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  ticket_id: string;
  subject: string;
  body: string | null;
  status: string;
  priority: string;
  target_resolution_date: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  executed_sop: number;
}

interface ServiceTicketDetailsProps {
  serviceTicket: ServiceTicket;
  isViewMode: boolean;
  staffUsersData: StaffUser[];
  isLoadingStaffUsers: boolean;
}

const ServiceTicketDetails: React.FC<ServiceTicketDetailsProps> = ({
  serviceTicket,
  isViewMode,
  staffUsersData,
  isLoadingStaffUsers,
}) => {
  const { t } = useTranslation();
  const [editingTaskStatusMap, setEditingTaskStatusMap] = useState<
    Map<number, boolean>
  >(new Map());
  const [editingSubtaskStatusMap, setEditingSubtaskStatusMap] = useState<
    Map<number, boolean>
  >(new Map());
  const [selectedTaskStatusMap, setSelectedTaskStatusMap] = useState<
    Map<number, string>
  >(new Map());
  const [selectedSubtaskStatusMap, setSelectedSubtaskStatusMap] = useState<
    Map<number, string>
  >(new Map());

  const [editingTaskAgentMap, setEditingTaskAgentMap] = useState<
    Map<number, boolean>
  >(new Map());
  const [editingSubtaskAgentMap, setEditingSubtaskAgentMap] = useState<
    Map<number, boolean>
  >(new Map());
  const [selectedTaskAgentMap, setSelectedTaskAgentMap] = useState<
    Map<number, StaffUser | null>
  >(new Map());
  const [selectedSubtaskAgentMap, setSelectedSubtaskAgentMap] = useState<
    Map<number, StaffUser | null>
  >(new Map());
  const staffUsersList = staffUsersData?.users || [];

  // Debug logs to see what's coming in
  console.log("Staff Users Data:", staffUsersList);

  // Initialize API mutations
  const updateTask = useUpdateTask();
  const updateSubtask = useUpdateSubtask();

  // Format date helper function
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get today's date in ISO format for API
  const getTodayISODate = (): string => {
    const today = new Date();
    return today.toISOString();
  };

  // State for notifications
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Start editing task status
  const handleEditTaskStatus = (task: Task) => {
    // Set this task to editing status mode
    const newEditingTaskStatusMap = new Map(editingTaskStatusMap);
    newEditingTaskStatusMap.set(task.id, true);
    setEditingTaskStatusMap(newEditingTaskStatusMap);

    // Store current status
    const newSelectedTaskStatusMap = new Map(selectedTaskStatusMap);
    newSelectedTaskStatusMap.set(task.id, task.status);
    setSelectedTaskStatusMap(newSelectedTaskStatusMap);

    // Set this task to editing agent mode
    const newEditingTaskAgentMap = new Map(editingTaskAgentMap);
    newEditingTaskAgentMap.set(task.id, true);
    setEditingTaskAgentMap(newEditingTaskAgentMap);

    // Find matching staff user if there's an assigned agent
    const newSelectedTaskAgentMap = new Map(selectedTaskAgentMap);
    if (task.assigned_agent) {
      // Try to find by ID first
      let matchingStaffUser = staffUsersList.find(
        (user: StaffUser) => user.id === task.assigned_agent?.id
      );

      // If no match by ID, try by email as a fallback
      if (!matchingStaffUser && task.assigned_agent.email) {
        matchingStaffUser = staffUsersList.find(
          (user: StaffUser) => user.email === task.assigned_agent?.email
        );
      }

      // If still no match, use the task's assigned_agent directly
      // This ensures we display something even if no exact match in staffUsersList
      if (!matchingStaffUser && task.assigned_agent) {
        matchingStaffUser = task.assigned_agent as unknown as StaffUser;
      }

      newSelectedTaskAgentMap.set(task.id, matchingStaffUser || null);
    } else {
      newSelectedTaskAgentMap.set(task.id, null);
    }
    setSelectedTaskAgentMap(newSelectedTaskAgentMap);
  };

  // Cancel editing task status
  const handleCancelEditTaskStatus = (taskId: number) => {
    // Clear status editing
    const newEditingTaskStatusMap = new Map(editingTaskStatusMap);
    newEditingTaskStatusMap.delete(taskId);
    setEditingTaskStatusMap(newEditingTaskStatusMap);

    // Clear agent editing
    const newEditingTaskAgentMap = new Map(editingTaskAgentMap);
    newEditingTaskAgentMap.delete(taskId);
    setEditingTaskAgentMap(newEditingTaskAgentMap);
  };

  // Confirm task status update
  const handleConfirmTaskStatus = (taskId: number) => {
    // Get the selected values
    const status = selectedTaskStatusMap.get(taskId);
    const assignedAgent = selectedTaskAgentMap.get(taskId);

    // Prepare the update payload
    const updateData = {
      status,
      assigned_agent_id: assignedAgent ? assignedAgent.id : null,
    };

    // Call the API
    updateTask.mutate(
      { id: taskId, data: updateData },
      {
        onSuccess: () => {
          setNotification({
            open: true,
            message: "Task updated successfully",
            severity: "success",
          });

          // Clear status editing
          const newEditingTaskStatusMap = new Map(editingTaskStatusMap);
          newEditingTaskStatusMap.delete(taskId);
          setEditingTaskStatusMap(newEditingTaskStatusMap);

          // Clear agent editing
          const newEditingTaskAgentMap = new Map(editingTaskAgentMap);
          newEditingTaskAgentMap.delete(taskId);
          setEditingTaskAgentMap(newEditingTaskAgentMap);
        },
        onError: (error) => {
          console.error("Error updating task:", error);
          setNotification({
            open: true,
            message: "Failed to update task",
            severity: "error",
          });
        },
      }
    );
  };

  // Start editing subtask status
  const handleEditSubtaskStatus = (subtask: SubTask) => {
    // Set subtask status editing mode
    const newEditingSubtaskStatusMap = new Map(editingSubtaskStatusMap);
    newEditingSubtaskStatusMap.set(subtask.id, true);
    setEditingSubtaskStatusMap(newEditingSubtaskStatusMap);

    // Store current status
    const newSelectedSubtaskStatusMap = new Map(selectedSubtaskStatusMap);
    newSelectedSubtaskStatusMap.set(subtask.id, subtask.status);
    setSelectedSubtaskStatusMap(newSelectedSubtaskStatusMap);

    // Set this subtask to editing agent mode
    const newEditingSubtaskAgentMap = new Map(editingSubtaskAgentMap);
    newEditingSubtaskAgentMap.set(subtask.id, true);
    setEditingSubtaskAgentMap(newEditingSubtaskAgentMap);

    // Find matching staff user if there's an assigned agent
    const newSelectedSubtaskAgentMap = new Map(selectedSubtaskAgentMap);
    if (subtask.assigned_agent) {
      // Try to find by ID first
      let matchingStaffUser = staffUsersList.find(
        (user: StaffUser) => user.id === subtask.assigned_agent?.id
      );

      // If no match by ID, try by email as a fallback
      if (!matchingStaffUser && subtask.assigned_agent.email) {
        matchingStaffUser = staffUsersList.find(
          (user: StaffUser) => user.email === subtask.assigned_agent?.email
        );
      }

      // If still no match, use the subtask's assigned_agent directly
      // This ensures we display something even if no exact match in staffUsersList
      if (!matchingStaffUser && subtask.assigned_agent) {
        matchingStaffUser = subtask.assigned_agent as unknown as StaffUser;
      }

      newSelectedSubtaskAgentMap.set(subtask.id, matchingStaffUser || null);
    } else {
      newSelectedSubtaskAgentMap.set(subtask.id, null);
    }
    setSelectedSubtaskAgentMap(newSelectedSubtaskAgentMap);
  };

  // Cancel editing subtask status
  const handleCancelEditSubtaskStatus = (subtaskId: number) => {
    // Clear status editing
    const newEditingSubtaskStatusMap = new Map(editingSubtaskStatusMap);
    newEditingSubtaskStatusMap.delete(subtaskId);
    setEditingSubtaskStatusMap(newEditingSubtaskStatusMap);

    // Clear agent editing
    const newEditingSubtaskAgentMap = new Map(editingSubtaskAgentMap);
    newEditingSubtaskAgentMap.delete(subtaskId);
    setEditingSubtaskAgentMap(newEditingSubtaskAgentMap);
  };

  // Start a subtask
  const handleStartSubtask = (subtaskId: number) => {
    // Prepare the update payload
    const updateData = {
      subtask_start_date: getTodayISODate(),
      status: "In Progress",
    };

    // Call the API
    updateSubtask.mutate(
      { id: subtaskId, data: updateData },
      {
        onSuccess: () => {
          setNotification({
            open: true,
            message: "Subtask started successfully",
            severity: "success",
          });
        },
        onError: (error) => {
          console.error("Error starting subtask:", error);
          setNotification({
            open: true,
            message: "Failed to start subtask",
            severity: "error",
          });
        },
      }
    );
  };

  // Complete a subtask
  const handleCompleteSubtask = (subtaskId: number) => {
    // Prepare the update payload
    const updateData = {
      subtask_end_date: getTodayISODate(),
      status: "Completed",
    };

    // Call the API
    updateSubtask.mutate(
      { id: subtaskId, data: updateData },
      {
        onSuccess: () => {
          setNotification({
            open: true,
            message: "Subtask completed successfully",
            severity: "success",
          });
        },
        onError: (error) => {
          console.error("Error completing subtask:", error);
          setNotification({
            open: true,
            message: "Failed to complete subtask",
            severity: "error",
          });
        },
      }
    );
  };

  // Confirm subtask status update
  const handleConfirmSubtaskStatus = (subtaskId: number) => {
    // Get the selected values
    const status = selectedSubtaskStatusMap.get(subtaskId);
    const assignedAgent = selectedSubtaskAgentMap.get(subtaskId);

    // Prepare the update payload
    const updateData = {
      status,
      assigned_agent_id: assignedAgent ? assignedAgent.id : null,
    };

    // Call the API
    updateSubtask.mutate(
      { id: subtaskId, data: updateData },
      {
        onSuccess: () => {
          setNotification({
            open: true,
            message: "Subtask updated successfully",
            severity: "success",
          });

          // Clear status editing
          const newEditingSubtaskStatusMap = new Map(editingSubtaskStatusMap);
          newEditingSubtaskStatusMap.delete(subtaskId);
          setEditingSubtaskStatusMap(newEditingSubtaskStatusMap);

          // Clear agent editing
          const newEditingSubtaskAgentMap = new Map(editingSubtaskAgentMap);
          newEditingSubtaskAgentMap.delete(subtaskId);
          setEditingSubtaskAgentMap(newEditingSubtaskAgentMap);
        },
        onError: (error) => {
          console.error("Error updating subtask:", error);
          setNotification({
            open: true,
            message: "Failed to update subtask",
            severity: "error",
          });
        },
      }
    );
  };

  return (
    <Box>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        {t("opportunity.serviceTicketDetails", "Details")}
      </Typography>

      <Grid container spacing={3}>
        {serviceTicket.tasks.map((task) => (
          <Grid key={task.id} size={{ xs: 12 }}>
            <Card
              variant="outlined"
              sx={{
                mb: 2,
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              }}
            >
              {/* Task Card Header */}
              <Box
                sx={{
                  display: "flex",
                  p: 2,
                  backgroundColor: "#f5f5f5",
                  borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{ mr: 1, color: "text.secondary" }}
                  >
                    {t("opportunity.taskName", "Task Name")}:
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {task.task_name}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mr: 2,
                    ml: "auto",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ mr: 1, color: "text.secondary" }}
                  >
                    {t("opportunity.assignedAgent", "Assigned To")}:
                  </Typography>
                  {editingTaskAgentMap.get(task.id) ? (
                    <Autocomplete
                      size="small"
                      options={staffUsersList}
                      value={selectedTaskAgentMap.get(task.id) || null}
                      onChange={(_, newValue) => {
                        const newSelectedTaskAgentMap = new Map(
                          selectedTaskAgentMap
                        );
                        newSelectedTaskAgentMap.set(task.id, newValue);
                        setSelectedTaskAgentMap(newSelectedTaskAgentMap);
                      }}
                      getOptionLabel={(option) =>
                        option ? `${option.first_name} ${option.last_name}` : ""
                      }
                      isOptionEqualToValue={(option, value) => {
                        if (!option || !value) return option === value;
                        return (
                          option.id === value.id || option.email === value.email
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder={t(
                            "common.selectAgent",
                            "Select Assignee"
                          )}
                          sx={{ width: 200, mb: "0px" }}
                          InputProps={{
                            ...params.InputProps,
                            sx: { height: 30 },
                          }}
                        />
                      )}
                      loading={isLoadingStaffUsers}
                      sx={{ minWidth: 200 }}
                    />
                  ) : (
                    <Typography variant="body2">
                      {task.assigned_agent
                        ? `${task.assigned_agent.first_name} ${task.assigned_agent.last_name}`
                        : t("common.unassigned", "Unassigned")}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{ mr: 1, color: "text.secondary" }}
                  >
                    {t("opportunity.status", "Status")}:
                  </Typography>

                  {editingTaskStatusMap.get(task.id) ? (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Select
                        size="small"
                        value={selectedTaskStatusMap.get(task.id) || ""}
                        onChange={(e) => {
                          const newSelectedTaskStatusMap = new Map(
                            selectedTaskStatusMap
                          );
                          newSelectedTaskStatusMap.set(task.id, e.target.value);
                          setSelectedTaskStatusMap(newSelectedTaskStatusMap);
                        }}
                        sx={{ minWidth: 120, height: 30 }}
                      >
                        <MenuItem value="New">
                          {t("status.new", "New")}
                        </MenuItem>
                        <MenuItem value="In Progress">
                          {t("status.inProgress", "In Progress")}
                        </MenuItem>
                        <MenuItem value="Completed">
                          {t("status.completed", "Completed")}
                        </MenuItem>
                        <MenuItem value="Deferred">
                          {t("status.deferred", "Deferred")}
                        </MenuItem>
                      </Select>
                      <IconButton
                        size="small"
                        onClick={() => handleCancelEditTaskStatus(task.id)}
                        color="error"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleConfirmTaskStatus(task.id)}
                        color="success"
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{ mr: 1 }}
                      >
                        {task.status}
                      </Typography>
                      {!isViewMode && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditTaskStatus(task)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              {task.subtasks &&
                task.subtasks.length > 0 &&
                task.subtasks.map((subtask) => (
                  <>
                    <Grid container spacing={2} sx={{ m: 2 }}>
                      <Grid size={!isViewMode ? 4 : 3} display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {subtask.subtask_name}
                        </Typography>
                      </Grid>
                      <Grid size={3} display="flex" alignItems="center">
                        {subtask.subtask_start_date ? (
                          <Box>
                            <Typography variant="body2">
                              {t("opportunity.startedOn", "Started on")}:{" "}
                              {formatDate(subtask.subtask_start_date)}
                            </Typography>
                            {subtask.subtask_end_date && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("opportunity.endedOn", "Ended on")}:{" "}
                                {formatDate(subtask.subtask_end_date)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t("opportunity.notStarted", "Not Started")}
                          </Typography>
                        )}
                      </Grid>
                      <Grid size={!isViewMode ? 2.5 : 3} display="flex" alignItems="center">
                        {editingSubtaskAgentMap.get(subtask.id) ? (
                          <Autocomplete
                            size="small"
                            options={staffUsersList}
                            value={
                              selectedSubtaskAgentMap.get(subtask.id) || null
                            }
                            onChange={(_, newValue) => {
                              const newSelectedSubtaskAgentMap = new Map(
                                selectedSubtaskAgentMap
                              );
                              newSelectedSubtaskAgentMap.set(
                                subtask.id,
                                newValue
                              );
                              setSelectedSubtaskAgentMap(
                                newSelectedSubtaskAgentMap
                              );
                            }}
                            getOptionLabel={(option) =>
                              option
                                ? `${option.first_name} ${option.last_name}`
                                : ""
                            }
                            isOptionEqualToValue={(option, value) => {
                              if (!option || !value) return option === value;
                              return (
                                option.id === value.id ||
                                option.email === value.email
                              );
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="outlined"
                                placeholder={t(
                                  "common.selectAgent",
                                  "Select Assignee"
                                )}
                                sx={{ width: 200, mb: "0px" }}
                                InputProps={{
                                  ...params.InputProps,
                                  sx: { height: 30 },
                                }}
                              />
                            )}
                            loading={isLoadingStaffUsers}
                            sx={{ minWidth: 200 }}
                          />
                        ) : (
                          <Typography variant="body2">
                            {subtask.assigned_agent
                              ? `${subtask.assigned_agent.first_name} ${subtask.assigned_agent.last_name}`
                              : t("common.unassigned", "Unassigned")}
                          </Typography>
                        )}
                      </Grid>
                      <Grid size={!isViewMode ? 1.5 : 3} display="flex" alignItems="center">
                        {editingSubtaskStatusMap.get(subtask.id) ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Select
                              size="small"
                              value={
                                selectedSubtaskStatusMap.get(subtask.id) || ""
                              }
                              onChange={(e) => {
                                const newSelectedSubtaskStatusMap = new Map(
                                  selectedSubtaskStatusMap
                                );
                                newSelectedSubtaskStatusMap.set(
                                  subtask.id,
                                  e.target.value
                                );
                                setSelectedSubtaskStatusMap(
                                  newSelectedSubtaskStatusMap
                                );
                              }}
                              sx={{ minWidth: 120, height: 30 }}
                            >
                              <MenuItem value="New">
                                {t("status.new", "New")}
                              </MenuItem>
                              <MenuItem value="In Progress">
                                {t("status.inProgress", "In Progress")}
                              </MenuItem>
                              <MenuItem value="Completed">
                                {t("status.completed", "Completed")}
                              </MenuItem>
                              <MenuItem value="Deferred">
                                {t("status.deferred", "Deferred")}
                              </MenuItem>
                            </Select>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {subtask.status}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                      {!isViewMode && (
                        <Grid size={1}>
                          {editingSubtaskStatusMap.get(subtask.id) ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleCancelEditSubtaskStatus(subtask.id)
                                }
                                color="error"
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleConfirmSubtaskStatus(subtask.id)
                                }
                                color="success"
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 0.5,
                              }}
                            >
                              {/* Edit button */}
                              <IconButton
                                size="small"
                                onClick={() => handleEditSubtaskStatus(subtask)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>

                              {/* Start button - show only when both dates are null */}
                              {!subtask.subtask_start_date &&
                                !subtask.subtask_end_date && (
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleStartSubtask(subtask.id)
                                    }
                                    color="success"
                                  >
                                    <PlayArrowIcon fontSize="small" />
                                  </IconButton>
                                )}

                              {/* Stop button - show when started but not ended */}
                              {subtask.subtask_start_date &&
                                !subtask.subtask_end_date && (
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleCompleteSubtask(subtask.id)
                                    }
                                    color="error"
                                  >
                                    <StopIcon fontSize="small" />
                                  </IconButton>
                                )}
                            </Box>
                          )}
                        </Grid>
                      )}
                    </Grid>
                    <Divider />
                  </>
                ))}
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ServiceTicketDetails;
