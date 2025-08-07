import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { DraggableTaskGroup } from "./DraggableTaskGroup";
import { DraggableTask } from "./DraggableTask";
import { Box, Paper } from "@mui/material";
import {
  ServiceTicket,
  ServiceTicketTask,
  ServiceTicketSubtask,
} from "../../../services_service_management/serviceTickets";

interface TaskGroupListProps {
  ticket: ServiceTicket;
  tasks: ServiceTicketTask[];
  onEditTask: (task: ServiceTicketTask) => void;
  onDeleteTask: (task: ServiceTicketTask, e: React.MouseEvent) => void;
  onTaskOrderChange: (newOrder: ServiceTicketTask[]) => void;
  onSubtaskOrderChange: (
    taskId: number,
    newOrder: ServiceTicketSubtask[]
  ) => void;
  onEditSubtask: (subtask: ServiceTicketSubtask) => void;
  onDeleteSubtask: (subtask: ServiceTicketSubtask, e: React.MouseEvent) => void;
  onStartTask?: (subtask: ServiceTicketSubtask) => void;
  onCompleteTask?: (subtask: ServiceTicketSubtask) => void;
  onViewFormClick?: (subtask: ServiceTicketSubtask) => void;
}

// Flag to control whether subtasks can be moved between tasks
const isDraggableAcrossGroups = false;

export function DraggableTaskGroupList(props: TaskGroupListProps) {
  const {
    tasks,
    onEditTask,
    onDeleteTask,
    onTaskOrderChange,
    onSubtaskOrderChange,
    onEditSubtask,
    onDeleteSubtask,
    onStartTask,
    onCompleteTask,
    onViewFormClick,
  } = props;

  // State to track active dragging item and container relationships
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [activeType, setActiveType] = useState<"task" | "subtask" | null>(null);
  const [activeData, setActiveData] = useState<any | null>(null);
  const [activeParent, setActiveParent] = useState<string | number | null>(
    null
  );
  const [taskGroups, setTaskGroups] = useState<ServiceTicketTask[]>(tasks);

  // Build a map of all subtasks by their task ID for easier access
  const subtasksByTask = React.useMemo(() => {
    const subtaskMap: Record<string | number, ServiceTicketSubtask[]> = {};

    taskGroups.forEach((task) => {
      // Get all subtasks that belong to this task
      const subtasks = Array.isArray(task.subtasks)
        ? [...task.subtasks].sort((a, b) => a.sequence - b.sequence)
        : [];

      subtaskMap[task.id] = subtasks;
    });

    return subtaskMap;
  }, [taskGroups]);

  // Helper to find the active item regardless of type
  const findActiveItem = () => {
    if (!activeId) return null;

    if (activeType === "task") {
      return taskGroups.find((task) => task.id === activeId);
    } else if (activeType === "subtask" && activeParent) {
      const parentSubtasks = subtasksByTask[activeParent] || [];
      return parentSubtasks.find((subtask) => subtask.id === activeId);
    }

    return null;
  };

  // Configure sensors for mouse/touch  // Set up sensors for dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Configuration for better handling of nested draggable elements
      activationConstraint: {
        // Add both distance and delay constraints
        distance: 5,
        delay: 100, // Small delay to determine intent
        tolerance: 5, // Allow a small tolerance for movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start event
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const { id } = active;
    const { type, task, groupId } = active.data.current || {};
    console.log(type)

    // Check if dragging is allowed based on the type
    if (type === "task") {
      // Find the task
      const taskItem = taskGroups.find((t) => t.id === id);
      // Prevent dragging tasks if no such task exists
      if (!taskItem) {
        return;
      }
    } else if (type === "subtask") {
      // Find the task this subtask belongs to
      const parentTask = taskGroups.find((t) => t.id === groupId);
      // Prevent dragging subtasks if allow_subtask_reordering is false
      if (parentTask && parentTask.allow_subtask_reordering === false) {
        return;
      }
    }

    setActiveId(id);
    setActiveType(type);

    if (type === "task") {
      setActiveData(task);
      setActiveParent(null);
    } else if (type === "subtask") {
      setActiveData(task);
      setActiveParent(groupId);
    }
  }

  // Handle drag over event
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    // Restrict subtasks from being dragged to other tasks
    if (activeType === "subtask") {
      const { groupId: activeTaskId } = active.data.current || {};
      const { type: overType, groupId: overTaskId } = over.data.current || {};

      // If trying to drag to a different task, don't allow it
      if (overType === "task" || (overType === "subtask" && activeTaskId !== overTaskId)) {
        // Don't update state or allow any cross-task dragging
        return;
      }
    }

    // Any other drag over handling for tasks can go here if needed
  }

  // Handle drag end event
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      // Reset the active states
      setActiveId(null);
      setActiveType(null);
      setActiveData(null);
      setActiveParent(null);
      return;
    }

    const { id: activeId } = active;
    const { id: overId } = over;

    // Skip if same item
    if (activeId === overId) {
      setActiveId(null);
      setActiveType(null);
      setActiveData(null);
      setActiveParent(null);
      return;
    }

    if (activeType === "task") {
      // Reordering tasks
      setTaskGroups((prevTasks) => {
        const oldIndex = prevTasks.findIndex((item) => item.id === activeId);
        const newIndex = prevTasks.findIndex((item) => item.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Reorder the tasks
          const newTasks = arrayMove(prevTasks, oldIndex, newIndex);

          // Update the sequence numbers
          const reorderedTasks = newTasks.map((item, index) => ({
            ...item,
            sequence: index + 1, // 1-indexed sequence, matching backend
          }));

          // Notify parent component about the order change
          onTaskOrderChange(reorderedTasks);

          return reorderedTasks;
        }

        return prevTasks;
      });
    } else if (activeType === "subtask") {
      const { type: overType, groupId: overTaskId } = over.data.current || {};
      const { groupId: activeTaskId } = active.data.current || {};

      // Only allow reordering within the same task
      if (activeTaskId === overTaskId) {
        setTaskGroups((prevTasks) => {
          const newTasks = prevTasks.map((task) => {
            // Only update the relevant task
            if (task.id !== activeTaskId) return task;

            const subtasks = [...(task.subtasks || [])];
            const oldIndex = subtasks.findIndex((s) => s.id === activeId);
            const newIndex = subtasks.findIndex((s) => s.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
              // Reorder the subtasks
              const newSubtasks = arrayMove(subtasks, oldIndex, newIndex);

              // Update sequences
              const reorderedSubtasks = newSubtasks.map((s, idx) => ({
                ...s,
                sequence: idx + 1, // 1-indexed
              }));

              // Notify parent about subtask reorder
              onSubtaskOrderChange(task.id, reorderedSubtasks);

              return { ...task, subtasks: reorderedSubtasks };
            }

            return task;
          });

          return newTasks;
        });
      }
    }

    // Reset the active states
    setActiveId(null);
    setActiveType(null);
    setActiveData(null);
    setActiveParent(null);
  }

  // Update internal state when tasks change from parent
  React.useEffect(() => {
    setTaskGroups(tasks);
  }, [tasks]);

  // For each task, get the IDs of its subtasks
  const getSubtaskIds = (taskId: string | number) => {
    const subtasks = subtasksByTask[taskId] || [];
    return subtasks.map((subtask) => subtask.id);
  };

  // Get the active item to show in the overlay
  const activeItem = findActiveItem();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ width: "100%" }}>
        <SortableContext
          items={taskGroups.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {taskGroups.map((task) => {
            // Get subtasks for this task
            const subtasks = subtasksByTask[task.id] || [];
            const subtaskIds = getSubtaskIds(task.id);

            return (
              <DraggableTaskGroup
                key={task.id}
                group={task}
                tasks={subtasks}
                childrenIds={subtaskIds}
                onEditClick={onEditTask}
                onDeleteClick={onDeleteTask}
              >
                {/* Render subtask items with their own drag context */}
                {subtasks.map((subtask) => (
                  <DraggableTask
                    key={subtask.id}
                    task={subtask}
                    groupId={task.id}
                    onEditClick={onEditSubtask}
                    onDeleteClick={onDeleteSubtask}
                    onStartTask={onStartTask}
                    onCompleteTask={onCompleteTask}
                    onViewFormClick={onViewFormClick}
                    disabled={!task.allow_subtask_reordering}
                  />
                ))}
              </DraggableTaskGroup>
            );
          })}
        </SortableContext>

        {/* Overlay for the dragged item */}
        <DragOverlay>
          {activeItem && activeType === "task" ? (
            <Paper
              elevation={3}
              sx={{
                mb: 4,
                borderRadius: 1,
                overflow: "hidden",
                opacity: 0.8,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#f0f0f0",
                  borderLeft: "4px solid #2196f3",
                }}
              >
                {activeType === "task"
                  ? (activeItem as ServiceTicketTask).task_name
                  : ""}
              </Box>
            </Paper>
          ) : activeItem && activeType === "subtask" ? (
            <Paper
              elevation={3}
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                opacity: 0.8,
                py: 1.5,
                px: 3,
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
              }}
            >
              {activeType === "subtask"
                ? (activeItem as ServiceTicketSubtask).subtask_name
                : ""}
            </Paper>
          ) : null}
        </DragOverlay>
      </Box>
    </DndContext>
  );
}

export default DraggableTaskGroupList;
