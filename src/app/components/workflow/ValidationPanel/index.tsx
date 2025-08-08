'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

const ValidationPanel = () => {
  const { t } = useTranslation('ofm');
  const { state } = useWorkflowEditor();

  const validationIssues = validateWorkflow(state);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'grey.500' }}>
        {t('workflow.editor.validation.title')}
      </Typography>
      <Divider />
      {validationIssues.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="success.main">
            {t('workflow.editor.validation.noIssues')}
          </Typography>
        </Box>
      ) : (
        <List>
          {validationIssues.map((issue, index) => (
            <ListItem
              key={index}
              component="div"
              sx={{
                color: getIssueColor(issue.type),
                '&:not(:last-child)': {
                  borderBottom: 1,
                  borderColor: 'divider',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {getIssueIcon(issue.type)}
              </ListItemIcon>
              <ListItemText
                primary={issue.message}
                secondary={issue.nodeId ? `Step ID: ${issue.nodeId}` : undefined}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

function validateWorkflow(state: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate workflow name
  if (!state.name?.trim()) {
    issues.push({
      type: 'warning',
      message: 'Workflow name is recommended',
    });
  }

  // Validate steps exist
  if (!state.nodes || state.nodes.length === 0) {
    issues.push({
      type: 'info',
      message: 'Add steps to your workflow',
    });
    return issues;
  }

  // Validate each step
  state.nodes.forEach((node: any) => {
    if (!node.data) {
      return;
    }

    // Check step name
    if (!node.data.step_name?.trim()) {
      issues.push({
        type: 'error',
        message: 'Step name is required',
        nodeId: node.id,
      });
    }

    // Check required fields
    if (node.data.fields) {
      node.data.fields.forEach((field: any) => {
        if (field.is_required && !field.default_value) {
          issues.push({
            type: 'error',
            message: `Field "${field.field_name}" is required`,
            nodeId: node.id,
          });
        }
      });
    }
  });

  // Validate step connections
  if (state.nodes.length > 1) {
    const connectedNodes = new Set<string>();
    if (state.edges) {
      state.edges.forEach((edge: any) => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });
    }

    state.nodes.forEach((node: any) => {
      if (!connectedNodes.has(node.id)) {
        issues.push({
          type: 'warning',
          message: 'Step is not connected to workflow',
          nodeId: node.id,
        });
      }
    });
  }

  return issues;
}

function getIssueIcon(type: ValidationIssue['type']) {
  switch (type) {
    case 'error':
      return <ErrorIcon fontSize="small" />;
    case 'warning':
      return <WarningIcon fontSize="small" />;
    case 'info':
      return <InfoIcon fontSize="small" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
}

function getIssueColor(type: ValidationIssue['type']) {
  switch (type) {
    case 'error':
      return 'error.main';
    case 'warning':
      return 'warning.main';
    case 'info':
      return 'info.main';
    default:
      return 'text.primary';
  }
}

export default ValidationPanel;
