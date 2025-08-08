'use client';

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import type { WorkflowStepUI, WorkflowStepField } from '@/types/workflow';

interface TaskConfigPanelProps {
  selectedNode?: WorkflowStepUI | null;
  onUpdate?: (nodeId: string, updates: Partial<WorkflowStepUI>) => void;
}

export default function TaskConfigPanel({ selectedNode, onUpdate }: TaskConfigPanelProps) {
  const { t } = useTranslation('ofm');
  const { selectedNode: contextNode, updateStep } = useWorkflowEditor();

  // Use provided selectedNode or fall back to context
  const node = selectedNode || contextNode;
  const handleUpdate = (nodeId: string, updates: Partial<WorkflowStepUI>) => {
    if (onUpdate) {
      onUpdate(nodeId, updates);
    } else {
      updateStep(nodeId, updates);
    }
  };

  if (!node) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('ofm.workflows.editor.noSelection')}
        </Typography>
      </Box>
    );
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate(node.id, {
      ...node,
      data: {
        ...node.data,
        step_name: event.target.value,
      },
    });
  };

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    handleUpdate(node.id, {
      ...node,
      data: {
        ...node.data,
        predefined_template_id: event.target.value,
      },
    });
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate(node.id, {
      ...node,
      data: {
        ...node.data,
        description: event.target.value,
      },
    });
  };

  const handleAssigneeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate(node.id, {
      ...node,
      data: {
        ...node.data,
        assignee: event.target.value,
      },
    });
  };

  const handleFieldChange = (field: WorkflowStepField, updates: Partial<WorkflowStepField>) => {
    handleUpdate(node.id, {
      ...node,
      data: {
        ...node.data,
        fields: node.data.fields.map((f: WorkflowStepField) =>
          f.predefined_field_id === field.predefined_field_id ? { ...f, ...updates } : f
        ),
      },
    });
  };

  const handleRemoveField = (fieldId: string) => {
    handleUpdate(node.id, {
      ...node,
      data: {
        ...node.data,
        fields: node.data.fields.filter(
          (f: WorkflowStepField) => f.predefined_field_id !== fieldId
        ),
      },
    });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('ofm.workflows.editor.stepConfig')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label={t('ofm.workflows.editor.stepName')}
          value={node.data.step_name || ''}
          onChange={handleNameChange}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>{t('ofm.workflows.editor.template')}</InputLabel>
          <Select
            value={node.data.predefined_template_id || ''}
            onChange={handleTemplateChange}
            label={t('ofm.workflows.editor.template')}
          >
            <MenuItem value="approval">
              {t('ofm.workflows.templates.approval')}
            </MenuItem>
            <MenuItem value="notification">
              {t('ofm.workflows.templates.notification')}
            </MenuItem>
            <MenuItem value="decision">
              {t('ofm.workflows.templates.decision')}
            </MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={t('ofm.workflows.editor.stepDescription')}
          value={node.data.description || ''}
          onChange={handleDescriptionChange}
          multiline
          rows={3}
          fullWidth
        />
        <TextField
          label={t('ofm.workflows.editor.stepAssignee')}
          value={node.data.assignee || ''}
          onChange={handleAssigneeChange}
          fullWidth
        />
      </Box>
    </Paper>
  );
}
