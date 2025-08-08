'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, IconButton, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import type { WorkflowStepUI } from '@/types/workflow';

function TaskNode({ id, data, selected }: NodeProps<WorkflowStepUI['data']>) {
  const { t } = useTranslation('ofm');
  const { removeNode } = useWorkflowEditor();

  return (
    <Box
      sx={{
        p: 2,
        minWidth: 200,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        boxShadow: selected ? 2 : 1,
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          {data.step_name}
        </Typography>
        <IconButton
          size="small"
          onClick={() => removeNode(id)}
          sx={{ ml: 1 }}
          aria-label={t('workflow.editor.step.remove')}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {data.fields.length} {t('workflow.editor.step.fields')}
      </Typography>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </Box>
  );
}

TaskNode.displayName = 'TaskNode';

export default memo(TaskNode);
