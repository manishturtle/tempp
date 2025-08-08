'use client';

import React from 'react';
import { Box, FormControlLabel, Switch, TextField } from '@mui/material';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  NodeTypes,
  ReactFlowProvider,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { WorkflowEditorProvider, useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useWorkflowVersion } from '@/hooks/useWorkflowVersion';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useCreateWorkflowWithInitialVersion } from '@/hooks/useCreateWorkflow';
import { useSaveNewWorkflowVersion } from '@/hooks/useSaveWorkflowVersion';

interface WorkflowEditorProps {
  workflowId?: string;
  versionId?: string;
  nodeTypes: NodeTypes;
  name?: string;
  description?: string;
  onNodeSelect?: (node: Node | null) => void;
}

function WorkflowEditorContent({ 
  workflowId,
  versionId,
  nodeTypes,
  name = '',
  description = '',
  onNodeSelect
}: WorkflowEditorProps) {
  const { t } = useTranslation('ofm');
  const { enqueueSnackbar } = useSnackbar();
  const { state, updateSettings, markClean, updateWorkflowInfo } = useWorkflowEditor();
  const { data: workflow } = useWorkflow(workflowId || '');
  const { data: version } = useWorkflowVersion(workflowId || '', versionId || '');
  const createWorkflow = useCreateWorkflowWithInitialVersion();
  const saveVersion = useSaveNewWorkflowVersion(workflowId || '');

  // Initialize workflow info
  React.useEffect(() => {
    if (name || description) {
      updateWorkflowInfo(name, description);
    }
  }, [name, description, updateWorkflowInfo]);

  const getWorkflowConfig = () => ({
    nodes: state.nodes,
    edges: state.edges,
    settings: state.settings,
  });

  const handleSave = async () => {
    try {
      if (workflowId) {
        await saveVersion.mutateAsync({
          description: state.description || t('ofm.workflows.defaultDescription'),
          ...getWorkflowConfig(),
        });
      } else {
        await createWorkflow.mutateAsync({
          name: state.name || t('ofm.workflows.defaultName'),
          description: state.description || t('ofm.workflows.defaultDescription'),
          initial_version: getWorkflowConfig(),
        });
      }
      markClean();
      enqueueSnackbar(t('ofm.workflows.editor.saveSuccess'), { variant: 'success' });
    } catch (error) {
      console.error('Save failed:', error);
      enqueueSnackbar(t('ofm.workflows.editor.saveError'), { variant: 'error' });
    }
  };

  useAutoSave(handleSave, state.isDirty, 30000, true);

  const handlePartialFulfillmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({
      ...state.settings,
      enablePartialFulfillment: event.target.checked,
    });
  };

  const handleMaxHoldTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({
      ...state.settings,
      maxHoldTimeDays: parseInt(event.target.value) || 0,
    });
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    onNodeSelect?.(node);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          sx={{ mr: 2 }}
          label={t('ofm.workflows.editor.name')}
          value={state.name}
          onChange={(e) => updateWorkflowInfo(e.target.value, state.description)}
          size="small"
        />
        <FormControlLabel
          control={
            <Switch
              checked={state.settings.enablePartialFulfillment}
              onChange={handlePartialFulfillmentChange}
            />
          }
          label={t('ofm.workflows.editor.enablePartialFulfillment')}
        />
        <TextField
          sx={{ ml: 2 }}
          type="number"
          label={t('ofm.workflows.editor.maxHoldTimeDays')}
          value={state.settings.maxHoldTimeDays}
          onChange={handleMaxHoldTimeChange}
          size="small"
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <ReactFlow
          nodes={state.nodes}
          edges={state.edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </Box>
    </Box>
  );
}

const WorkflowEditor = (props: WorkflowEditorProps) => {
  return (
    <WorkflowEditorProvider>
      <ReactFlowProvider>
        <WorkflowEditorContent {...props} />
      </ReactFlowProvider>
    </WorkflowEditorProvider>
  );
};

export default WorkflowEditor;
