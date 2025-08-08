import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Box, Grid, TextField, Button, FormControlLabel, Switch } from '@mui/material';
import ReactFlow, { 
  Node, 
  Edge, 
  NodeChange, 
  EdgeChange, 
  Connection, 
  Controls, 
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge 
} from 'reactflow';
import 'reactflow/dist/style.css';
import TemplateSidebar from './TemplateSidebar';
import StepConfigurationPane from './StepConfigurationPane';
import StepBuilder from './StepBuilder';
import { useGetPredefinedTemplates } from '@/app/hooks/api/ofm/useWorkflowQueries';
import type { 
  WorkflowStep, 
  InitialWorkflowCreatePayload, 
  PredefinedTemplate,
  WorkflowStepField,
  Template
} from '@/app/types/ofm';

interface StepNodeData extends WorkflowStep {
  label: string;
  template?: PredefinedTemplate;
}

interface WorkflowCreationFormProps {
  onSubmit: (payload: InitialWorkflowCreatePayload) => void;
}

const WorkflowCreationForm: React.FC<WorkflowCreationFormProps> = ({ onSubmit }) => {
  const { t } = useTranslation('ofm');
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [versionDescription, setVersionDescription] = useState('Initial version');
  const [enablePartialFulfillment, setEnablePartialFulfillment] = useState(true);
  const [maxHoldTimeDays, setMaxHoldTimeDays] = useState(14);
  const [nodes, setNodes] = useState<Node<StepNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { data: templatesData } = useGetPredefinedTemplates();

  const templates: Template[] = useMemo(() => 
    templatesData?.results?.map(template => ({
      id: template.id.toString(),
      category: template.category || 'DEFAULT',
      description: template.description || '',
      display_name: template.display_name,
      system_name: template.system_name,
      fields: template.fields.map(field => ({
        id: field.id.toString(),
        name: field.default_label,
        type: field.field_type,
        required: field.default_is_mandatory,
        default_value: field.default_options?.[0]
      }))
    })) || [], 
    [templatesData]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, []);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<StepNodeData>) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateId = event.dataTransfer?.getData('application/reactflow');
      const templateData = templatesData?.results?.find((t) => t.id.toString() === templateId);

      if (!templateId || !templateData) return;

      const fields: WorkflowStepField[] = templateData.fields.map(field => ({
        predefined_field_id: field.id.toString(),
        field_name: field.default_label,
        field_type: field.field_type as WorkflowStepField['field_type'],
        is_required: field.default_is_mandatory,
        display_order: field.sequence_order,
        options: field.default_options
      }));

      const newNode: Node<StepNodeData> = {
        id: `${Date.now()}`,
        type: 'step',
        position: { x: 100, y: 200 },
        data: {
          id: `${Date.now()}`,
          step_name: templateData.display_name,
          step_type: templateData.system_name,
          is_required: true,
          base_template: templateData.id,
          sequence_order: nodes.length + 1,
          configured_fields: fields,
          fields,
          label: templateData.display_name,
          template: {
            ...templateData,
            description: templateData.description || ''
          }
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [templatesData, nodes]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const payload: InitialWorkflowCreatePayload = {
        name,
        description,
        is_active: true,
        is_default: false,
        initial_version_config: {
          description: versionDescription,
          enable_partial_fulfillment: enablePartialFulfillment,
          max_hold_time_days: maxHoldTimeDays,
          steps: nodes.map((node, index) => ({
            predefined_template_id: Number(node.data.template?.id), 
            step_name: node.data.step_name,
            display_order: index + 1, 
            fields: node.data.fields.map((field, fieldIndex) => ({
              predefined_field_id: Number(field.predefined_field_id),
              field_name: field.field_name,
              field_type: field.field_type,
              is_required: field.is_required,
              display_order: fieldIndex + 1,
              options: field.options,
              help_text: field.help_text,
            })),
            notification_template_ids: node.data.notification_template_ids || []
          }))
        }
      };

      onSubmit(payload);
    },
    [name, description, versionDescription, enablePartialFulfillment, maxHoldTimeDays, nodes, onSubmit]
  );

  const handleNodesReordered = useCallback(() => {
    setNodes((nds) => {
      return nds
        .map((node, index) => ({
          ...node,
          data: { ...node.data, sequence_order: index + 1 }
        }));
    });
  }, []);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ height: 'calc(100vh - 200px)' }}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('workflows.form.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('workflows.form.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('workflows.form.version_description')}
            value={versionDescription}
            onChange={(e) => setVersionDescription(e.target.value)}
            placeholder="Initial version description"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={enablePartialFulfillment}
                onChange={(e) => setEnablePartialFulfillment(e.target.checked)}
                color="primary"
              />
            }
            label={t('workflows.form.enable_partial_fulfillment', 'Enable Partial Fulfillment')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label={t('workflows.form.max_hold_time_days', 'Max Hold Time (Days)')}
            value={maxHoldTimeDays}
            onChange={(e) => setMaxHoldTimeDays(parseInt(e.target.value) || 0)}
            InputProps={{
              inputProps: { min: 0 }
            }}
            helperText={t('workflows.form.max_hold_time_days_help', 'Maximum number of days to hold sibling items before processing')}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100% - 100px)' }}>
        <Box sx={{ width: 300 }}>
          <TemplateSidebar
            templates={templates}
            sx={{
              height: '100%',
              overflowY: 'auto',
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minHeight: 400, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <StepBuilder
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick as any}
            onRemoveNode={handleRemoveNode}
            onNodesReordered={handleNodesReordered}
            onDrop={onDrop}
            selectedNodeId={selectedNodeId}
          />
        </Box>

        <Box sx={{ width: 300 }}>
          <StepConfigurationPane
            selectedNode={selectedNodeId ? nodes.find(n => n.id === selectedNodeId) as Node<WorkflowStep> : null}
            onStepUpdate={(nodeId, updates) => {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === nodeId
                    ? { ...node, data: { ...node.data, ...updates } }
                    : node
                )
              );
            }}
            onFieldUpdate={(nodeId, fieldId, updates) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id !== nodeId) return node;
                  
                  const updatedFields = node.data.fields.map(field =>
                    field.predefined_field_id === fieldId
                      ? { ...field, ...updates }
                      : field
                  );
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      fields: updatedFields
                    }
                  };
                })
              );
            }}
            onAddCustomField={(nodeId, field) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id !== nodeId) return node;
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      fields: [...node.data.fields, field as WorkflowStepField]
                    }
                  };
                })
              );
            }}
            onRemoveField={(nodeId, fieldId) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id !== nodeId) return node;
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      fields: node.data.fields.filter(f => f.predefined_field_id !== fieldId)
                    }
                  };
                })
              );
            }}
          />
        </Box>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={() => router.back()}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!name.trim() || nodes.length === 0}
        >
          {t('common.create')}
        </Button>
      </Box>
    </Box>
  );
};

export default WorkflowCreationForm;
