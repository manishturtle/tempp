import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { Grid, Typography, TextField, Box, Switch, FormControlLabel, Button, Stack } from '@mui/material';
import { applyNodeChanges, applyEdgeChanges, addEdge, Node, NodeChange, Edge, EdgeChange, Connection } from 'reactflow';
import { WorkflowEditorProvider } from '../../../contexts/WorkflowEditorContext';
import StepBuilder from '../StepBuilder';
import StepConfigPanel from '../StepConfigPanel';
import TemplateSidebar from '../TemplateSidebar';
import { useTemplates } from '../../../hooks/api/ofm/useTemplates';
import { workflowFormSchema, type WorkflowFormData } from '../../../validations/workflow';
import type { WorkflowStepUI } from '@/types/workflow';
import type { PredefinedTemplate } from '@/types/ofm';

export default function WorkflowCreationForm() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { data: templatesData } = useTemplates();

  const [nodes, setNodes] = useState<WorkflowStepUI[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowFormData>({
    defaultValues: {
      enable_partial_fulfillment: true,
      max_hold_time_days: 14,
    },
  });

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      // TODO: Implement workflow creation
      enqueueSnackbar(t('success.workflows.create'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(t('error.workflows.create'), { variant: 'error' });
    }
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds).map(node => ({
      ...node,
      type: 'task'
    })) as WorkflowStepUI[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const onTemplateClick = useCallback((template: PredefinedTemplate) => {
    const newNode: WorkflowStepUI = {
      id: `${Date.now()}`,
      type: 'task',
      position: { x: 100, y: 100 },
      data: {
        predefined_template_id: template.id.toString(),
        step_name: template.display_name,
        name: template.system_name,
        description: template.description,
        fields: template.fields.map((field, index) => ({
          predefined_field_id: field.predefined_field_id,
          field_name: field.field_name,
          field_type: field.field_type,
          is_required: field.is_required,
          display_order: field.display_order,
          options: field.options,
          help_text: field.help_text,
          value: '',
          is_hidden: false
        }))
      }
    };
    setNodes((nds) => [...nds, newNode]);
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label={t('workflows.create.form')}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {t('workflows.create.title')}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <TextField
            {...register('name')}
            label={t('workflows.fields.name')}
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            {...register('description')}
            label={t('workflows.fields.description')}
            fullWidth
            multiline
            rows={3}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                {...register('enable_partial_fulfillment')}
                defaultChecked
              />
            }
            label={t('workflows.fields.enable_partial_fulfillment')}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            {...register('max_hold_time_days', { valueAsNumber: true })}
            label={t('workflows.fields.max_hold_time_days')}
            type="number"
            fullWidth
            defaultValue={14}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, height: '600px' }}>
            <Box 
              component="nav"
              aria-label={t('workflows.editor.templates')}
              sx={{ width: '250px', borderRight: 1, borderColor: 'divider', p: 2 }}
            >
              <TemplateSidebar 
                templates={templatesData?.results.map(template => ({
                  ...template,
                  id: template.id.toString(),
                  category: 'workflow',
                })) || []} 
                onTemplateClick={onTemplateClick}
              />
            </Box>
            <Box 
              component="main"
              aria-label={t('workflows.editor.canvas')}
              sx={{ flex: 1 }}
            >
              <StepBuilder
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                selectedNodeId={selectedNodeId}
              />
            </Box>
            <Box 
              component="aside"
              aria-label={t('workflows.editor.configuration')}
              sx={{ width: '300px', borderLeft: 1, borderColor: 'divider', p: 2 }}
            >
              <StepConfigPanel
                step={nodes.find(node => node.id === selectedNodeId)}
                onStepChange={(updatedStep: WorkflowStepUI['data']) => {
                  setNodes(nds => nds.map(node => 
                    node.id === selectedNodeId ? { ...node, data: updatedStep } : node
                  ));
                }}
              />
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="contained" color="primary" type="submit">
              {t('workflows.actions.save')}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
