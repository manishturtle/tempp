'use client';

import React from 'react';
import { Box, TextField, Typography, Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import type { WorkflowStepUI, WorkflowStepData, WorkflowStepField } from '@/types/workflow';

const fieldTypes = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'Date & Time' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'USER_LOOKUP', label: 'User Lookup' },
];

export interface StepConfigPanelProps {
  step?: WorkflowStepUI;
  onStepChange: (updatedStep: WorkflowStepUI['data']) => void;
}

export default function StepConfigPanel({ step, onStepChange }: StepConfigPanelProps) {
  const { t } = useTranslation('ofm');
  const { state, updateNode } = useWorkflowEditor();

  if (!step) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('workflow.stepConfig.selectStep')}
        </Typography>
      </Box>
    );
  }

  const nodeId = step.id;
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return null;
  }

  const handleFieldChange = (field: string, value: string | boolean) => {
    onStepChange({
      ...step.data,
      [field]: value,
    });
    updateNode(nodeId, {
      data: {
        ...node.data,
        [field]: value,
      },
    });
  };

  const handleFieldUpdate = (fieldId: string, updates: Partial<WorkflowStepField>) => {
    const updatedFields = step.data.fields.map(field => 
      field.predefined_field_id === fieldId ? { ...field, ...updates } : field
    );
    
    onStepChange({
      ...step.data,
      fields: updatedFields,
    });
    
    updateNode(nodeId, {
      data: {
        ...node.data,
        fields: updatedFields,
      },
    });
  };
  
  const handleAddCustomField = () => {
    const newField: WorkflowStepField = {
      predefined_field_id: `custom_${Date.now()}`,
      field_name: 'New Custom Field',
      field_type: 'TEXT',
      is_required: false,
      display_order: step.data.fields.length + 1,
      is_hidden: false,
      value: '',
    };
    
    const updatedFields = [...step.data.fields, newField];
    
    onStepChange({
      ...step.data,
      fields: updatedFields,
    });
    
    updateNode(nodeId, {
      data: {
        ...node.data,
        fields: updatedFields,
      },
    });
  };
  
  const handleRemoveField = (fieldId: string) => {
    if (!fieldId.startsWith('custom_')) return; // Only allow removing custom fields
    
    const updatedFields = step.data.fields.filter(
      field => field.predefined_field_id !== fieldId
    );
    
    onStepChange({
      ...step.data,
      fields: updatedFields,
    });
    
    updateNode(nodeId, {
      data: {
        ...node.data,
        fields: updatedFields,
      },
    });
  };

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        borderRadius: 1,
        position: 'relative',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {t('workflow.stepConfig.title')}
          </Typography>
          <CloseIcon />
        </Box>

        <Box sx={{ mt: 2 }}>
          <TextField
            label={t('workflow.stepConfig.name')}
            value={step.data.step_name}
            onChange={(e) => handleFieldChange('step_name', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('workflow.stepConfig.description')}
            value={step.data.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
        </Box>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{t('workflow.editor.fields', 'Fields')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {step.data.fields.map((field) => (
              <Box
                key={field.predefined_field_id}
                sx={{
                  mb: 2,
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <TextField
                    size="small"
                    value={field.field_name}
                    onChange={(e) => handleFieldUpdate(field.predefined_field_id, { field_name: e.target.value })}
                    sx={{ flex: 1, mr: 2 }}
                  />
                  {field.predefined_field_id.startsWith('custom_') && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveField(field.predefined_field_id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>{t('workflow.editor.fieldType', 'Field Type')}</InputLabel>
                  <Select
                    value={field.field_type}
                    label={t('workflow.editor.fieldType', 'Field Type')}
                    onChange={(e) => handleFieldUpdate(field.predefined_field_id, { field_type: e.target.value })}
                  >
                    {fieldTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={field.is_required}
                      onChange={(e) => handleFieldUpdate(field.predefined_field_id, { is_required: e.target.checked })}
                    />
                  }
                  label={t('workflow.editor.required', 'Required')}
                />

                {field.field_type === 'DROPDOWN' && field.options && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {t('workflow.editor.options', 'Options')}
                    </Typography>
                    {field.options.map((option, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Value"
                          value={option.value}
                          onChange={(e) => {
                            const newOptions = [...field.options];
                            newOptions[index] = { ...option, value: e.target.value };
                            handleFieldUpdate(field.predefined_field_id, { options: newOptions });
                          }}
                        />
                        <TextField
                          size="small"
                          placeholder="Label"
                          value={option.label}
                          onChange={(e) => {
                            const newOptions = [...field.options];
                            newOptions[index] = { ...option, label: e.target.value };
                            handleFieldUpdate(field.predefined_field_id, { options: newOptions });
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newOptions = field.options.filter((_, i) => i !== index);
                            handleFieldUpdate(field.predefined_field_id, { options: newOptions });
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      onClick={() => {
                        const newOptions = [...(field.options || []), { value: '', label: '' }];
                        handleFieldUpdate(field.predefined_field_id, { options: newOptions });
                      }}
                      sx={{ mt: 1 }}
                    >
                      {t('workflow.editor.addOption', 'Add Option')}
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleAddCustomField}
              sx={{ mt: 1 }}
            >
              {t('workflow.editor.addCustomField', 'Add Custom Field')}
            </Button>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}
