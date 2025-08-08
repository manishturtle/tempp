'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Switch, 
  FormControlLabel, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Button, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Divider,
  Paper,
  Tooltip
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Node } from 'reactflow';
import type { WorkflowStep, WorkflowStepField } from '@/app/types/ofm';

interface PredefinedTemplate {
  id: string;
  display_name: string;
}

interface StepConfigurationPaneProps {
  selectedNode: Node<WorkflowStep> | null;
  onStepUpdate: (nodeId: string, updates: Partial<WorkflowStep>) => void;
  onFieldUpdate?: (nodeId: string, fieldId: string, updates: Partial<WorkflowStepField>) => void;
  onAddCustomField?: (nodeId: string, field: Partial<WorkflowStepField>) => void;
  onRemoveField?: (nodeId: string, fieldId: string) => void;
  predefinedTemplates?: PredefinedTemplate[];
}

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

const StepConfigurationPane: React.FC<StepConfigurationPaneProps> = ({
  selectedNode,
  onStepUpdate,
  onFieldUpdate,
  onAddCustomField,
  onRemoveField,
  predefinedTemplates = []
}) => {
  const { t } = useTranslation('ofm');
  const [expandedSection, setExpandedSection] = useState<string | false>('general');

  // If no node is selected, show a placeholder
  if (!selectedNode) {
    return (
      <Box
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          {t('workflow.editor.selectStepPrompt', 'Select a step to configure')}
        </Typography>
      </Box>
    );
  }

  // Find the template info for this step if available
  const baseTemplateId = selectedNode.data.base_template?.id;
  const template = baseTemplateId && typeof baseTemplateId === 'string' ? 
    predefinedTemplates.find(t => t.id === baseTemplateId) : undefined;
  
  // Get the fields from the node data
  const fields = selectedNode.data.fields || [];
  
  // Handle step name change
  const handleStepNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onStepUpdate(selectedNode.id, { 
      step_name: event.target.value
    });
  };

  // Handle field updates
  const handleFieldUpdate = (fieldId: string, updates: Partial<WorkflowStepField>) => {
    if (onFieldUpdate) {
      onFieldUpdate(selectedNode.id, fieldId, updates);
    } else {
      // If onFieldUpdate is not provided, update the node directly
      const updatedFields = fields.map(field => 
        field.predefined_field_id === fieldId ? { ...field, ...updates } : field
      );
      
      onStepUpdate(selectedNode.id, { 
        fields: updatedFields
      });
    }
  };

  // Handle adding a custom field
  const handleAddCustomField = () => {
    if (onAddCustomField && selectedNode) {
      // Create a new field with default values
      const newField: Partial<WorkflowStepField> = {
        predefined_field_id: `custom-${Date.now()}`,
        field_name: 'New Field',
        field_type: 'TEXT',
        is_required: false,
        display_order: fields.length + 1,
        help_text: ''
      };
      onAddCustomField(selectedNode.id, newField);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        bgcolor: 'background.paper',
        borderRadius: 1,
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('workflow.editor.configureStep', 'Configure Step')}
      </Typography>
      
      {/* Template information */}
      {template && (
        <Paper elevation={0} sx={{ p: 1, mb: 2, bgcolor: 'background.default' }}>
          <Typography variant="caption" color="text.secondary">
            {t('workflow.editor.basedOnTemplate', 'Based on template')}
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {template.display_name}
          </Typography>
        </Paper>
      )}

      {/* General settings section */}
      <Accordion 
        expanded={expandedSection === 'general'} 
        onChange={() => setExpandedSection(expandedSection === 'general' ? false : 'general')}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">{t('workflow.editor.generalSettings', 'General Settings')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            label={t('workflow.editor.stepName', 'Step Name')}
            value={selectedNode.data.step_name || ''}
            onChange={handleStepNameChange}
            margin="normal"
            variant="outlined"
          />
        </AccordionDetails>
      </Accordion>

      {/* Fields section */}
      <Accordion 
        expanded={expandedSection === 'fields'} 
        onChange={() => setExpandedSection(expandedSection === 'fields' ? false : 'fields')}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">{t('workflow.editor.fields', 'Fields')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {fields.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {t('workflow.editor.noFields', 'No fields configured for this step')}
            </Typography>
          ) : (
            fields.map((field, index) => (
              <Paper key={field.predefined_field_id || `field-${index}`} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">{field.field_name || 'Unnamed Field'}</Typography>
                  
                  {/* Show predefined field indicator */}
                  {!String(field.predefined_field_id || '').startsWith('custom-') && (
                    <Tooltip title={t('workflow.editor.predefinedField', 'Predefined field from template')}>
                      <InfoIcon fontSize="small" color="primary" />
                    </Tooltip>
                  )}
                </Box>
                
                <TextField
                  fullWidth
                  label={t('workflow.editor.fieldName', 'Field Name')}
                  value={field.field_name || ''}
                  onChange={(e) => handleFieldUpdate(field.predefined_field_id, { field_name: e.target.value })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                />

                <FormControl fullWidth margin="dense" size="small" sx={{ mt: 1 }}>
                  <InputLabel>{t('workflow.editor.fieldType', 'Field Type')}</InputLabel>
                  <Select
                    value={field.field_type || 'TEXT'}
                    label={t('workflow.editor.fieldType', 'Field Type')}
                    onChange={(e) => handleFieldUpdate(field.predefined_field_id, { field_type: e.target.value })}
                    disabled={!String(field.predefined_field_id || '').startsWith('custom-')}
                  >
                    {fieldTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.is_required || false}
                        onChange={(e) => handleFieldUpdate(field.predefined_field_id, { is_required: e.target.checked })}
                      />
                    }
                    label={t('workflow.editor.required', 'Required')}
                  />
                </Box>

                {/* Only show remove button for custom fields */}
                {onRemoveField && String(field.predefined_field_id || '').startsWith('custom-') && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<DeleteIcon />}
                      color="error"
                      size="small"
                      onClick={() => onRemoveField(selectedNode.id, field.predefined_field_id)}
                    >
                      {t('workflow.editor.removeField', 'Remove Field')}
                    </Button>
                  </Box>
                )}
              </Paper>
            ))
          )}
          
          {/* Add custom field button */}
          {onAddCustomField && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddCustomField}
                fullWidth
              >
                {t('workflow.editor.addCustomField', 'Add Custom Field')}
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Notifications section - placeholder for future implementation */}
      <Accordion 
        expanded={expandedSection === 'notifications'} 
        onChange={() => setExpandedSection(expandedSection === 'notifications' ? false : 'notifications')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">{t('workflow.editor.notifications', 'Notifications')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {t('workflow.editor.notificationsComingSoon', 'Notification configuration coming soon')}
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Settings section */}
      <Accordion
        expanded={expandedSection === 'settings'} 
        onChange={() => setExpandedSection(expandedSection === 'settings' ? false : 'settings')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">{t('workflow.editor.settings', 'Settings')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={selectedNode.data.is_required || false}
                onChange={(e) => onStepUpdate(selectedNode.id, { is_required: e.target.checked })}
              />
            }
            label={t('workflow.editor.requiredStep', 'Required Step')}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={selectedNode.data.auto_complete || false}
                onChange={(e) => onStepUpdate(selectedNode.id, { auto_complete: e.target.checked })}
              />
            }
            label={t('workflow.editor.autoComplete', 'Auto Complete')}
            sx={{ ml: 0, mt: 1, display: 'block' }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default StepConfigurationPane;
