'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AdvancedPermissionsModal from '../../../../../components/AIPlatform/role-management/AdvancedPermissionsModal';
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

import {
  Box,
  Button,
  Card,
  CardContent,
  Snackbar,
  TextField,
  Typography,
  FormControl,
  FormControlLabel,
  CircularProgress,
  Checkbox,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  FormGroup,
  Alert,
  Container
} from '@mui/material';
import {
  Close as CloseIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  UnfoldMore as UnfoldMoreIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';

interface Component {
  id: number;
  component_key: string;
  component: number;
  component_name: string;
  component_description: string;
  is_active: boolean;
}

interface Permission {
  id: number;
  permission_key: string;
  permission: number;
  permission_name: string;
  permission_description: string;
  is_active: boolean;
  components: Component[];
  conditions: any[];
  created_at: string;
  updated_at: string;
}

interface Feature {
  id: number;
  name: string;
  feature_key: string;
  description: string;
  permissions: Permission[];
}

interface Module {
  id: number;
  module_key: string;
  name: string;
  description: string;
  features: Feature[];
}

interface ApiRole {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  app_id: number;
  created_at: string;
  updated_at: string;
  modules: Module[];
}

interface ApiResponse {
  roles: ApiRole[];
}

interface PermissionSelection {
  [key: string]: boolean;
}

interface GroupedPermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  other: boolean;
}

const EditRolePage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant_slug: string; id: string }>(); // Include id in params
  const roleId = params.id ? Number(params.id) : 0;
  
  const [modules, setModules] = useState<Module[]>([]);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionSelection>({});
  const [selectedComponents, setSelectedComponents] = useState<Record<string, boolean>>({});
  const [selectedConditions, setSelectedConditions] = useState<Record<string, number[]>>({}); // permissionId -> conditionIds
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Removed state variables for "Other" permissions modal
  const [activeTab, setActiveTab] = useState<'special' | 'components'>('special');
  const [advancedPermissions, setAdvancedPermissions] = useState<Record<string, any>>({});
  const tenant_slug = useParams().tenant;
  
  // Advanced permissions modal state
  const [advancedPermissionsModalOpen, setAdvancedPermissionsModalOpen] = useState(false);
  const [currentAdvancedPermissionsData, setCurrentAdvancedPermissionsData] = useState<any>(null);
  const [currentModuleKey, setCurrentModuleKey] = useState('');
  const [currentFeatureKey, setCurrentFeatureKey] = useState('');
  const [currentModuleName, setCurrentModuleName] = useState('');
  

  // Extract CRUD operations from permission_key
  const getPermissionType = (permissionKey: string): string => {
    const key = permissionKey.toLowerCase();
    
    if (key.includes('view') || key.includes('read')) return 'view';
    if (key.includes('add') || key.includes('create')) return 'add';
    if (key.includes('edit') || key.includes('update')) return 'edit';
    if (key.includes('delete') || key.includes('remove')) return 'delete';
    
    return ''; // Other permissions no longer shown in separate column
  };
  
  // Group permissions by type for each feature
  const groupPermissions = (permissions: Permission[]): GroupedPermissions => {
    const grouped: GroupedPermissions = {
      view: false,
      add: false,
      edit: false,
      delete: false,
      other: false
    };
    
    permissions.forEach(perm => {
      const type = getPermissionType(perm.permission_key);
      if (type in grouped) {
        grouped[type as keyof GroupedPermissions] = grouped[type as keyof GroupedPermissions] || false;
      } else {
        grouped.other = grouped.other || false;
      }
    });
    
    return grouped;
  };

  // Fetch role data for editing
  const fetchRoleData = useCallback(async () => {
    setError(null);
    
    if (!roleId) {
      setError('No role ID provided');
      return;
    }

    try {
      // Fetch all available modules and permissions first
      const baseUrl = AI_PLATFORM_API_BASE_URL;
      const allModulesResponse = await fetch(`${baseUrl}/${tenant_slug}/tenant/role-management/user/roles/`, {
        headers: {
          ...getAuthHeaders(),
        }
      });
      
      if (!allModulesResponse.ok) {
        throw new Error('Failed to fetch all available modules and permissions');
      }
      
      const allModulesData: ApiResponse = await allModulesResponse.json();
      const allAvailableModules = allModulesData.roles[0]?.modules || [];
      
      // Then fetch the specific role data
      const roleResponse = await fetch(`${baseUrl}/${tenant_slug}/tenant/role-management/role-data/${roleId}/`, {
        headers: {
          ...getAuthHeaders(),
        }
      });
      
      if (!roleResponse.ok) {
        throw new Error('Failed to fetch role data');
      }
      
      const roleData = await roleResponse.json();
      
      // Set basic role information
      setRoleName(roleData.name);
      setRoleDescription(roleData.description || '');
      setIsActive(roleData.is_active);
      setIsDefault(roleData.is_default);
      
      // Initialize permission selections
      const initialPermissions: PermissionSelection = {};
      const initialComponents: Record<string, boolean> = {};
      const initialConditions: Record<string, number[]> = {};
      
      // Process assigned permissions, components, and conditions from role data
      if (roleData.modules && roleData.modules.length > 0) {
        roleData.modules.forEach((module: Module) => {
          module.features?.forEach((feature: Feature) => {
            feature.permissions?.forEach((permission: Permission) => {
              initialPermissions[permission.permission_key] = permission.is_active;
              
              // Process components
              permission.components?.forEach((component: Component) => {
                const componentKey = `${permission.permission_key}_${component.component_key}`;
                initialComponents[componentKey] = component.is_active;
              });
              
              // Process conditions
              if (permission.conditions?.length > 0) {
                initialConditions[permission.permission_key] = permission.conditions
                  .filter((condition: any) => condition.is_active)
                  .map((condition: any) => condition.id);
              }
            });
          });
        });
      }
      
      // Set all available modules for display, ensuring we show everything available to the tenant
      setModules(allAvailableModules);
      
      setSelectedPermissions(initialPermissions);
      setSelectedComponents(initialComponents);
      setSelectedConditions(initialConditions);
      
    } catch (error: any) {
      console.error('Error fetching role data:', error);
      setError(error.message || 'Failed to fetch role data');
    }
  }, [roleId, tenant_slug]);

  // Fetch all available modules and permissions from the API
  const fetchAllModulesAndPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const baseUrl = AI_PLATFORM_API_BASE_URL;
      const response = await fetch(`${baseUrl}/${tenant_slug}/tenant/role-management/user/roles/`, {
        headers: {
          ...getAuthHeaders(),
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch modules and permissions');
      }
      
      const data: ApiResponse = await response.json();
      const allModules = data.roles[0]?.modules || [];
      
      // Store all available modules for later display
      return allModules;
      
    } catch (error: any) {
      console.error('Error fetching modules and permissions:', error);
      setError(error.message || 'Failed to fetch modules and permissions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [tenant_slug]);

  // Load role data and all available features on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      
      // First get all available modules and permissions
      const allAvailableModules = await fetchAllModulesAndPermissions();
      
      // Then fetch the specific role data
      await fetchRoleData();
      
      // If role data fetch didn't set modules (e.g., because the role has no permissions yet),
      // use all available modules instead
      if (allAvailableModules.length > 0 && (!modules || modules.length === 0)) {
        setModules(allAvailableModules);
      }
      
      setIsLoading(false);
    };
    
    loadAllData();
  }, [fetchRoleData, fetchAllModulesAndPermissions]);

  // Handle permission selection
  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionKey]: checked
    }));
  };

  // Handle component selection
  const handleComponentChange = (componentKey: string, checked: boolean) => {
    setSelectedComponents(prev => ({
      ...prev,
      [componentKey]: checked
    }));
  };

  // Save role changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (!roleName.trim()) {
      setError('Role name is required');
      setIsLoading(false);
      return;
    }
    
    try {
      const baseUrl = AI_PLATFORM_API_BASE_URL;
      const response = await fetch(`${baseUrl}/${tenant_slug}/tenant/role-management/roles/${roleId}/`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
          is_active: isActive,
          is_default: isDefault,
          app_id: parseInt(localStorage.getItem('app_id') || '0'),
          permissions: Object.keys(selectedPermissions).map(key => ({
            permission_key: key,
            is_active: selectedPermissions[key],
            components: Object.keys(selectedComponents)
              .filter(compKey => compKey.startsWith(`${key}_`))
              .map(compKey => ({
                component_key: compKey.replace(`${key}_`, ''),
                is_active: selectedComponents[compKey]
              })),
            conditions: selectedConditions[key] || []
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update role');
      }
      
      setSuccessMessage('Role updated successfully');
      setSnackbarMessage('Role updated successfully');
      setSnackbarOpen(true);
      
      // Navigate back to roles list after success
      setTimeout(() => {
        router.push(`/${tenant_slug}/Crm/ai-platform/role-management`);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error updating role:', error);
      setError(error.message || 'Failed to update role');
      setSnackbarMessage('Error updating role');
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed "Other" permissions modal handlers

  // Handle advanced permissions button click
  const handleAdvancedPermissionsClick = (module: Module, feature: Feature) => {
    setCurrentModuleKey(module.module_key);
    setCurrentFeatureKey(feature.feature_key);
    setCurrentModuleName(module.name);
    
    // Get all active permissions for this feature
    const activePermissions = feature.permissions.filter(permission => 
      selectedPermissions[permission.permission_key] === true
    );
    
    // Extract all components from feature permissions
    const components = feature.permissions
      .flatMap(p => p.components?.map(comp => ({
        ...comp,
        sourcePermissionKey: p.permission_key // Add the source permission key for reference
      })) || [])
      .map(comp => {
        // Create the component key for tracking selections - must match the format used in handleSaveAdvancedPermissions
        const componentKey = `${comp.sourcePermissionKey}_${comp.component_key}`;
        
        // Debug the component selection state
        console.log(`Component ${comp.component_name} (${componentKey}):`, {
          isSelected: selectedComponents[componentKey] === true,
          keyInState: Object.keys(selectedComponents).includes(componentKey),
          allKeys: Object.keys(selectedComponents)
        });
        
        return {
          id: comp.component_key,
          permission_key: comp.sourcePermissionKey, // Store the source permission key
          name: comp.component_name,
          description: comp.component_description || '',
          // Check if this specific component is selected in our state
          checked: selectedComponents[componentKey] === true,
          is_active: comp.is_active
        };
      });
    
    // Extract special actions (permissions beyond basic CRUD)
    const specialActions = feature.permissions
      .filter(p => {
        const permKey = p.permission_key?.toLowerCase() || '';
        // Filter out standard CRUD operations
        const isNotCrud = !['view', 'list', 'create', 'add', 'edit', 'update', 'delete', 'remove']
          .some(op => permKey.includes(op));
        return isNotCrud;
      })
      .map(p => ({
        id: p.permission_key,
        name: p.permission_name,
        description: p.permission_description || '',
        // Set checked based on if it's selected in our state
        checked: selectedPermissions[p.permission_key] || false,
        permission_id: p.id,
        is_active: p.is_active
      }));
    
    // Extract data access conditions
    const dataAccessConditions = feature.permissions
      .flatMap(p => (p.conditions || [])
        .map(cond => ({
          id: cond.condition_key || `condition_${cond.id}`,
          condition_key: cond.condition_key,
          condition_id: cond.id,
          name: cond.condition_name,
          description: cond.condition_description || '',
          // Set selected values based on our state
          value: selectedConditions[p.permission_key] || [],
          is_active: cond.is_active
        }))
      );
    
    // Get permissions with their conditions
    const permissionsWithConditions = activePermissions
      .filter(p => p.conditions && p.conditions.length > 0)
      .map(p => ({
        id: p.id,
        permission_key: p.permission_key,
        permission_name: p.permission_name,
        permission_description: p.permission_description || '',
        is_active: p.is_active,
        conditions: (p.conditions || []).map(c => ({
          id: c.condition_key || `condition_${c.id}`,
          condition_key: c.condition_key,
          condition_id: c.id,
          name: c.condition_name,
          description: c.condition_description || '',
          value: selectedConditions[p.permission_key] || [],
          is_active: c.is_active
        }))
      }));
    
    // Set the data for the advanced permissions modal
    setCurrentAdvancedPermissionsData({
      module,
      feature,
      selectedPermissions,
      selectedComponents,
      selectedConditions,
      // Add structured data for the advanced modal
      components,
      specialActions,
      dataAccessConditions,
      permissionsWithConditions
    });
    
    setAdvancedPermissionsModalOpen(true);
  };

  // Save advanced permissions
  const handleSaveAdvancedPermissions = (data: any) => {
    console.log('Advanced permissions data from modal:', data);
    
    // Update selected special actions/permissions
    if (data.specialActions && Array.isArray(data.specialActions)) {
      const specialActionUpdates: Record<string, boolean> = {};
      
      data.specialActions.forEach((action: any) => {
        if (action && action.id) {
          specialActionUpdates[action.id] = !!action.checked;
        }
      });
      
      setSelectedPermissions(prev => ({
        ...prev,
        ...specialActionUpdates
      }));
    }
    
    // Update selected components
    if (data.components && Array.isArray(data.components)) {
      const componentUpdates: Record<string, boolean> = {};
      
      data.components.forEach((component: any) => {
        // Make sure we have both the permission key and component id
        if (component && component.id && component.permission_key) {
          // Create consistent component key format using permission_key + component_id
          const componentKey = `${component.permission_key}_${component.id}`;
          
          // Store the updated selection state
          componentUpdates[componentKey] = !!component.checked;
          
          // For debugging
          console.log(`Component ${component.name} (${componentKey}) set to ${!!component.checked}`);
        } else {
          console.warn('Missing permission_key or id in component', component);
        }
      });
      
      // Merge the new component selections with existing ones
      setSelectedComponents(prev => {
        const updated = {
          ...prev,
          ...componentUpdates
        };
        
        console.log('Updated component selections:', updated);
        return updated;
      });
    }
    
    // Update selected conditions with their values
    if (data.permissionsWithConditions && Array.isArray(data.permissionsWithConditions)) {
      const conditionUpdates: Record<string, any[]> = {};
      
      data.permissionsWithConditions.forEach((permission: any) => {
        if (permission && permission.permission_key && permission.conditions) {
          // Collect all condition values for this permission
          const conditionValues: any[] = [];
          
          permission.conditions.forEach((condition: any) => {
            if (condition && condition.value) {
              // Add each condition value to the array
              if (Array.isArray(condition.value)) {
                conditionValues.push(...condition.value);
              } else {
                conditionValues.push(condition.value);
              }
            }
          });
          
          // Store all condition values for this permission
          conditionUpdates[permission.permission_key] = conditionValues;
        }
      });
      
      setSelectedConditions(prev => ({
        ...prev,
        ...conditionUpdates
      }));
    }
    
    // Close the modal
    setAdvancedPermissionsModalOpen(false);
    
    // Show success notification
    setSnackbarMessage('Advanced permissions updated');
    setSnackbarOpen(true);
  };

  // Individual permission selection only - removed group toggles

  // Render loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="500px">
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box mt={4}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => router.push(`/${tenant_slug}/Crm/ai-platform/role-management`)}
          sx={{ mt: 2 }}
        >
          Back to Roles
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <form onSubmit={handleSubmit}>
        <Box mb={4} display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" component="h1" gutterBottom>
            {t('Edit Role')}
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => router.push(`/${tenant_slug}/Crm/ai-platform/role-management`)}
              type="button"
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : t('Save Changes')}
            </Button>
          </Box>
        </Box>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('Basic Information')}
            </Typography>
            
            <TextField
              label={t('Role Name')}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            
            <TextField
              label={t('Description')}
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />
            
            <Box mt={2}>
              <FormControlLabel
                control={<Checkbox 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)} 
                />}
                label={t('Active')}
              />
              
              <FormControlLabel
                control={<Checkbox 
                  checked={isDefault} 
                  onChange={(e) => setIsDefault(e.target.checked)} 
                />}
                label={t('Default Role')}
              />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              {t('Permissions')}
              <Tooltip title={t('Select which actions this role can perform')}>
                <IconButton size="small" sx={{ ml: 1 }}>
                  <HelpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="25%">{t('Feature')}</TableCell>
                    <TableCell align="center">{t('View')}</TableCell>
                    <TableCell align="center">{t('Add')}</TableCell>
                    <TableCell align="center">{t('Edit')}</TableCell>
                    <TableCell align="center">{t('Delete')}</TableCell>
                    <TableCell align="center">{t('Advanced')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modules.map((module) => (
                    <React.Fragment key={module.module_key}>
                      {/* Feature Rows */}
                      {module.features && module.features.length > 0 ? (
                        module.features.map((feature) => (
                          <TableRow key={feature.feature_key}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Checkbox
                                  checked={feature.permissions.some(p => !!selectedPermissions[p.permission_key])}
                                  onChange={(e) => {
                                    // Handle feature-level checkbox toggle
                                    const isChecked = e.target.checked;
                                    const permissionUpdates: Record<string, boolean> = {};
                                    let componentUpdates: Record<string, boolean> | null = null;
                                    
                                    // Extract special actions for this feature
                                    const specialActions = feature.permissions
                                      .filter(p => {
                                        const permKey = p.permission_key?.toLowerCase() || '';
                                        // Filter for special operations (non-standard CRUD)
                                        const isNotCrud = !['view', 'list', 'create', 'add', 'edit', 'update', 'delete', 'remove']
                                          .some(op => permKey.includes(op));
                                        return isNotCrud;
                                      });
                                    
                                    // Toggle all permissions under this feature
                                    feature.permissions.forEach(permission => {
                                      permissionUpdates[permission.permission_key] = isChecked;
                                      
                                      // Initialize component updates object if needed
                                      if (!componentUpdates) componentUpdates = {};
                                      
                                      // Get all component keys for this permission
                                      if (isChecked) {
                                        // If checking the feature, check all associated components
                                        // Find all components for this specific permission
                                        if (permission.components && permission.components.length > 0) {
                                          permission.components.forEach(comp => {
                                            if (comp && comp.component_key) {
                                              // Create the component key in the same format used elsewhere
                                              const componentKey = `${permission.permission_key}_${comp.component_key}`;
                                              componentUpdates![componentKey] = true;
                                            }
                                          });
                                          console.log(`Set ${permission.components.length} components for permission ${permission.permission_key}`);
                                        }
                                      } else {
                                        // If unchecking the feature, uncheck all components for this permission
                                        Object.keys(selectedComponents).forEach(componentKey => {
                                          // Component keys are in format "permission_key_component_key"
                                          if (componentKey.startsWith(permission.permission_key + '_')) {
                                            componentUpdates![componentKey] = false;
                                          }
                                        });
                                      }
                                    });
                                    
                                    // Log special actions being set
                                    if (specialActions.length > 0) {
                                      console.log(`Setting ${specialActions.length} special actions for ${feature.name} to ${isChecked}:`, 
                                        specialActions.map(a => a.permission_key));
                                    }
                                    
                                    // Update permissions state (includes both regular and special actions)
                                    setSelectedPermissions(prev => ({
                                      ...prev,
                                      ...permissionUpdates
                                    }));
                                    
                                    // Update components state if needed
                                    if (componentUpdates) {
                                      setSelectedComponents(prev => ({
                                        ...prev,
                                        ...componentUpdates
                                      }));
                                      
                                      if (isChecked) {
                                        console.log(`Set components for feature: ${feature.name}`);
                                      } else {
                                        console.log(`Cleared components for feature: ${feature.name}`);
                                      }
                                    }
                                  }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {feature.name || feature.feature_key}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            {/* CRUD permission columns */}
                            {(['view', 'add', 'edit', 'delete'] as const).map(type => {
                              // Get permissions of this type for this feature
                              const permissions = feature.permissions.filter(
                                p => getPermissionType(p.permission_key) === type
                              );
                              
                              return (
                                <TableCell key={type} align="center">
                                  {permissions.length > 0 ? (
                                    permissions.map(permission => (
                                      <Tooltip key={permission.permission_key} title={permission.permission_name || permission.permission_key}>
                                        <Checkbox
                                          checked={!!selectedPermissions[permission.permission_key]}
                                          onChange={(e) => handlePermissionChange(permission.permission_key, e.target.checked)}
                                        />
                                      </Tooltip>
                                    ))
                                  ) : (
                                    <span>—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            
                            {/* Advanced settings column */}
                            <TableCell align="center">
                              <Tooltip title={t('Configure advanced settings')}>
                                <IconButton 
                                  onClick={() => handleAdvancedPermissionsClick(module, feature)} 
                                  size="small">
                                  <SettingsIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="textSecondary">
                              {t('No features available for this module')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {modules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          {t('No modules or permissions available')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        

      </form>
      
      {/* Removed "Other" Permissions Dialog */}
      
      {/* Advanced Permissions Modal */}
      {advancedPermissionsModalOpen && currentAdvancedPermissionsData && (
        <AdvancedPermissionsModal
          open={advancedPermissionsModalOpen}
          onClose={() => setAdvancedPermissionsModalOpen(false)}
          permissionsData={currentAdvancedPermissionsData}
          onSave={handleSaveAdvancedPermissions}
          moduleName={currentModuleName}
          featureName={currentAdvancedPermissionsData.feature.name}
          moduleKey={currentModuleKey}
          featureKey={currentFeatureKey}
        />
      )}
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSnackbarOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
      
      {/* Success message */}
      {successMessage && (
        <Snackbar
          open={true}
          autoHideDuration={5000}
          onClose={() => setSuccessMessage(null)}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success">
            {successMessage}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
};

export default EditRolePage;