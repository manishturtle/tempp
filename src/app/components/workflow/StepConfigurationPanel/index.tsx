'use client';

import React from 'react';
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
  Card,
  CardContent,
  Divider,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { Node } from 'reactflow';

interface FieldConfig {
  id: string;
  label: string;
  type: string;
  isCustom: boolean;
  isMandatory: boolean;
  isHidden: boolean;
  options?: string[];
}

interface NotificationLink {
  cnsTemplateId: string;
}

interface StepConfigurationPanelProps {
  selectedNodeData: Node['data'] | null;
  onUpdateStepName: (stepId: string, newName: string) => void;
  onUpdateFieldConfig: (stepId: string, fieldIdOrTempId: string, configChanges: Partial<FieldConfig>) => void;
  onAddCustomField: (stepId: string, newFieldData: NewCustomFieldData) => void;
  onRemoveCustomField: (stepId: string, fieldIdOrTempId: string) => void;
  onUpdateNotificationLinks: (stepId: string, newLinks: { cnsTemplateId: string }[]) => void;
  onConfigureNotesFlag: (stepId: string, config: { notesEnabled: boolean; flagEnabled: boolean }) => void;
}

interface NewCustomFieldData {
  label: string;
  type: string;
  options?: string[];
}

export default function StepConfigurationPanel({
  selectedNodeData,
  onUpdateStepName,
  onUpdateFieldConfig,
  onAddCustomField,
  onRemoveCustomField,
  onUpdateNotificationLinks,
  onConfigureNotesFlag,
}: StepConfigurationPanelProps) {
  const { t } = useTranslation('ofm');

  if (!selectedNodeData) {
    return (
      <Box
        component={Paper}
        sx={{
          height: '100%',
          width: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: 1,
          borderColor: 'divider',
        }}
      >
        <Typography color="text.secondary">
          {t('ofm.workflows.editor.selectStepPrompt')}
        </Typography>
      </Box>
    );
  }

  const {
    id: stepId,
    stepName,
    baseTemplateName,
    configuredFields = [],
    notificationLinks = [],
    notesEnabled = false,
    flagEnabled = false,
  } = selectedNodeData;

  const handleStepNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateStepName(stepId, event.target.value);
  };

  const handleFieldConfigChange = (fieldId: string, changes: Partial<FieldConfig>) => {
    onUpdateFieldConfig(stepId, fieldId, changes);
  };

  const handleNotesAndFlagChange = (key: 'notesEnabled' | 'flagEnabled') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onConfigureNotesFlag(stepId, {
      notesEnabled: key === 'notesEnabled' ? event.target.checked : notesEnabled,
      flagEnabled: key === 'flagEnabled' ? event.target.checked : flagEnabled,
    });
  };

  return (
    <Box
      component={Paper}
      sx={{
        height: '100%',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('ofm.workflows.editor.configureStep')}
        </Typography>

        <TextField
          fullWidth
          label={t('ofm.workflows.editor.stepName')}
          value={stepName}
          onChange={handleStepNameChange}
          margin="normal"
          size="small"
        />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          {t('ofm.workflows.editor.baseTemplate')}: {baseTemplateName}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{t('ofm.workflows.editor.fieldsTitle')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {configuredFields.map((field) => (
              <Card key={field.id} variant="outlined" sx={{ mb: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2">{field.label}</Typography>
                    {field.isCustom && (
                      <IconButton
                        size="small"
                        onClick={() => onRemoveCustomField(stepId, field.id)}
                        aria-label={t('ofm.workflows.editor.removeField')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={field.isMandatory}
                        onChange={(e) =>
                          handleFieldConfigChange(field.id, { isMandatory: e.target.checked })
                        }
                      />
                    }
                    label={t('ofm.workflows.editor.mandatory')}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={!field.isHidden}
                        onChange={(e) =>
                          handleFieldConfigChange(field.id, { isHidden: !e.target.checked })
                        }
                      />
                    }
                    label={t('ofm.workflows.editor.visible')}
                  />
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                // TODO: Implement custom field dialog
                onAddCustomField(stepId, {
                  label: 'New Field',
                  type: 'TEXT',
                });
              }}
              sx={{ mt: 1 }}
            >
              {t('ofm.workflows.editor.addCustomField')}
            </Button>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{t('ofm.workflows.editor.notesFlagTitle')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={notesEnabled}
                  onChange={handleNotesAndFlagChange('notesEnabled')}
                />
              }
              label={t('ofm.workflows.editor.enableNotes')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={flagEnabled}
                  onChange={handleNotesAndFlagChange('flagEnabled')}
                />
              }
              label={t('ofm.workflows.editor.enableFlag')}
            />
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{t('ofm.workflows.editor.notificationsTitle')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {/* TODO: Implement NotificationLinker component */}
            <Typography variant="body2" color="text.secondary">
              {t('ofm.workflows.editor.notificationsComingSoon')}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}
