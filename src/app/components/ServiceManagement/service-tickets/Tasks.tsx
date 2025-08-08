import React, { useState, useEffect } from "react";
import { Box, Typography, Tabs, Tab, Button } from "@mui/material";
import TaskSubtaskDrawer from "./TaskSubtaskDrawer";
import TaskForm from "../../../components/ServiceManagement/service-tickets/TaskForm";
import {
  ServiceTicket,
  ServiceTicketTask,
  ServiceTicketSubtask,
  serviceTicketsApi,
} from "../../../services_service_management/serviceTickets";
import { useConfirm } from "../../common/useConfirm";
import DraggableTaskGroupList from "./DraggableTaskGroupList";
// import { tenantApi, TenantUser } from "@/services/api/tenant";
import { tenantApi, TenantUser } from "../../../services_service_management/tenant";

interface TasksProps {
  ticket: ServiceTicket;
  onRefresh?: () => void;
}

const Tasks: React.FC<TasksProps> = ({ ticket, onRefresh }) => {
  const [ticketActiveTab, setTicketActiveTab] = useState<string>("all");
  const [filteredTasks, setFilteredTasks] = useState<ServiceTicketTask[]>([]);

  // State for drawer and editing
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<ServiceTicketTask | null>(null);
  const [subtaskToEdit, setSubtaskToEdit] =
    useState<ServiceTicketSubtask | null>(null);
  const [serviceAgents, setServiceAgents] = useState<TenantUser[]>([]);
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false);
  const [selectedFormTask, setSelectedFormTask] =
    useState<ServiceTicketSubtask | null>(null);
  const [updateStatus, setUpdateStatus] = useState<boolean>(false);

  // Use confirm hook for delete confirmations
  const { confirm, ConfirmDialog } = useConfirm();

  // Load service agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const agents = await tenantApi.getTenantUsers();
        setServiceAgents(agents);
      } catch (error) {
        console.error("Error fetching service agents:", error);
      }
    };
    fetchAgents();
  }, []);

  // Count tasks by status
  const groupCounts = {
    all: ticket.tasks?.length || 0,
    new:
      ticket.tasks?.filter((task) => task.status.toLowerCase() === "new")
        .length || 0,
    inProgress:
      ticket.tasks?.filter(
        (task) => task.status.toLowerCase() === "in progress"
      ).length || 0,
    completed:
      ticket.tasks?.filter((task) => task.status.toLowerCase() === "completed")
        .length || 0,
    deferred:
      ticket.tasks?.filter((task) => task.status.toLowerCase() === "deferred")
        .length || 0,
  };

  // Calculate counts and filter tasks based on active tab
  useEffect(() => {
    // Reset counts
    groupCounts.new = 0;
    groupCounts.inProgress = 0;
    groupCounts.completed = 0;
    groupCounts.deferred = 0;

    if (ticket.tasks && ticket.tasks.length > 0) {
      // Count tasks by status
      ticket.tasks.forEach((task) => {
        const status = task.status.toLowerCase();
        if (status === "new") {
          groupCounts.new++;
        } else if (status === "in progress") {
          groupCounts.inProgress++;
        } else if (status === "completed") {
          groupCounts.completed++;
        } else if (status === "deferred") {
          groupCounts.deferred++;
        }
      });

      // Filter tasks based on active tab
      if (ticketActiveTab === "all") {
        setFilteredTasks(ticket.tasks);
      } else {
        const statusMap: Record<string, string> = {
          new: "new",
          inProgress: "in progress",
          completed: "completed",
          deferred: "deferred",
        };

        setFilteredTasks(
          ticket.tasks.filter(
            (task) => task.status.toLowerCase() === statusMap[ticketActiveTab]
          )
        );
      }
    } else {
      setFilteredTasks([]);
    }
  }, [ticketActiveTab, ticket.tasks]);

  const handleAddButtonClick = () => {
    setTaskToEdit(null);
    setSubtaskToEdit(null);
    setDrawerOpen(true);
  };

  const handleEditTask = (task: ServiceTicketTask) => {
    setTaskToEdit(task);
    setSubtaskToEdit(null);
    setDrawerOpen(true);
  };

  const handleEditSubtask = (subtask: ServiceTicketSubtask) => {
    setSubtaskToEdit(subtask);
    setTaskToEdit(null);
    setDrawerOpen(true);
  };

  const handleDeleteTask = (task: ServiceTicketTask, e: React.MouseEvent) => {
    e.stopPropagation();
    confirm({
      title: "Delete Task",
      message:
        "This will delete the task and all its subtasks. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmColor: "error",
    })
      .then(() => {
        handleDeleteConfirm(task.id, "task");
      })
      .catch(() => {
        // User cancelled, do nothing
      });
  };

  const handleDeleteSubtask = async (
    subtask: ServiceTicketSubtask,
    e: React.MouseEvent
  ) => {
    const subtaskId = subtask.id;
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Delete Subtask",
      message: `Are you sure you want to delete subtask "${subtask.subtask_name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmColor: "error",
    });
    if (confirmed) {
      handleDeleteConfirm(subtaskId, "subtask");
    }
  };

  const handleDeleteConfirm = async (id: number, type: "task" | "subtask") => {
    try {
      if (id) {
        if (type === "task") {
          await serviceTicketsApi.deleteTask(id);
        } else {
          await serviceTicketsApi.deleteSubtask(id);
        }

        // Refresh data after delete
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    }
  };

  // Handle task reordering
  const handleTaskOrderChange = async (newOrder: ServiceTicketTask[]) => {
    try {
      if (!ticket?.id) {
        console.error("No service ticket ID found");
        return;
      }

      // Extract task IDs in their new order
      const taskOrder = newOrder.map((task) => task.id);

      // Call backend API to reorder tasks
      await serviceTicketsApi.reorderTasks({
        service_ticket_id: ticket.id,
        task_order: taskOrder,
      });

      // Refresh data after update
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating task order:", error);
    }
  };

  // Handle subtask reordering within a task
  const handleSubtaskOrderChange = async (
    taskId: number,
    newOrder: ServiceTicketSubtask[]
  ) => {
    try {
      // Extract subtask IDs in their new order
      const subtaskOrder = newOrder.map((subtask) => subtask.id);

      // Call backend API to reorder subtasks
      await serviceTicketsApi.reorderSubtasks({
        task_id: taskId,
        subtask_order: subtaskOrder,
      });

      // Refresh data after update
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating subtask order:", error);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setTaskToEdit(null);
    setSubtaskToEdit(null);
  };

  const handleDrawerSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
    setDrawerOpen(false);
  };

  // Handle starting a task - set subtask_start_date to today and status to In Progress
  const handleStartTask = async (subtask: ServiceTicketSubtask) => {
    try {
      const today = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD

      await serviceTicketsApi.updateSubtask(subtask.id, {
        subtask_start_date: today,
        status: "In Progress",
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error starting subtask:", error);
    }
  };

  // Handle completing a task - set subtask_end_date to today and status to Completed
  const handleCompleteTask = async (subtask: ServiceTicketSubtask) => {
    try {
      // Check if this subtask has form fields
      if (subtask.form_fields && subtask.form_fields.length > 0) {
        // Check if any required fields are empty
        const hasEmptyRequiredFields = subtask.form_fields.some(
          (field) =>
            field.field_attributes?.is_required &&
            (field.field_value === "" ||
              field.field_value === null ||
              field.field_value === undefined ||
              (typeof field.field_value === "string" &&
                field.field_value.trim() === ""))
        );

        // If there are empty required fields, open the form instead of completing
        if (hasEmptyRequiredFields) {
          setUpdateStatus(true);
          setSelectedFormTask(subtask);
          setFormDialogOpen(true);
          // The TaskForm will call handleCompleteTask after saving
          return;
        }
      }

      // If no form issues, proceed with completion
      const today = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD

      await serviceTicketsApi.updateSubtask(subtask.id, {
        subtask_end_date: today,
        status: "Completed",
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error completing subtask:", error);
    }
  };

  // Handle viewing form for a subtask
  const handleViewFormClick = (subtask: ServiceTicketSubtask) => {
    // Only open the form if the subtask has form_fields
    if (subtask && subtask.form_fields && subtask.form_fields.length > 0) {
      setSelectedFormTask(subtask);
      setFormDialogOpen(true);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Tabs
          value={ticketActiveTab}
          onChange={(e, newValue) => setTicketActiveTab(newValue)}
        >
          <Tab value="all" label={`All (${groupCounts.all})`} />
          <Tab value="new" label={`New (${groupCounts.new})`} />
          <Tab
            value="inProgress"
            label={`In Progress (${groupCounts.inProgress})`}
          />
          <Tab
            value="completed"
            label={`Completed (${groupCounts.completed})`}
          />
          <Tab value="deferred" label={`Deferred (${groupCounts.deferred})`} />
        </Tabs>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddButtonClick}
        >
          Add
        </Button>
      </Box>

      {filteredTasks.length === 0 ? (
        <Typography variant="body1" sx={{ my: 4, textAlign: "center" }}>
          No tasks found.
        </Typography>
      ) : (
        <DraggableTaskGroupList
          ticket={ticket}
          tasks={filteredTasks}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onTaskOrderChange={handleTaskOrderChange}
          onSubtaskOrderChange={handleSubtaskOrderChange}
          onEditSubtask={handleEditSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onStartTask={handleStartTask}
          onCompleteTask={handleCompleteTask}
          onViewFormClick={handleViewFormClick}
        />
      )}

      {/* Task/subtask drawer */}
      <TaskSubtaskDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSuccess={handleDrawerSuccess}
        ticket={ticket}
        ticketId={ticket ? ticket.id : 0}
        taskId={taskToEdit ? taskToEdit.id : 0}
        taskToEdit={taskToEdit}
        subtaskToEdit={subtaskToEdit}
        serviceAgents={serviceAgents}
      />

      {/* TaskForm for subtask forms */}
      {selectedFormTask && (
        <TaskForm
          open={formDialogOpen}
          task={selectedFormTask}
          onClose={() => setFormDialogOpen(false)}
          onSaved={() => {
            setFormDialogOpen(false);
            if (onRefresh) onRefresh();
          }}
          handleCompleteTask={handleCompleteTask}
          updateStatus={updateStatus}
        />
      )}

      {/* Confirmation dialog */}
      <ConfirmDialog />
    </Box>
  );
};

export default Tasks;
