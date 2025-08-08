import { useCallback } from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWorkflowEditor } from '@/app/contexts/WorkflowEditorContext';
import type { WorkflowStepUI } from '@/app/types/workflow';

const taskTypes = [
  {
    id: 'approval',
    name: 'workflow.taskTypes.approval',
    icon: '✓',
  },
  {
    id: 'notification',
    name: 'workflow.taskTypes.notification',
    icon: '📧',
  },
  {
    id: 'data_update',
    name: 'workflow.taskTypes.dataUpdate',
    icon: '📝',
  },
];

export default function ToolboxPanel() {
  const { t } = useTranslation('ofm');
  const { addNode } = useWorkflowEditor();

  const onDragStart = useCallback((event: React.DragEvent, taskType: typeof taskTypes[0]) => {
    const newNode: WorkflowStepUI = {
      id: `${taskType.id}-${Date.now()}`,
      type: 'task',
      position: { x: 0, y: 0 },
      data: {
        step_name: t(taskType.name),
        predefined_template_id: taskType.id,
        fields: [],
      },
    };

    event.dataTransfer.setData('application/reactflow', JSON.stringify(newNode));
    event.dataTransfer.effectAllowed = 'move';
  }, [t]);

  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('workflow.editor.toolbox.title')}
      </Typography>
      <List>
        {taskTypes.map((taskType) => (
          <ListItem
            key={taskType.id}
            draggable
            onDragStart={(e) => onDragStart(e, taskType)}
            sx={{
              cursor: 'grab',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {taskType.icon}
            </ListItemIcon>
            <ListItemText primary={t(taskType.name)} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
