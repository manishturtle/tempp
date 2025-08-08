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
  Tooltip,
  SxProps,
  Theme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ApprovalIcon from '@mui/icons-material/HowToReg';
import DecisionIcon from '@mui/icons-material/CallSplit';
import NotificationIcon from '@mui/icons-material/Notifications';
import IntegrationIcon from '@mui/icons-material/Api';

interface Template {
  id: string;
  display_name: string;
  system_name: string;
  description: string;
  category: string;
  icon?: string;
  fields?: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    default_value?: any;
  }>;
}

interface TemplateSidebarProps {
  templates: Template[];
}

const getTemplateIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'approval':
      return <ApprovalIcon />;
    case 'decision':
      return <DecisionIcon />;
    case 'notification':
      return <NotificationIcon />;
    case 'integration':
      return <IntegrationIcon />;
    default:
      return <AssignmentIcon />;
  }
};

const TemplateSidebar: React.FC<TemplateSidebarProps> = ({ templates }) => {
  const { t } = useTranslation('ofm');

  const onDragStart = (event: React.DragEvent, template: Template) => {
    try {
      // Set the template ID for node type identification
      event.dataTransfer.setData('application/reactflow', template.id);
      
      // Set the full template data as JSON
      // Make sure to include all necessary properties for proper display
      const templateData = {
        id: template.id,
        display_name: template.display_name, // Keep original display_name for proper rendering
        name: template.display_name,
        template_id: template.id,
        description: template.description,
        system_name: template.system_name,
        fields: template.fields || [],
      };
      event.dataTransfer.setData('application/json', JSON.stringify(templateData));
      
      // Set move effect
      event.dataTransfer.effectAllowed = 'move';
    } catch (error) {
      console.error('Error setting drag data:', error);
    }
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <Box sx={{ p: 2, height: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('ofm.workflows.editor.templates')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('ofm.workflows.editor.dragTemplateInstruction')}
      </Typography>

      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, px: 2 }}
          >
            {t(`ofm.workflows.editor.categories.${category.toLowerCase()}`)}
          </Typography>

          <Paper variant="outlined">
            <List dense disablePadding>
              {categoryTemplates.map((template) => (
                <ListItem key={template.id} disablePadding>
                  <Tooltip
                    title={template.description}
                    placement="right"
                    arrow
                  >
                    <ListItemButton
                      draggable
                      onDragStart={(e) => onDragStart(e, template)}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {getTemplateIcon(template.category)}
                      </ListItemIcon>
                      <ListItemText
                        primary={template.display_name}
                        primaryTypographyProps={{
                          variant: 'body2',
                        }}
                      />
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default TemplateSidebar;
