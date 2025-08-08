'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  Tooltip,
  Checkbox,
  Switch,
  TextField,
  Select,
  MenuItem,
  SelectChangeEvent,
  ListSubheader,
  IconButton,
} from '@mui/material';

import {
  Save as SaveIcon,
  Close as CloseIcon,
  Rule as RuleIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  Key as KeyIcon,
} from '@mui/icons-material';

// Basic types for condition dropdown options
type ConditionValue = {
  id: string;
  name: string;
};

// Component represents a UI element that can be toggled on/off for a permission
type Component = {
  id: string;
  name: string;
  description?: string;
  checked?: boolean;
  permission_key?: string;
  is_active?: boolean;
  type?: string;
};

// Special actions are permissions beyond standard CRUD
interface SpecialAction {
  id: string;
  name: string;
  description?: string;
  checked?: boolean;
  is_active?: boolean;
  type?: string;
  permission_id?: number;
  key?: string;
};

// Represents a condition that can filter access (like department, region, etc.)
type DataAccessCondition = {
  id: string;
  condition_key?: string;
  condition_id?: number;
  name: string;
  condition_name?: string;
  description?: string;
  condition_description?: string;
  value?: string[];
  dropdown_source?: string;
  type?: string;
  is_active?: boolean;
};

// Complete permission with its conditions
type Permission = {
  id: number;
  permission_key: string;
  permission_name: string;
  permission_description: string;
  is_active: boolean;
  conditions: DataAccessCondition[];
};

// Structure for dropdown options
type ConditionDropdown = {
  conditionKey: string;
  name: string;
  description?: string;
  values: string[];
  options: ConditionValue[];
  dropdown_source?: string; // Source identifier for fetching dropdown options
};

// Data passed from role add/edit page
interface AdvancedPermissionsData {
  moduleName: string;
  featureName: string;
  moduleKey: string;
  featureKey: string;
  components: Component[];
  specialActions: SpecialAction[];
  dataAccessConditions: DataAccessCondition[];
  permissionsWithConditions?: Permission[];
}

interface AdvancedPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (updatedPermissionsData: any) => void;
  moduleKey: string;
  featureKey: string;
  moduleName: string;
  featureName: string;
  permissionsData: AdvancedPermissionsData | null;
}

const AdvancedPermissionsModal: React.FC<AdvancedPermissionsModalProps> = ({
  open,
  onClose,
  onSave,
  moduleKey,
  featureKey,
  moduleName,
  featureName,
  permissionsData,
}) => {
  const { t } = useTranslation();
  
  // State for permission conditions - this will store all conditions from all permissions
  const [permissionsWithConditions, setPermissionsWithConditions] = useState<Permission[]>([]);
  
  // State for condition dropdowns - this will be dynamically generated based on unique conditions
  const [conditionDropdowns, setConditionDropdowns] = useState<Record<string, ConditionDropdown>>({});
  
  // State for conditions
  const [dataAccessConditions, setDataAccessConditions] = useState<DataAccessCondition[]>([]);
  
  // State for dropdown options fetched from API - organized by condition key
  const [conditionOptions, setConditionOptions] = useState<Record<string, ConditionValue[]>>({});

  // State for tracking API loading status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showAllComponents, setShowAllComponents] = useState<boolean>(true);
  const [visibleComponents, setVisibleComponents] = useState<Component[]>([]);
  const [specialActions, setSpecialActions] = useState<SpecialAction[]>([]);

  // Function to fetch dropdown options from the API
//   const fetchConditionOptions = async (conditionKeys: string[]) => {
//     if (!conditionKeys.length) return {};
    
//     const options: Record<string, ConditionValue[]> = {};
//     const token = localStorage.getItem('token');
//     const tenantSlug = window.location.pathname.split('/')[1]; // Extract tenant slug from URL
    
//     try {
//       setIsLoading(true);
//       setApiError(null);
      
//       // Fetch options for each condition key
//       const fetchPromises = conditionKeys.map(async (key) => {
//         try {
//           const response = await fetch(
//             `http://localhost:8025/api/${tenantSlug}/tenant/role-management/record-access-rules/dropdown/?condition_key=${key}`,
//             {
//               headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//               },
//             }
//           );
          
//           if (!response.ok) {
//             throw new Error(`Failed to fetch options for ${key}`);
//           }
          
//           const data = await response.json();
//           // Transform API response to match ConditionValue[] format
//           options[key] = data.results || [];
//         } catch (error) {
//           console.error(`Error fetching options for ${key}:`, error);
//           // Return empty array if there's an error
//           options[key] = [];
//         }
//       });
      
//       await Promise.all(fetchPromises);
//       return options;
//     } catch (error) {
//       console.error('Error in fetchConditionOptions:', error);
//       setApiError('Failed to load condition options. Please try again later.');
//       return {};
//     } finally {
//       setIsLoading(false);
//     }
//   };

const fetchConditionOptions = async (conditionKeys: string[]) => {
    if (!conditionKeys.length) return {};
    
    const options: Record<string, ConditionValue[]> = {};
    const token = localStorage.getItem('access_token');
    const tenantSlug = window.location.pathname.split('/')[1];
    
    try {
      setIsLoading(true);
      setApiError(null);
      
      // Fetch options for all condition keys at once
      const conditionKeyParams = conditionKeys.join(',');
      const response = await fetch(
        `http://localhost:8025/api/${tenantSlug}/tenant/role-management/record-access-rules/dropdown/?condition_key=${conditionKeyParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch options: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the response to extract options for each condition key
      conditionKeys.forEach(key => {
        // Try to get options from the conditions object first
        if (data.conditions && data.conditions[key]) {
          options[key] = data.conditions[key].map((item: any) => ({
            id: String(item.id),
            name: item.name
          }));
        } 
        // Fall back to checking tables if not found in conditions
        else if (data && typeof data === 'object' && 'tables' in data && data.tables) {
          // Find the table that contains this condition
          // Safely access nested properties with proper type checking
          const tables = data && typeof data === 'object' && 'tables' in data ? data.tables as Record<string, any> : {};
          const tableEntry = Object.values(tables).find((table: any) => 
            table && table.conditions?.some((cond: any) => cond && cond.condition_key === key)
          );
          
          if (tableEntry && tableEntry.data) {
            options[key] = (tableEntry.data || []).map((item: any) => ({
              id: String(item.id || ''),
              name: item.name || ''
            }));
          } else {
            console.warn(`No options found for condition key: ${key}`);
            options[key] = [];
          }
        } else {
          console.warn(`No options found for condition key: ${key}`);
          options[key] = [];
        }
      });
      
      return options;
      
    } catch (error) {
      console.error('Error in fetchConditionOptions:', error);
      setApiError('Failed to load condition options. Please try again later.');
      return {};
    } finally {
      setIsLoading(false);
    }
  };
  // Effect to initialize data when modal opens
  useEffect(() => {
    if (!open || !permissionsData) return;
    
    // Debug permissions data
    console.log('Advanced Permissions Modal - permissionsData:', permissionsData);
    
    setPermissionsWithConditions(permissionsData.permissionsWithConditions || []);
    setDataAccessConditions(permissionsData.dataAccessConditions || []);
    
    // Process visible components data - preserve existing checked state
    const components = permissionsData.components || [];
    console.log('Components to initialize (detailed):', JSON.stringify(components, null, 2));
    
    // Make sure all components have the checked property properly set
    const processedComponents = components.map(component => {
      // Make sure we have both the component ID and permission key
      if (component.id && component.permission_key) {
        // The checked state should be explicitly true/false based on the input
        const isChecked = component.checked === true;
        console.log(`Component ${component.name} (${component.permission_key}_${component.id}) checked status: ${isChecked}`);
        
        return {
          ...component,
          checked: isChecked
        };
      }
      
      // If missing ID or permission_key, log an error
      console.warn('Component missing id or permission_key:', component);
      return component;
    });
    
    setVisibleComponents(processedComponents);
    
    // Process special actions data - preserve existing checked state
    const actions = permissionsData.specialActions || [];
    console.log('Special actions to initialize:', actions);
    
    setSpecialActions(actions.map(action => ({
      ...action,
      // Preserve the checked state passed from the parent component
      checked: action.checked || false
    })));
    
    // Reset show all components if no components are available
    if (components.length === 0) {
      setShowAllComponents(false);
    }
    
    // Initialize condition dropdowns with proper data
    const dropdowns: Record<string, ConditionDropdown> = {};
    const conditions = permissionsData.dataAccessConditions || [];
    const conditionKeys: string[] = [];
    
    conditions.forEach(condition => {
      if (condition.condition_key) {
        const conditionKey = condition.condition_key;
        dropdowns[conditionKey] = {
          conditionKey,
          name: condition.name || condition.condition_name || conditionKey,
          description: condition.description || condition.condition_description || '',
          values: condition.value || [],
          options: [], // Will be populated from API
          dropdown_source: condition.dropdown_source,
        };
        conditionKeys.push(conditionKey);
      }
    });
    
    setConditionDropdowns(dropdowns);
    
    // Fetch dropdown options from API for all unique condition keys
    if (conditionKeys.length > 0) {
      fetchConditionOptions(conditionKeys).then(apiOptions => {
        setConditionOptions(prevOptions => ({
          ...prevOptions,
          ...apiOptions
        }));
      });
    }
  }, [open, permissionsData]);

  const handleShowAllComponentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setShowAllComponents(checked);
    
    if (checked) {
      // If "show all" is selected, mark all components as checked
      setVisibleComponents(
        visibleComponents.map(component => ({
          ...component,
          checked: true,
        }))
      );
    }
  };

  const handleComponentChange = (componentId: string) => {
    console.log(`Toggling component with ID: ${componentId}`);
    
    setVisibleComponents(prevComponents => {
      const updated = prevComponents.map(c => {
        if (c.id === componentId) {
          const newChecked = !c.checked;
          console.log(`Component ${c.name} (${componentId}) checked changed from ${c.checked} to ${newChecked}`);
          return { ...c, checked: newChecked };
        }
        return c;
      });
      
      console.log('Updated components state:', updated);
      return updated;
    });
  };

  const handleSpecialActionChange = (id: string) => () => {
    setSpecialActions(
      specialActions.map(action => {
        if (action.id === id) {
          return {
            ...action,
            checked: !action.checked,
          };
        }
        return action;
      })
    );
  };

  const handleSaveSettings = () => {
    // Check if any permissions are selected
    const hasSelectedComponents = visibleComponents.some(component => component.checked);
    const hasSelectedActions = specialActions.some(action => action.checked);
    
    if (!hasSelectedComponents && !hasSelectedActions) {
      onClose(); // Close the modal if no permissions are selected
      return;
    }

    // Format permissions to match the required API payload structure
    const formattedPermissions = permissionsWithConditions.map(permission => {
      // Base permission object
      const permissionData: any = {
        permission_key: permission.permission_key,
        is_active: true
      };

      // Only include components that are checked
      if (permission.permission_key === 'visible_components') {
        permissionData.components = visibleComponents
          .filter(component => component.checked)
          .map(component => component.permission_key);
      }

      // Only include actions that are checked
      if (permission.permission_key === 'special_actions') {
        permissionData.actions = specialActions
          .filter(action => action.checked)
          .map(action => action.permission_id);
      }
      
      // Add conditions with their selected values
      if (permission.conditions && permission.conditions.length > 0) {
        const formattedConditions = permission.conditions
          .map(condition => {
            const conditionKey = condition.condition_key || '';
            const dropdown = conditionDropdowns[conditionKey];
            
            // Skip if no dropdown, no condition key, or empty values
            if (!dropdown || !conditionKey) return null;
            
            // Only include conditions that have values selected
            if (!dropdown.values || dropdown.values.length === 0) return null;
            
            return {
              condition_key: conditionKey,
              value: dropdown.values || [],
              is_active: true
            };
          })
          .filter(Boolean);
        
        if (formattedConditions.length > 0) {
          permissionData.conditions = formattedConditions;
        }
      }
      
      // Add components relevant to this permission
      const relevantComponents = visibleComponents
        .filter(component => component.checked)
        .map(component => ({
          component_key: component.id,
          is_active: true
        }));
      
      if (relevantComponents.length > 0) {
        permissionData.components = relevantComponents;
      }
      
      return permissionData;
    });
    
    // Add special actions as additional permissions if they're checked
    // Only include special actions that are actually checked
    const checkedSpecialActions = specialActions.filter(action => action.checked === true);
    
    checkedSpecialActions.forEach(action => {
      // Check if this action already exists in the permissions list
      const exists = formattedPermissions.some(p => p.permission_key === action.id);
      
      if (!exists) {
        formattedPermissions.push({
          permission_key: action.id,
          is_active: true
        });
      }
    });
    
    console.log('API-formatted permissions:', formattedPermissions);
    
    // Prepare updated data to send back to parent component
    const updatedData = {
      moduleKey,
      featureKey,
      // Include the API-formatted permissions data - filter out any with empty conditions
      formattedPermissions: formattedPermissions.filter(perm => {
        // Always include permissions without conditions
        if (!perm.conditions) return true;
        
        // For permissions with conditions, only include if at least one condition has values
        return perm.conditions.some((cond: any) => cond.value && cond.value.length > 0);
      }),
      // Also include the component state for UI updates
      components: visibleComponents,
      specialActions,
      dataAccessConditions,
      permissionsWithConditions
    };
    
    onSave(updatedData);
    onClose();
  };

  // Helper function to update condition values in all relevant states
  const updateConditionValues = (conditionKey: string, values: string[]) => {
    // Update condition dropdowns state
    setConditionDropdowns(prevState => ({
      ...prevState,
      [conditionKey]: {
        ...prevState[conditionKey],
        values,
      }
    }));
    
    // Update data access conditions
    setDataAccessConditions(prevConditions => 
      prevConditions.map(condition => {
        if (condition.condition_key === conditionKey) {
          return {
            ...condition,
            value: values,
          };
        }
        return condition;
      })
    );
    
    // Update permissions with conditions
    setPermissionsWithConditions(prevPermissions => 
      prevPermissions.map(permission => ({
        ...permission,
        conditions: permission.conditions.map(condition => {
          if (condition.condition_key === conditionKey) {
            return {
              ...condition,
              value: values,
            };
          }
          return condition;
        }),
      }))
    );
  };
  
  // Generic handler for condition dropdown changes
  const handleConditionChange = (conditionKey: string) => (event: SelectChangeEvent<string[]>) => {
    const values = event.target.value as string[];
    updateConditionValues(conditionKey, values);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { 
          width: '95%',
          maxWidth: '1400px',
          height: '95vh'
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {t('Advanced Permissions')} - {moduleName} / {featureName}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pb: 1, overflowY: 'auto' }}>
        <Box sx={{ mt: 2, mb: 4 }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <RuleIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="h6" component="h2">
                {t('Data Access Rules')}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('Define conditions that limit what data users can access')}
            </Typography>
            
            {/* Data Access Rules Section */}
            {permissionsWithConditions.length === 0 ? (
              <Box sx={{ py: 2, borderRadius: 1, backgroundColor: 'grey.100' }}>
                <Typography align="center" color="text.secondary">
                  {t('No permissions available with conditions')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {permissionsWithConditions.map((permission) => (
                  <Paper 
                    key={permission.id} 
                    elevation={1} 
                    sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {permission.permission_key}
                      </Typography>
                      {permission.permission_description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {permission.permission_description}
                        </Typography>
                      )}
                    </Box>
                    
                    {permission.conditions && permission.conditions.length > 0 ? (
                      <Box sx={{ 
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' },
                        gap: 2,
                        pl: 1,
                        width: '100%'
                      }}>
                        {permission.conditions.map((condition) => {
                          const conditionKey = condition.condition_key || '';
                          const dropdown = conditionKey ? conditionDropdowns[conditionKey] : null;
                          
                          if (!dropdown) return null;
                          
                          return (
                            <Box key={conditionKey} sx={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: 0, // Prevents overflow
                              width: '100%'
                            }}>
                              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                {dropdown.name}
                              </Typography>
                              
                              {dropdown.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  {dropdown.description}
                                </Typography>
                              )}
                              
                              <Box sx={{ width: '100%' }}>
                                <FormControl fullWidth size="small">
                                  <Select
                                    multiple
                                    value={dropdown?.values?.includes('all') ? ['all'] : dropdown.values || []}
                                    onChange={handleConditionChange(conditionKey)}
                                    renderValue={() => dropdown?.values?.includes('all') 
                                      ? t(`All ${dropdown?.name || 'options'}`) 
                                      : dropdown.values && dropdown.values.length > 0
                                        ? t(`${dropdown.values.length} selected`)
                                        : t('Select an option')
                                    }
                                    displayEmpty
                                    fullWidth
                                    size="small"
                                    sx={{ mt: 1 }}
                                  >
                                    <ListSubheader sx={{ bgcolor: 'background.paper', fontWeight: 600, color: 'text.primary' }}>
                                      {t(`Select the ${dropdown.name.toLowerCase()} this role can access`)}
                                    </ListSubheader>
                                    
                                    <MenuItem key="all" value="all">
                                      <Checkbox checked={dropdown?.values?.includes('all') || false} />
                                      {t(`All ${dropdown?.name || 'options'}`)}
                                    </MenuItem>
                                    
                                    {Array.isArray(conditionOptions[conditionKey]) && conditionOptions[conditionKey].map((option) => (
                                      <MenuItem 
                                        key={option?.id} 
                                        value={option?.id}
                                      >
                                        <Checkbox checked={dropdown.values?.includes(option.id) || false} />
                                        {option?.name || ''}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {t('No conditions configured for this permission')}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
          
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <VisibilityIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="h6" component="h2">
                {t('Visible Page Components')}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('Control which tabs and sections are visible')}
            </Typography>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showAllComponents}
                    onChange={handleShowAllComponentsChange}
                  />
                }
                label={t('Show all components for this module')}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ pl: 3, display: 'flex', flexWrap: 'wrap' }}>
                {visibleComponents.length === 0 ? (
                  <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                    {t('No components available for this feature')}
                  </Typography>
                ) : (
                  visibleComponents.map((component) => (
                    <FormControlLabel
                      key={component.id}
                      control={
                        <Checkbox
                          checked={component.checked}
                          onChange={() => handleComponentChange(component.id)}
                          disabled={showAllComponents}
                        />
                      }
                      label={
                        <Tooltip title={component.description || ''} placement="top" arrow>
                          <Typography variant="body2">
                            {component.name}
                          </Typography>
                        </Tooltip>
                      }
                      sx={{ width: '33%', minWidth: '200px', mr: 0 }}
                    />
                  ))
                )}
              </Box>
            </FormGroup>
          </Paper>

          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <KeyIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="h6" component="h2">
                {t('Special Actions')}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('Grant permission for special operations and feature-specific functionality')}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              {t(`These permissions enable specialized actions within ${featureName} such as testing, publishing, approval workflows, or analytics access.`)}
            </Typography>
            
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              {specialActions.length === 0 ? (
                <Box sx={{ py: 1, width: '100%' }}>
                  <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                    {t('No special actions available for this feature')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('This feature only uses standard CRUD operations which can be configured on the role add page.')}
                  </Typography>
                </Box>
              ) : (
                specialActions.map((action) => (
                  <FormControlLabel
                    key={action.id}
                    control={
                      <Checkbox
                        checked={action.checked}
                        onChange={handleSpecialActionChange(action.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{action.name}</Typography>
                      </Box>
                    }
                    sx={{ width: '33%', minWidth: '200px', mb: 1, mr: 0 }}
                  />
                ))
              )}
            </FormGroup>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button 
          onClick={handleSaveSettings} 
          variant="contained" 
          startIcon={<SaveIcon />}
        >
          {t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedPermissionsModal;
