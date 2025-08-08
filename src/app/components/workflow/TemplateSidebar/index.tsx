'use client';

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
  Skeleton,
  Alert,
  BoxProps,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  QrCode as QrCodeIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useGetPredefinedTemplates } from '@/app/hooks/api/ofm/useWorkflowQueries';
import type { Template } from '@/app/types/ofm';

export interface TemplateSidebarProps {
  templates?: Template[];
  sx?: SxProps<Theme>;
}

const TEMPLATE_ICONS = {
  'PICKING_INFO': LocalShippingIcon,
  'QA_CHECK': AssignmentTurnedInIcon,
  'INVENTORY_CHECK': InventoryIcon,
  'BARCODE_SCAN': QrCodeIcon,
  'APPROVAL_TASK': CheckCircleIcon,
} as const;

const getTemplateIcon = (template: Template | undefined) => {
  if (!template?.system_name) {
    return <AssignmentIcon />;
  }

  const systemName = template.system_name.toUpperCase();
  const IconComponent = TEMPLATE_ICONS[systemName as keyof typeof TEMPLATE_ICONS] || AssignmentIcon;
  return <IconComponent />;
};

export default function TemplateSidebar({ templates: propTemplates, sx }: TemplateSidebarProps) {
  const { t } = useTranslation('ofm');
  const { data: templatesData, isLoading, error } = useGetPredefinedTemplates();
  
  // Use provided templates or fall back to fetched templates
  const templates = propTemplates || (templatesData?.results || []).map(template => ({
    ...template,
    id: String(template.id),
    category: template.category || 'DEFAULT',
    description: template.description || '',
    fields: template.fields.map(field => ({
      id: String(field.id),
      name: field.default_label,
      type: field.field_type,
      required: field.default_is_mandatory,
      default_value: field.default_options?.[0]
    }))
  }));

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>, template: Template) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      templateId: template.id,
      templateName: template.display_name,
      templateSystemName: template.system_name,
      description: template.description || '',
      fields: template.fields,
      type: 'template'
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  if (isLoading && !propTemplates) {
    return (
      <Box component={Paper} sx={sx}>
        <Typography variant="h6" sx={{ p: 2 }}>
          {t('workflow.templates.title')}
        </Typography>
        <List>
          {[1, 2, 3].map((i) => (
            <ListItem key={i} disablePadding>
              <Skeleton variant="rectangular" height={48} width="100%" />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  if (error && !propTemplates) {
    return (
      <Box component={Paper} sx={sx}>
        <Alert severity="error">
          {t('workflow.templates.error')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box component={Paper} sx={sx}>
      <Typography variant="h6" sx={{ p: 2 }}>
        {t('workflow.templates.title')}
      </Typography>
      <List>
        {templates.map((template) => (
          <ListItem
            key={template.id}
            disablePadding
            draggable
            onDragStart={(e) => handleDragStart(e, template)}
            sx={{
              cursor: 'grab',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <ListItemButton>
              <ListItemIcon>
                {getTemplateIcon(template)}
              </ListItemIcon>
              <ListItemText
                primary={template.display_name}
                secondary={template.description}
                primaryTypographyProps={{
                  variant: 'subtitle2',
                  noWrap: true,
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  noWrap: true,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
