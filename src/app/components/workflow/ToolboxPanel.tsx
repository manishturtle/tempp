'use client';

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import type { WorkflowStepUI, WorkflowStepData } from '@/types/workflow';

const TASK_TYPES = [
  { 
    id: 'approval', 
    name: 'Approval Task', 
    template_id: '1', 
    category: 'Basic',
    description: 'Requires approval from specified users',
  },
  { 
    id: 'notification', 
    name: 'Notification Task', 
    template_id: '2', 
    category: 'Communication',
    description: 'Sends notifications to specified users',
  },
  { 
    id: 'email', 
    name: 'Email Task', 
    template_id: '3', 
    category: 'Communication',
    description: 'Sends email to specified recipients',
  },
  { 
    id: 'webhook', 
    name: 'Webhook Task', 
    template_id: '4', 
    category: 'Integration',
    description: 'Makes HTTP requests to external services',
  },
];

export function ToolboxPanel() {
  const { t } = useTranslation('ofm');
  const { addNode } = useWorkflowEditor();

  const onDragStart = useCallback((event: React.DragEvent, taskType: typeof TASK_TYPES[0]) => {
    try {
      // Set the task type ID for node type identification
      event.dataTransfer.setData('application/reactflow', taskType.id);
      
      // Set the full task data as JSON
      const taskData = {
        name: taskType.name,
        template_id: taskType.template_id,
        description: taskType.description,
      };
      event.dataTransfer.setData('application/json', JSON.stringify(taskData));
      
      // Set move effect
      event.dataTransfer.effectAllowed = 'move';
    } catch (error) {
      console.error('Error setting drag data:', error);
    }
  }, []);

  const handleDrop = useCallback(
    (taskType: typeof TASK_TYPES[0], position: { x: number; y: number }) => {
      // Create the node data
      const nodeData: WorkflowStepData & { type: string } = {
        name: taskType.name,
        step_name: taskType.name,
        predefined_template_id: taskType.template_id,
        fields: [],
        description: taskType.description || '',
        assignee: '',
        type: taskType.id,
      };

      // Create the new node
      const newNode: WorkflowStepUI = {
        id: `${taskType.id}-${Date.now()}`,
        type: 'task',
        position,
        data: nodeData,
      };
      addNode(newNode);
    },
    [addNode]
  );

  // Group tasks by category
  const tasksByCategory = TASK_TYPES.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, typeof TASK_TYPES>);

  return (
    <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        {t('workflow.editor.toolbox.title')}
      </Typography>
      
      {Object.entries(tasksByCategory).map(([category, tasks]) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {category}
          </Typography>
          <List disablePadding>
            {tasks.map(taskType => (
              <ListItem
                key={taskType.id}
                draggable
                onDragStart={e => onDragStart(e, taskType)}
                sx={{
                  cursor: 'grab',
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&:active': {
                    cursor: 'grabbing',
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ListItemText 
                  primary={taskType.name}
                  secondary={taskType.description}
                  primaryTypographyProps={{
                    variant: 'body2',
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    sx: { opacity: 0.7 },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      ))}
    </Paper>
  );
}

export default ToolboxPanel;
