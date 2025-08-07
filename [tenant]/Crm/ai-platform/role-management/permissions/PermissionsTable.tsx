import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface Permission {
  id: number;
  is_active: boolean;
  components: Array<{
    id: number;
    name: string;
    description: string;
    is_active: boolean;
  }>;
  conditions: any[];
  permission_key: string;
  permission_name: string;
  permission_description: string;
  read_only?: boolean;
  category?: string;
  feature_name?: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  permissions: Permission[];
}

interface PermissionsTableProps {
  role: Role;
}

const PermissionItem: React.FC<{ permission: Permission }> = ({ permission }) => {
  return (
    <Box>
      <ListItem sx={{ px: 0, py: 1 }}>
        <ListItemIcon sx={{ minWidth: 32 }}>
          {permission.is_active ? (
            <CheckCircleIcon color="success" fontSize="small" />
          ) : (
            <CancelIcon color="disabled" fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText 
          primary={
            <Typography variant="body2" fontWeight={500}>
              {permission.permission_name}
            </Typography>
          }
          secondary={
            permission.permission_description && (
              <Typography variant="caption" color="text.secondary">
                {permission.permission_description}
              </Typography>
            )
          }
          sx={{ my: 0.5 }}
        />
      </ListItem>
      
      {permission.components && permission.components.length > 0 && (
        <Box pl={6} pr={2} pb={1}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Components:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {permission.components.map(component => (
              <Chip 
                key={component.id}
                label={component.name}
                size="small"
                color={component.is_active ? 'primary' : 'default'}
                variant={component.is_active ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

const PermissionsTable: React.FC<PermissionsTableProps> = ({ role }) => {
  if (!role) {
    return (
      <Typography variant="body2" color="text.secondary">
        No role data available
      </Typography>
    );
  }

  // Early return if no permissions
  if (!role.permissions || role.permissions.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No permissions available for this role
      </Typography>
    );
  }

  // Ensure we have valid permissions data
  const safePermissions = Array.isArray(role.permissions) ? role.permissions : [];
  
  if (safePermissions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No permissions found for this role.
        </Typography>
      </Paper>
    );
  }

  // Group permissions by feature
  const permissionsByFeature = safePermissions.reduce<Record<string, typeof safePermissions>>((groups, permission) => {
    if (!permission) return groups;
    
    const feature = permission.feature_name || 'General';
    if (!groups[feature]) {
      groups[feature] = [];
    }
    
    // Ensure components is an array
    const permissionWithSafeComponents = {
      ...permission,
      components: Array.isArray(permission.components) ? permission.components : []
    };
    
    groups[feature].push(permissionWithSafeComponents);
    return groups;
  }, {});

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <List disablePadding>
        {Object.entries(permissionsByFeature).map(([feature, permissions]) => (
          <React.Fragment key={feature}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary"
              sx={{ 
                mt: 1, 
                mb: 0.5,
                pl: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem'
              }}
            >
              {feature}
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                mb: 2,
                bgcolor: 'background.default',
                borderRadius: 1
              }}
            >
              <List disablePadding>
                {permissions.map((permission) => (
                  <React.Fragment key={permission.id}>
                    <PermissionItem permission={permission} />
                    {permission !== permissions[permissions.length - 1] && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default PermissionsTable;
