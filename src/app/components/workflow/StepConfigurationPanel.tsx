'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControlLabel, 
  Switch, 
  Button,
  Paper,
  Divider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { 
  Info as InfoIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Flag as FlagIcon,
  Notes as NotesIcon,
  Notifications as NotificationsIcon,
  Lock as LockIcon,
  AddCircleOutline as AddCircleOutlineIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { WorkflowStep, WorkflowStepField, PredefinedTemplate, PredefinedField } from '@/app/types/ofm';

// Extended WorkflowStepField to include properties from API response
interface ExtendedWorkflowStepField extends WorkflowStepField {
  default_label?: string;
  custom_field_label?: string;
  system_name?: string;
  description?: string;
  is_hidden?: boolean;
}

// Extended WorkflowStep to use the extended field type
interface ExtendedWorkflowStep extends Omit<WorkflowStep, 'fields' | 'base_template'> {
  fields: ExtendedWorkflowStepField[];
  base_template?: {
    id: number | string;
    name?: string;
  };
  notes_enabled?: boolean;
  flag_enabled?: boolean;
  notification_links?: Array<{
    cns_template_id: string;
  }>;
}

// Interface for new custom field data
interface NewCustomFieldData {
  field_name: string;
  field_type: string;
  is_required: boolean;
  is_hidden: boolean;
  description?: string;
}

export interface StepConfigurationPanelProps {
  step?: ExtendedWorkflowStep;
  onStepChange: (changes: Partial<WorkflowStep>) => void;
  predefinedTemplates?: PredefinedTemplate[];
  onUpdateStepName?: (stepId: string, newName: string) => void;
  onUpdateFieldConfig?: (stepId: string, fieldIdOrTempId: string, configChanges: Partial<ExtendedWorkflowStepField>) => void;
  onAddCustomField?: (stepId: string, newFieldData: NewCustomFieldData) => void;
  onRemoveCustomField?: (stepId: string, fieldIdOrTempId: string) => void;
  onUpdateNotificationLinks?: (stepId: string, newLinks: { cnsTemplateId: string }[]) => void;
  onConfigureNotesFlag?: (stepId: string, config: { notesEnabled: boolean; flagEnabled: boolean }) => void;
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

export default function StepConfigurationPanel({ 
  step, 
  onStepChange,
  predefinedTemplates = [],
  onUpdateStepName,
  onUpdateFieldConfig,
  onAddCustomField,
  onRemoveCustomField,
  onUpdateNotificationLinks,
  onConfigureNotesFlag
}: StepConfigurationPanelProps) {
  const { t } = useTranslation('ofm');
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldData, setNewFieldData] = useState<NewCustomFieldData>({
    field_name: '',
    field_type: 'TEXT',
    is_required: false,
    is_hidden: false,
    description: ''
  });

  // If no step is selected, show placeholder message
  if (!step) {
    return (
      <Box sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {t('ofm:workflows.editor.selectStepPrompt', 'Select a step to configure')}
        </Typography>
      </Box>
    );
  }

  // Find the template info for this step if available
  const baseTemplateId = step.base_template?.id;
  const template = baseTemplateId ? 
    predefinedTemplates?.find(t => t.id === Number(baseTemplateId)) : undefined;
  
  // Handlers for field changes
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    // Use the callback prop if provided, otherwise fall back to direct state update
    if (onUpdateStepName && step.id) {
      onUpdateStepName(step.id, newName);
    } else {
      onStepChange({ step_name: newName });
    }
  };

  const handleFieldChange = (fieldId: string, changes: Partial<ExtendedWorkflowStepField>) => {
    // Use the callback prop if provided, otherwise fall back to direct state update
    if (onUpdateFieldConfig && step.id) {
      onUpdateFieldConfig(step.id, fieldId, changes);
    } else {
      // Store changes locally first
      const updatedFields = step.fields.map(field => {
        if (field.predefined_field_id === fieldId) {
          // For field_name changes, also update custom_field_label to ensure persistence
          if (changes.field_name) {
            return { 
              ...field, 
              ...changes, 
              custom_field_label: changes.field_name // This ensures the name persists when reopening
            };
          }
          return { ...field, ...changes };
        }
        return field;
      });
      
      // Update the local state
      onStepChange({ fields: updatedFields });
    }
  };

  const handleAddCustomField = () => {
    setIsAddFieldModalOpen(true);
  };

  const handleAddFieldSubmit = () => {
    // Use the callback prop if provided, otherwise fall back to direct state update
    if (onAddCustomField && step.id) {
      onAddCustomField(step.id, newFieldData);
    } else {
      // Create a new field with the provided values
      const newField: Partial<WorkflowStepField> = {
        predefined_field_id: `custom-${Date.now()}`,
        field_name: newFieldData.field_name,
        field_type: newFieldData.field_type as WorkflowStepField['field_type'],
        is_required: newFieldData.is_required,
        is_hidden: newFieldData.is_hidden,
        display_order: (step.fields?.length || 0) + 1,
        help_text: newFieldData.description
      };
      
      onStepChange({ 
        fields: [...(step.fields || []), newField as WorkflowStepField] 
      });
    }
    
    // Reset form and close modal
    setNewFieldData({
      field_name: '',
      field_type: 'TEXT',
      is_required: false,
      is_hidden: false,
      description: ''
    });
    setIsAddFieldModalOpen(false);
  };

  const handleRemoveField = (fieldId: string) => {
    // Use the callback prop if provided, otherwise fall back to direct state update
    if (onRemoveCustomField && step.id) {
      onRemoveCustomField(step.id, fieldId);
    } else {
      const updatedFields = step.fields.filter(field => 
        field.predefined_field_id !== fieldId
      );
      onStepChange({ fields: updatedFields });
    }
  };

  const handleNotesConfigChange = (key: 'notes_enabled' | 'flag_enabled', value: boolean) => {
    // Use the callback prop if provided, otherwise fall back to direct state update
    if (onConfigureNotesFlag && step.id) {
      onConfigureNotesFlag(step.id, {
        notesEnabled: key === 'notes_enabled' ? value : !!step.notes_enabled,
        flagEnabled: key === 'flag_enabled' ? value : !!step.flag_enabled
      });
    } else {
      onStepChange({ [key]: value });
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflowY: 'auto', borderLeft: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" gutterBottom>
        {t('ofm:workflows.editor.configureStep', 'Configure Step')}: {step.step_name || 'Unnamed Step'}
      </Typography>

      {/* Step Name and Base Template */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            label={t('ofm:workflows.editor.stepName', 'Step Name')}
            value={step.step_name || ''}
            onChange={handleNameChange}
            variant="outlined"
            size="small"
            margin="normal"
          />
          
          {/* Template information */}
          {template && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {t('ofm:workflows.editor.baseTemplate', 'Base Template')}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {template.display_name}
              </Typography>
              {template.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {template.description}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Fields Section */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            {t('ofm:workflows.editor.fieldsTitle', 'Fields')}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {(!step.fields || step.fields.length === 0) ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {t('ofm:workflows.editor.noFields', 'No fields configured for this step')}
            </Typography>
          ) : (
            step.fields.map((field) => (
              <Paper 
                key={field.predefined_field_id || `field-${Date.now()}-${Math.random()}`} 
                sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    {field.field_name || field.custom_field_label || field.default_label || 'Unnamed Field'}
                  </Typography>
                  
                  {/* Show predefined field indicator */}
                  {!String(field.predefined_field_id || '').startsWith('custom-') && (
                    <Tooltip title={t('ofm:workflows.editor.predefinedField', 'Predefined field from template')}>
                      <InfoIcon fontSize="small" color="primary" />
                    </Tooltip>
                  )}
                </Box>
                
                <TextField
                  fullWidth
                  label={t('ofm:workflows.editor.fieldName', 'Field Name')}
                  value={field.field_name || ''}
                  onChange={(e) => handleFieldChange(field.predefined_field_id, { field_name: e.target.value })}
                  variant="outlined"
                  size="small"
                  margin="normal"
                  // Disable editing for predefined fields
                  disabled={field.predefined_field_id && !field.predefined_field_id.toString().startsWith('custom-')}
                  InputProps={{
                    startAdornment: field.predefined_field_id && !field.predefined_field_id.toString().startsWith('custom-') ? (
                      <Tooltip title={t('ofm:workflows.editor.predefinedFieldLocked', 'Predefined fields cannot be renamed')}>
                        <Box component="span" sx={{ mr: 1, color: 'text.disabled' }}>
                          <LockIcon fontSize="small" />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Tooltip title={t('ofm:workflows.editor.customField', 'Custom Field')}>
                        <Box component="span" sx={{ mr: 1, color: 'success.main' }}>
                          <AddCircleOutlineIcon fontSize="small" />
                        </Box>
                      </Tooltip>
                    )
                  }}
                />
                
                {/* Show field system name if available */}
                {field.system_name && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    System name: {field.system_name}
                  </Typography>
                )}

                {/* Field description if available */}
                {field.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {field.description}
                  </Typography>
                )}

                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel id={`field-type-label-${field.predefined_field_id}`}>
                    {t('ofm:workflows.editor.fieldType', 'Field Type')}
                  </InputLabel>
                  <Select
                    labelId={`field-type-label-${field.predefined_field_id}`}
                    value={field.field_type || 'TEXT'}
                    label={t('ofm:workflows.editor.fieldType', 'Field Type')}
                    onChange={(e) => handleFieldChange(field.predefined_field_id, { field_type: e.target.value as WorkflowStepField['field_type'] })}
                    // Disable type changes for existing fields to enforce immutability
                    disabled={field.predefined_field_id && !field.predefined_field_id.toString().startsWith('custom-temp-')}
                    sx={{
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center'
                      }
                    }}
                    startAdornment={field.predefined_field_id && !field.predefined_field_id.toString().startsWith('custom-') ? (
                      <Tooltip title={t('ofm:workflows.editor.fieldTypeImmutable', 'Field type cannot be changed')}>
                        <LockIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      </Tooltip>
                    ) : null}
                  >
                    <MenuItem value="TEXT">{t('ofm:workflows.editor.fieldTypes.text', 'Text')}</MenuItem>
                    <MenuItem value="NUMBER">{t('ofm:workflows.editor.fieldTypes.number', 'Number')}</MenuItem>
                    <MenuItem value="BOOLEAN">{t('ofm:workflows.editor.fieldTypes.boolean', 'Yes/No')}</MenuItem>
                    <MenuItem value="DATE">{t('ofm:workflows.editor.fieldTypes.date', 'Date')}</MenuItem>
                    <MenuItem value="DATETIME">{t('ofm:workflows.editor.fieldTypes.datetime', 'Date & Time')}</MenuItem>
                    <MenuItem value="TEXTAREA">{t('ofm:workflows.editor.fieldTypes.textarea', 'Text Area')}</MenuItem>
                    <MenuItem value="DROPDOWN">{t('ofm:workflows.editor.fieldTypes.dropdown', 'Dropdown')}</MenuItem>
                    <MenuItem value="USER_LOOKUP">{t('ofm:workflows.editor.fieldTypes.userLookup', 'User Lookup')}</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!field.is_required}
                        onChange={(e) => handleFieldChange(field.predefined_field_id, { is_required: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={t('ofm:workflows.editor.required', 'Required')}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!field.is_hidden}
                        onChange={(e) => handleFieldChange(field.predefined_field_id, { is_hidden: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={t('ofm:workflows.editor.hidden', 'Hidden')}
                  />
                </Box>

                {/* Only show remove button for custom fields */}
                {String(field.predefined_field_id || '').startsWith('custom-') && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<DeleteIcon />}
                      color="error"
                      size="small"
                      onClick={() => handleRemoveField(field.predefined_field_id)}
                    >
                      {t('ofm:workflows.editor.removeField', 'Remove Field')}
                    </Button>
                  </Box>
                )}
              </Paper>
            ))
          )}
          
          {/* Add custom field button */}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddCustomField}
              fullWidth
            >
              {t('ofm:workflows.editor.addCustomField', 'Add Custom Field')}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Notes/Flags Section */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            {t('ofm:workflows.editor.notesFlagTitle', 'Notes & Flags')}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={step.notes_enabled || false}
                  onChange={(e) => handleNotesConfigChange('notes_enabled', e.target.checked)}
                />
              }
              label={t('ofm:workflows.editor.enableInternalNotes', 'Enable Internal Notes')}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={step.flag_enabled || false}
                  onChange={(e) => handleNotesConfigChange('flag_enabled', e.target.checked)}
                />
              }
              label={t('ofm:workflows.editor.enableFlagForReview', 'Enable Flag for Review')}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Notifications Section */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            {t('ofm:workflows.editor.notificationsTitle', 'Notifications')}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('ofm:workflows.editor.notificationsDescription', 'Configure notifications to be sent when this step is completed.')}
          </Typography>
          
          {/* Notification configuration would go here */}
          {/* This would typically be a separate NotificationLinker component */}
          <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('ofm:workflows.editor.notificationsPlaceholder', 'Notification configuration will be implemented here')}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Save Changes Button */}
      <Box sx={{ mt: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth
          onClick={() => {
            // Apply all pending changes to the parent component
            if (step) {
              // Make sure custom field labels are set for all fields with names
              const finalFields = step.fields.map(field => {
                if (field.field_name && !field.custom_field_label) {
                  return {
                    ...field,
                    custom_field_label: field.field_name
                  };
                }
                return field;
              });
              
              // Update with finalized fields
              onStepChange({ 
                fields: finalFields,
                step_name: step.step_name,
                notes_enabled: step.notes_enabled,
                flag_enabled: step.flag_enabled
              });
            }
          }}
        >
          {t('ofm:workflows.editor.saveChanges', 'Save Changes')}
        </Button>
      </Box>
      
      {/* Add Custom Field Modal */}
      <Dialog open={isAddFieldModalOpen} onClose={() => setIsAddFieldModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('ofm:workflows.editor.addCustomField', 'Add Custom Field')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('ofm:workflows.editor.addCustomFieldDescription', 'Create a custom field for this step. Custom fields can be used to capture additional information not included in the template.')}
          </DialogContentText>
          
          <TextField
            autoFocus
            margin="dense"
            label={t('ofm:workflows.editor.fieldName', 'Field Name')}
            fullWidth
            variant="outlined"
            value={newFieldData.field_name}
            onChange={(e) => setNewFieldData({...newFieldData, field_name: e.target.value})}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label={t('ofm:workflows.editor.fieldDescription', 'Field Description')}
            fullWidth
            variant="outlined"
            value={newFieldData.description}
            onChange={(e) => setNewFieldData({...newFieldData, description: e.target.value})}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('ofm:workflows.editor.fieldType', 'Field Type')}</InputLabel>
            <Select
              value={newFieldData.field_type}
              label={t('ofm:workflows.editor.fieldType', 'Field Type')}
              onChange={(e) => setNewFieldData({...newFieldData, field_type: e.target.value})}
            >
              {fieldTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={newFieldData.is_required}
                  onChange={(e) => setNewFieldData({...newFieldData, is_required: e.target.checked})}
                />
              }
              label={t('ofm:workflows.editor.required', 'Required')}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={newFieldData.is_hidden}
                  onChange={(e) => setNewFieldData({...newFieldData, is_hidden: e.target.checked})}
                />
              }
              label={t('ofm:workflows.editor.hidden', 'Hidden')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddFieldModalOpen(false)}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleAddFieldSubmit} 
            variant="contained" 
            disabled={!newFieldData.field_name.trim()}
          >
            {t('common:add', 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
