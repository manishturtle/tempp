'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePredefinedTemplates } from '@/hooks/api/ofm';
import type { PredefinedTemplate } from '@/types/ofm';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'start_task': <PlayArrowIcon color="primary" />,
  'end_task': <StopIcon color="error" />,
  'process_task': <AssignmentIcon color="action" />,
  'decision_task': <AccountTreeIcon color="warning" />,
  'approval_task': <CheckCircleIcon color="success" />,
};

interface TemplateSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PredefinedTemplate) => void;
}

export default function TemplateSelectionModal({
  open,
  onClose,
  onSelect,
}: TemplateSelectionModalProps) {
  const { t } = useTranslation('ofm');
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedTemplate | null>(null);
  const { data: templatesResponse, isLoading, isError } = usePredefinedTemplates();

  const templates = templatesResponse?.results || [];

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="template-selection-dialog-title"
    >
      <DialogTitle id="template-selection-dialog-title">
        {t('workflow.editor.selectTemplate.title')}
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('workflow.editor.selectTemplate.error')}
          </Alert>
        )}

        {!isLoading && !isError && (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('workflow.editor.selectTemplate.description')}
            </Typography>
            <List sx={{ width: '100%' }}>
              {templates.map((template) => (
                <React.Fragment key={template.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={selectedTemplate?.id === template.id}
                      onClick={() => setSelectedTemplate(template)}
                      sx={{
                        borderRadius: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ListItemIcon>
                        {TEMPLATE_ICONS[template.system_name] || <AssignmentIcon />}
                      </ListItemIcon>
                      <ListItemText
                        primary={template.display_name}
                        secondary={template.description}
                        primaryTypographyProps={{
                          fontWeight: selectedTemplate?.id === template.id ? 'bold' : 'normal',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSelect}
          disabled={!selectedTemplate}
          variant="contained"
          color="primary"
        >
          {t('common.select')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
