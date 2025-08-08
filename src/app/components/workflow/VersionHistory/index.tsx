'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  History as HistoryIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useWorkflowVersions } from '@/hooks/api/ofm';

interface VersionHistoryProps {
  workflowId: string;
  onVersionSelect: (versionId: string) => void;
}

const VersionHistory = ({ workflowId, onVersionSelect }: VersionHistoryProps) => {
  const { t } = useTranslation('ofm');
  const { data: versionsResponse, isLoading } = useWorkflowVersions(workflowId);

  const versions = versionsResponse?.results || [];

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">
          {t('workflow.editor.versions.loading')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'grey.500' }}>
        {t('workflow.editor.versions.title')}
      </Typography>
      <Divider />
      <List>
        {versions.map((version) => (
          <ListItem
            key={version.id}
            component="div"
            sx={{
              py: 1,
              '&:hover': {
                bgcolor: 'action.hover',
                '& .version-actions': {
                  visibility: 'visible',
                },
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {t('workflow.editor.versions.version', { number: version.version_number })}
                  </Typography>
                  {version.is_current && (
                    <Chip
                      size="small"
                      color="primary"
                      label={t('workflow.editor.versions.current')}
                    />
                  )}
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" display="block">
                    {version.description || t('workflow.editor.versions.noDescription')}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {t('workflow.editor.versions.created', {
                      date: format(new Date(version.created_at), 'PPpp'),
                    })}
                  </Typography>
                </Box>
              }
            />
            <ListItemSecondaryAction
              className="version-actions"
              sx={{ visibility: 'hidden' }}
            >
              <IconButton
                edge="end"
                size="small"
                onClick={() => onVersionSelect(version.id)}
                aria-label={t('workflow.editor.versions.edit')}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default VersionHistory;
