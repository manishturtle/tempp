'use client';

import React, { useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import type { WorkflowStepUI, WorkflowStepField } from '@/types/ofm';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface TaskConfigPanelProps {
  selectedNode: WorkflowStepUI | null;
}

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text Input' },
  { value: 'NUMBER', label: 'Number Input' },
  { value: 'BOOLEAN', label: 'Boolean/Checkbox' },
  { value: 'DATE', label: 'Date Input' },
  { value: 'DATETIME', label: 'Date and Time Input' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'DROPDOWN', label: 'Dropdown Select' },
  { value: 'USER_LOOKUP', label: 'User Lookup' },
];

const TASK_TYPES = [
  { id: 1, label: 'Start', system_name: 'start_task' },
  { id: 2, label: 'End', system_name: 'end_task' },
  { id: 3, label: 'Process', system_name: 'process_task' },
  { id: 4, label: 'Decision', system_name: 'decision_task' },
  { id: 5, label: 'Notification', system_name: 'notification_task' },
];

const taskConfigSchema = z.object({
  step_name: z.string().min(1, 'Name is required'),
  predefined_template_id: z.string(),
  fields: z.array(
    z.object({
      predefined_field_id: z.string(),
      field_name: z.string(),
      field_type: z.enum([
        'TEXT',
        'NUMBER',
        'BOOLEAN',
        'DATE',
        'DATETIME',
        'TEXTAREA',
        'DROPDOWN',
        'USER_LOOKUP',
      ]),
      is_required: z.boolean(),
      help_text: z.string().optional(),
      display_order: z.number(),
      options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
    })
  ),
});

type TaskConfigFormData = z.infer<typeof taskConfigSchema>;

export const TaskConfigPanel = ({ selectedNode }: TaskConfigPanelProps) => {
  const { t } = useTranslation('ofm');
  const { state, updateStep } = useWorkflowEditor();

  const { control, handleSubmit, watch } = useForm<TaskConfigFormData>({
    resolver: zodResolver(taskConfigSchema),
    defaultValues: selectedNode || {
      step_name: '',
      predefined_template_id: '',
      fields: [],
    },
  });

  const onSubmit = useCallback(
    (data: TaskConfigFormData) => {
      if (selectedNode && selectedNode.id) {
        updateStep([{
          type: 'update',
          id: selectedNode.id,
          updates: data,
        }]);
      }
    },
    [selectedNode, updateStep]
  );

  const handleFieldChange = useCallback((field: keyof WorkflowStepUI, value: any) => {
    if (!selectedNode || !selectedNode.id) return;
    updateStep([{
      type: 'update',
      id: selectedNode.id,
      updates: { [field]: value },
    }]);
  }, [selectedNode, updateStep]);

  const handleAddField = useCallback(() => {
    const newField: WorkflowStepField = {
      predefined_field_id: 0,
      field_name: `Field ${selectedNode.fields.length + 1}`,
      field_type: 'TEXT',
      is_required: false,
      help_text: '',
      display_order: selectedNode.fields.length,
    };
    handleFieldChange('fields', [...selectedNode.fields, newField]);
  }, [selectedNode, handleFieldChange]);

  if (!selectedNode) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            {t('workflow.editor.noTaskSelected')}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('workflow.editor.taskConfig.title')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, }}>
          <Controller
            name="step_name"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label={t('workflow.editor.taskConfig.name')}
                error={!!error}
                helperText={error?.message}
                fullWidth
              />
            )}
          />
          <FormControl fullWidth>
            <InputLabel>{t('workflow.editor.taskConfig.template')}</InputLabel>
            <Select
              value={selectedNode.predefined_template_id}
              onChange={(e) => handleFieldChange('predefined_template_id', e.target.value)}
              label={t('workflow.editor.taskConfig.template')}
            >
              {TASK_TYPES.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {t(`workflow.editor.taskTypes.${type.system_name}`)}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {t('workflow.editor.taskConfig.templateHelper')}
            </FormHelperText>
          </FormControl>
          {/* Fields Configuration */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('workflow.editor.taskConfig.fields')}
            </Typography>
            <Button
              variant="outlined"
              onClick={handleAddField}
              sx={{ mb: 2 }}
            >
              {t('workflow.editor.taskConfig.addField')}
            </Button>
            {watch('fields')?.map((field, index) => (
              <Box key={field.predefined_field_id} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name={`fields.${index}.field_name`}
                      control={control}
                      render={({ field: { value, onChange }, fieldState: { error } }) => (
                        <TextField
                          value={value}
                          onChange={onChange}
                          label={t('workflow.editor.taskConfig.fieldName')}
                          error={!!error}
                          helperText={error?.message}
                          fullWidth
                          required
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('workflow.editor.taskConfig.fieldType')}</InputLabel>
                      <Select
                        value={field.field_type}
                        onChange={(e) => {
                          const newFieldType = e.target.value as "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "DATETIME" | "TEXTAREA" | "DROPDOWN" | "USER_LOOKUP";
                          const updatedFields = [...selectedNode.fields];
                          updatedFields[index] = {
                            ...field,
                            field_type: newFieldType,
                            // Clear options if changing from dropdown to another type
                            options: newFieldType === 'DROPDOWN' ? field.options : undefined,
                          };
                          handleFieldChange('fields', updatedFields);
                        }}
                        label={t('workflow.editor.taskConfig.fieldType')}
                      >
                        {FIELD_TYPES.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {t(`workflow.editor.fieldTypes.${type.value.toLowerCase()}`)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.is_required}
                          onChange={(e) => {
                            const updatedFields = [...selectedNode.fields];
                            updatedFields[index] = {
                              ...field,
                              is_required: e.target.checked,
                            };
                            handleFieldChange('fields', updatedFields);
                          }}
                        />
                      }
                      label={t('workflow.editor.taskConfig.required')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label={t('workflow.editor.taskConfig.helpText')}
                      value={field.help_text || ''}
                      onChange={(e) => {
                        const updatedFields = [...selectedNode.fields];
                        updatedFields[index] = {
                          ...field,
                          help_text: e.target.value,
                        };
                        handleFieldChange('fields', updatedFields);
                      }}
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                  {field.field_type === 'DROPDOWN' && (
                    <Grid item xs={12}>
                      <Controller
                        name={`fields.${index}.options`}
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <FormControl fullWidth>
                            <InputLabel>Options</InputLabel>
                            <Select
                              multiple
                              value={value?.map(opt => opt.value) || []}
                              onChange={(e) => {
                                const selectedValues = e.target.value as string[];
                                onChange(
                                  selectedValues.map(val => ({
                                    value: val,
                                    label: val,
                                  }))
                                );
                              }}
                            >
                              {field.options?.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const updatedFields = selectedNode.fields.filter((_, i) => i !== index);
                        handleFieldChange('fields', updatedFields);
                      }}
                    >
                      {t('workflow.editor.taskConfig.removeField')}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskConfigPanel;
