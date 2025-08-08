'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { WorkflowStep } from '@/app/types/ofm';

interface StepNodeData {
  id: string;
  step_name?: string;
  stepName?: string;
  baseTemplateName?: string;
  templateId?: number | string; // Added templateId to match with predefined templates
  base_template?: any;
  sequence_order?: number;
  display_order?: number;
  configuredFields?: any[];
  notificationLinks?: any[];
  onRemove?: (nodeId: string) => void;
}

const StepNode = memo(({ data, selected }: NodeProps<StepNodeData>) => {
  const { t } = useTranslation('ofm');

  return (
    <Box
      sx={{
        p: 2,
        minWidth: 200,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
            {data.baseTemplateName || 'Unknown Template'}
          </Typography>
          <Typography variant="body2">
            {data.stepName || data.step_name || data.baseTemplateName || 'Unnamed Step'}
          </Typography>
        </Box>
        {data.onRemove && (
          <IconButton
            size="small"
            onClick={() => data.onRemove?.(data.id)}
            sx={{ opacity: selected ? 1 : 0, '&:hover': { opacity: 1 } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {t('workflow.editor.step.number', { number: data.sequence_order })}
      </Typography>
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
});

StepNode.displayName = 'StepNode';

export default StepNode;
