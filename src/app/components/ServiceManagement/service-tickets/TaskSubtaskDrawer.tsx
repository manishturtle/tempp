import React, { useState, useEffect } from "react";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Switch,
  TextField,
  Autocomplete,
} from "@mui/material";
import AnimatedDrawer from "../../common/AnimatedDrawer";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  ServiceTicket,
  ServiceTicketTask,
  ServiceTicketSubtask,
  serviceTicketsApi,
} from "../../../services_service_management/serviceTickets";

interface TaskSubtaskDrawerProps {
  open: boolean;
  onClose: () => void;
  ticket: ServiceTicket;
  ticketId: number;
  taskId?: number;
  taskToEdit?: ServiceTicketTask | null;
  subtaskToEdit?: ServiceTicketSubtask | null;
  onSuccess?: () => void;
  serviceAgents: any[];
}

const TaskSubtaskDrawer: React.FC<TaskSubtaskDrawerProps> = ({
  open,
  onClose,
  ticket,
  ticketId,
  taskId,
  taskToEdit,
  subtaskToEdit,
  onSuccess,
  serviceAgents,
}) => {
  // Determine initial form type based on props
  const initialType = taskToEdit
    ? "task"
    : subtaskToEdit
    ? "subtask"
    : taskId
    ? "subtask"
    : "task";

  const [formType, setFormType] = useState<"task" | "subtask">(initialType);
  const [loading, setLoading] = useState<boolean>(false);

  // Task form state
  const [taskForm, setTaskForm] = useState({
    task_name: "",
    status: "New",
    assigned_agent_id: "",
    allow_subtask_reordering: true,
    visible: true,
  });

  // Subtask form state
  const [subtaskForm, setSubtaskForm] = useState({
    subtask_name: "",
    status: "New",
    parent_task_id: taskId?.toString() || "",
    subtask_start_date: null as Date | null,
    subtask_end_date: null as Date | null,
    assigned_agent_id: "",
    visible: true,
  });

  // Initialize form when editing
  useEffect(() => {
    if (taskToEdit) {
      setFormType("task");
      setTaskForm({
        task_name: taskToEdit.task_name || "",
        status: taskToEdit.status || "New",
        assigned_agent_id: taskToEdit.assigned_agent?.id?.toString() || "",
        allow_subtask_reordering: taskToEdit.allow_subtask_reordering || true,
        visible: taskToEdit.visible !== undefined ? taskToEdit.visible : true,
      });
    } else if (subtaskToEdit) {
      setFormType("subtask");
      setSubtaskForm({
        subtask_name: subtaskToEdit.subtask_name || "",
        status: subtaskToEdit.status || "New",
        parent_task_id: subtaskToEdit.task.toString(),
        subtask_start_date: subtaskToEdit.subtask_start_date
          ? new Date(subtaskToEdit.subtask_start_date)
          : null,
        subtask_end_date: subtaskToEdit.subtask_end_date
          ? new Date(subtaskToEdit.subtask_end_date)
          : null,
        assigned_agent_id: subtaskToEdit.assigned_agent?.id?.toString() || "",
        visible: subtaskToEdit.subtask_configuration?.visible !== false,
      });
    } else {
      // Reset forms for new creation
      if (taskId) {
        // If taskId is provided, start with subtask form
        setFormType("subtask");
        setSubtaskForm((prev) => ({
          ...prev,
          parent_task_id: taskId.toString(),
        }));
      } else {
        // Otherwise start with task form
        setFormType("task");
      }
      resetForms();
    }
  }, [taskToEdit, subtaskToEdit, open, taskId]);

  const resetForms = () => {
    setTaskForm({
      task_name: "",
      status: "New",
      assigned_agent_id: "",
      allow_subtask_reordering: true,
      visible: true,
    });
    setSubtaskForm({
      subtask_name: "",
      status: "New",
      parent_task_id: taskId?.toString() || "",
      subtask_start_date: null,
      subtask_end_date: null,
      assigned_agent_id: "",
      visible: true,
    });
  };

  const handleTaskFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTaskForm({ ...taskForm, [name]: value });
  };

  const handleTaskCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setTaskForm({ ...taskForm, [name]: checked });
  };

  const handleTaskSelectChange = (e: any) => {
    const name = e.target.name;
    const value = e.target.value;
    setTaskForm({ ...taskForm, [name]: value });
  };

  const handleSubtaskFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSubtaskForm({ ...subtaskForm, [name]: value });
  };

  const handleSubtaskSwitchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = e.target;
    setSubtaskForm({ ...subtaskForm, [name]: checked });
  };

  const handleSubtaskSelectChange = (e: SelectChangeEvent<string>) => {
    setSubtaskForm({
      ...subtaskForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubtaskDateChange = (name: string, date: Date | null) => {
    setSubtaskForm({
      ...subtaskForm,
      [name]: date,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (formType === "task") {
        // Handle task creation/update
        const taskData: Partial<ServiceTicketTask> = {
          task_name: taskForm.task_name,
          status: taskForm.status,
          allow_subtask_reordering: taskForm.allow_subtask_reordering,
          visible: taskForm.visible,
          service_ticket: ticketId,
        };

        if (taskForm.assigned_agent_id) {
          taskData.assigned_agent_id = parseInt(taskForm.assigned_agent_id, 10);
        }

        // If not editing, determine next sequence using tasks length
        if (!taskToEdit) {
          const nextSequence = ticket.tasks ? ticket.tasks.length + 1 : 1;
          taskData.sequence = nextSequence;
        }

        if (taskToEdit) {
          await serviceTicketsApi.updateTask(taskToEdit.id, taskData);
        } else {
          await serviceTicketsApi.createTask(taskData);
        }
      } else {
        // Handle subtask creation/update
        const subtaskData: Partial<ServiceTicketSubtask> = {
          subtask_name: subtaskForm.subtask_name,
          status: subtaskForm.status,
          task: parseInt(subtaskForm.parent_task_id, 10),
          subtask_type: "SIMPLE_TASK",
          subtask_configuration: {
            visible: subtaskForm.visible,
          },
        };

        if (subtaskForm.subtask_start_date) {
          subtaskData.subtask_start_date =
            subtaskForm.subtask_start_date.toISOString();
        }

        if (subtaskForm.subtask_end_date) {
          subtaskData.subtask_end_date =
            subtaskForm.subtask_end_date.toISOString();
        }

        if (subtaskForm.assigned_agent_id) {
          subtaskData.assigned_agent_id = parseInt(
            subtaskForm.assigned_agent_id,
            10
          );
        }

        // If not editing, determine next sequence
        if (!subtaskToEdit) {
          // Find the task in the ticket to get subtasks length
          const parentTask = ticket.tasks?.find(
            (t) => t.id === parseInt(subtaskForm.parent_task_id, 10)
          );
          const subtaskCount = parentTask?.subtasks?.length || 0;
          const nextSequence = subtaskCount + 1;

          subtaskData.sequence = nextSequence;
        }

        if (subtaskToEdit) {
          await serviceTicketsApi.updateSubtask(subtaskToEdit.id, subtaskData);
        } else {
          await serviceTicketsApi.createSubtask(subtaskData);
        }
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error saving task/subtask:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (formType === "task") {
      return taskToEdit ? "Edit Task" : "Add Task";
    } else {
      return subtaskToEdit ? "Edit Subtask" : "Add Subtask";
    }
  };

  const isFormValid = () => {
    if (formType === "task") {
      return taskForm.task_name.trim() !== "";
    } else {
      return (
        subtaskForm.subtask_name.trim() !== "" &&
        subtaskForm.parent_task_id !== ""
      );
    }
  };

  return (
    <AnimatedDrawer
      open={open}
      onClose={onClose}
      title={getTitle()}
      expandedWidth={550}
      onSave={handleSubmit}
      saveDisabled={!isFormValid() || loading}
      disableBackdropClick={false}
    >
      <Box sx={{ p: 1 }}>
        {/* Only show type selection when creating new item */}
        {!taskToEdit && !subtaskToEdit && !taskId && (
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">What do you want to add?</FormLabel>
            <RadioGroup
              row
              aria-label="form-type"
              name="form-type"
              value={formType}
              onChange={(e) =>
                setFormType(e.target.value as "task" | "subtask")
              }
            >
              <FormControlLabel value="task" control={<Radio />} label="Task" />
              <FormControlLabel
                value="subtask"
                control={<Radio />}
                label="Subtask"
              />
            </RadioGroup>
          </FormControl>
        )}

        {/* Task Form */}
        {formType === "task" && (
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Task Name"
                name="task_name"
                value={taskForm.task_name}
                onChange={handleTaskFormChange}
                required
                error={!taskForm.task_name}
                helperText={!taskForm.task_name ? "Task name is required" : ""}
                inputProps={{ maxLength: 255 }}
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="task-status-label">Status</InputLabel>
                <Select
                  labelId="task-status-label"
                  id="status"
                  name="status"
                  value={taskForm.status}
                  onChange={handleTaskSelectChange}
                  label="Status"
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Deferred">Deferred</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <Autocomplete
                  id="assigned_agent_id"
                  options={serviceAgents}
                  getOptionKey={(option) => option.id.toString()}
                  getOptionLabel={(option) =>
                    `${option.first_name || ""} ${
                      option.last_name || ""
                    }`.trim() || "Unnamed"
                  }
                  value={
                    serviceAgents.find(
                      (agent) =>
                        agent.id.toString() === taskForm.assigned_agent_id
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    // Update the subtaskForm state with the new agent ID or null
                    const newTaskForm = {
                      ...taskForm,
                      assigned_agent_id: newValue?.id.toString() || "",
                    };
                    setTaskForm(newTaskForm);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned To"
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                />
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={taskForm.allow_subtask_reordering}
                    onChange={handleTaskCheckboxChange}
                    name="allow_subtask_reordering"
                  />
                }
                label="Allow Subtask Reordering"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={taskForm.visible}
                    onChange={handleTaskCheckboxChange}
                    name="visible"
                  />
                }
                label="Visible to Customer"
              />
            </Grid>
          </Grid>
        )}

        {/* Subtask Form */}
        {formType === "subtask" && (
          <Grid container spacing={2}>
            {/* Parent Task Dropdown */}
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel id="parent-task-label">Task</InputLabel>
                <Select
                  labelId="parent-task-label"
                  id="parent_task_id"
                  name="parent_task_id"
                  value={subtaskForm.parent_task_id}
                  onChange={handleSubtaskSelectChange}
                  label="Task"
                  disabled={!!subtaskToEdit}
                  error={!subtaskForm.parent_task_id}
                >
                  <MenuItem value="">
                    <em>Select a task</em>
                  </MenuItem>
                  {ticket.tasks?.map((task) => (
                    <MenuItem key={task.id} value={task.id.toString()}>
                      {task.task_name}
                    </MenuItem>
                  ))}
                </Select>
                {!subtaskForm.parent_task_id && (
                  <FormHelperText error>Parent task is required</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Subtask Name"
                name="subtask_name"
                value={subtaskForm.subtask_name}
                onChange={handleSubtaskFormChange}
                required
                error={!subtaskForm.subtask_name}
                helperText={
                  !subtaskForm.subtask_name ? "Subtask name is required" : ""
                }
                inputProps={{ maxLength: 255 }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="subtask-status-label">Status</InputLabel>
                <Select
                  labelId="subtask-status-label"
                  id="status"
                  name="status"
                  value={subtaskForm.status}
                  onChange={handleSubtaskSelectChange}
                  label="Status"
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Deferred">Deferred</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={subtaskForm.subtask_start_date}
                  onChange={(date) =>
                    handleSubtaskDateChange("subtask_start_date", date)
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={subtaskForm.subtask_end_date}
                  onChange={(date) =>
                    handleSubtaskDateChange("subtask_end_date", date)
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <Autocomplete
                  id="assigned_agent_id"
                  options={serviceAgents}
                  getOptionKey={(option) => option.id.toString()}
                  getOptionLabel={(option) =>
                    `${option.first_name || ""} ${
                      option.last_name || ""
                    }`.trim() || "Unnamed"
                  }
                  value={
                    serviceAgents.find(
                      (agent) =>
                        agent.id.toString() === subtaskForm.assigned_agent_id
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    // Update the subtaskForm state with the new agent ID or null
                    const newSubtaskForm = {
                      ...subtaskForm,
                      assigned_agent_id: newValue?.id.toString() || "",
                    };
                    setSubtaskForm(newSubtaskForm);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned To"
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                />
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={subtaskForm.visible}
                    onChange={handleSubtaskSwitchChange}
                    name="visible"
                  />
                }
                label="Visible to User?"
              />
            </Grid>
          </Grid>
        )}

        {/* AnimatedDrawer provides save functionality */}
      </Box>
    </AnimatedDrawer>
  );
};

export default TaskSubtaskDrawer;
