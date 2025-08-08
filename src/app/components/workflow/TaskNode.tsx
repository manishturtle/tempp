'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, Box } from '@mui/material';
import type { WorkflowStepUI } from '@/types/workflow';

function TaskNode({ data, selected }: NodeProps<WorkflowStepUI['data']>) {
  return (
    <Card 
      variant="outlined"
      sx={{
        minWidth: 200,
        maxWidth: 300,
        bgcolor: 'background.paper',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" noWrap>
            {data.name}
          </Typography>
        </Box>
        {data.description && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {data.description}
          </Typography>
        )}
        {data.assignee && (
          <Typography variant="caption" color="text.secondary" noWrap>
            Assigned to: {data.assignee}
          </Typography>
        )}
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </Card>
  );
}

export default memo(TaskNode);
