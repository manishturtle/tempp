'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'next/navigation';

import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  FormControlLabel,
  FormGroup,
  Tooltip,
  Checkbox,
  Switch,
  TextField,
  Select,
  MenuItem,
  Link as MuiLink,
  Breadcrumbs,
  SelectChangeEvent,
  ListSubheader,
} from '@mui/material';

import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Rule as RuleIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  Home as HomeIcon,
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

const AdvancedPermissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const searchParams = useSearchParams();

  // Get module and feature keys from query params
  const moduleKey = searchParams.get('module');
  const featureKey = searchParams.get('feature');

  // State for module and feature names
  const [moduleName, setModuleName] = useState<string>('Module');
  const [featureName, setFeatureName] = useState<string>('Feature');
  const [permissionId, setPermissionId] = useState<string>('');

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
  

  // Load data from session storage
  useEffect(() => {
    try {
      console.log('Loading advanced permissions data');
      const storedDataString = sessionStorage.getItem('advancedPermissionsData');

      if (storedDataString) {
        console.log('Found stored data:', storedDataString);
        const storedData: AdvancedPermissionsData = JSON.parse(storedDataString);

        // Set module and feature names
        if (storedData.moduleName) setModuleName(storedData.moduleName);
        if (storedData.featureName) setFeatureName(storedData.featureName);
        if (storedData.permission_id) setPermissionId(storedData.permission_id);

        // Process components data
        if (storedData.components && storedData.components.length > 0) {
          console.log('Processing components:', storedData.components);
          const initialComponents = storedData.components.map(component => ({
            id: component.id || '',
            name: component.name || '',
            description: component.description || '',
            checked: component.checked || false,
            permission_key: component.permission_key || ''
          }));
          setVisibleComponents(initialComponents);
        }
        
        // Initialize special actions
        if (storedData.specialActions && Array.isArray(storedData.specialActions)) {
          const initialActions = storedData.specialActions.map(action => ({
            id: action.id || '',
            name: action.name || '',
            description: action.description || '',
            checked: false, // Start with unchecked
            permission_id: action.permission_id
          }));
          setSpecialActions(initialActions);
        }
        
        // Store the complete permission data with conditions
        if (storedData.permissionsWithConditions && Array.isArray(storedData.permissionsWithConditions)) {
          console.log('Processing permissions with conditions:', storedData.permissionsWithConditions);
          setPermissionsWithConditions(storedData.permissionsWithConditions);
          
          // Extract all unique conditions and initialize condition dropdowns
          const uniqueConditionKeys: Set<string> = new Set();
          const initialDropdowns: Record<string, ConditionDropdown> = {};
          const allConditions: DataAccessCondition[] = [];
          
          // First pass - collect all unique condition keys
          storedData.permissionsWithConditions.forEach(permission => {
            if (!permission.conditions) {
              console.warn('Permission missing conditions:', permission);
              return;
            }
            
            // Process conditions for each permission
            permission.conditions.forEach(condition => {
              const conditionKey = condition.condition_key || '';
              if (conditionKey && !uniqueConditionKeys.has(conditionKey)) {
                uniqueConditionKeys.add(conditionKey);
                console.log(`Found unique condition: ${conditionKey}`, condition);
                
                // Determine values - empty array means 'all'
                const displayValues = Array.isArray(condition.value) && condition.value.length === 0 ? 
                  ['all'] : (condition.value || ['all']);
                
                // Initialize dropdown for this condition
                initialDropdowns[conditionKey] = {
                  conditionKey,
                  name: condition.condition_name || condition.name || '',
                  description: condition.condition_description || condition.description || '',
                  values: displayValues,
                  options: [{ id: 'all', name: `All ${condition.condition_name || condition.name || ''}` }],
                  dropdown_source: condition.dropdown_source || ''
                };
                
                // Also add to the legacy dataAccessConditions array for backward compatibility
                allConditions.push({
                  id: condition.id || condition.condition_id || '',
                  condition_key: conditionKey,
                  name: condition.condition_name || condition.name || '',
                  value: condition.value || []
                });
              } else if (conditionKey) {
                // If this is a duplicate condition, merge any values that aren't already present
                if (condition.value && Array.isArray(condition.value)) {
                  const existingValues = initialDropdowns[conditionKey].values;
                  // If existing value is 'all', keep it as is
                  if (!existingValues.includes('all')) {
                    condition.value.forEach(val => {
                      if (!existingValues.includes(val)) {
                        existingValues.push(val);
                      }
                    });
                  }
                }
              }
            });
          });
          
          console.log('Initialized condition dropdowns:', initialDropdowns);
          setConditionDropdowns(initialDropdowns);
          setDataAccessConditions(allConditions);
        }
        
        // Also initialize the flattened data access conditions for compatibility
        if (storedData.dataAccessConditions && Array.isArray(storedData.dataAccessConditions)) {
          setDataAccessConditions(storedData.dataAccessConditions);

          // Use the special actions from session storage
          if (storedData.specialActions && Array.isArray(storedData.specialActions) && storedData.specialActions.length > 0) {
            console.log('Loading special actions from session storage:', storedData.specialActions);
            
            const actions = storedData.specialActions.map(action => ({
              id: action.id || '',
              name: action.name || '',
              description: action.description || '',
              checked: true, // Always checked by default
              permission_id: action.permission_id,
              is_active: action.is_active || true,
              type: action.type || 'special_action'
            }));
            
            setSpecialActions(actions);
          } else {
            console.log('No special actions found in session storage');
            setSpecialActions([]);
          }
          console.log(`Using special actions from session for module=${moduleKey}, feature=${featureKey}`);
        }
      }
    } catch (error) {
      console.error('Error loading advanced permissions data:', error);
      // Set empty arrays on error
      setVisibleComponents([]);
      setSpecialActions([]);
    }
  }, [moduleKey, featureKey]);

  // The fetchDropdownOptions function has been replaced with fetchConditionOptions
  // which dynamically loads dropdown options based on condition keys in permissionsWithConditions

  // Static condition handlers have been replaced by the dynamic handleConditionChange function
  // which handles all condition types based on the conditionDropdowns state

  const handleShowAllComponentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setShowAllComponents(isChecked);
    
    // If showing all components, update all permissions to include all components
    if (isChecked) {
      // Keep the original structure but update all components to be checked
      setVisibleComponents(prevState => {
        if (!Array.isArray(prevState)) return [];
        return prevState.map(component => ({ ...component, checked: true }));
      });
      
      // Update permissionsWithConditions to include all components
      setPermissionsWithConditions(prevPermissions => {
        if (!Array.isArray(prevPermissions)) return [];
        
        return prevPermissions.map(permission => {
          const components = Array.isArray(permission.components) 
            ? permission.components.map(component => ({
                ...component,
                checked: true
              }))
            : [];
            
          return {
            ...permission,
            components
          };
        });
      });
    }
  };

  const handleVisibleComponentChange = (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    
    // Update the UI state for visible components
    setVisibleComponents(prevState => {
      if (!Array.isArray(prevState)) return [];
      return prevState.map(component =>
        component?.id === id ? { ...component, checked: isChecked } : component
      );
    });
    
    // Update the component in permissionsWithConditions to maintain consistent state
    setPermissionsWithConditions(prevPermissions => {
      if (!Array.isArray(prevPermissions)) return [];
      
      return prevPermissions.map(permission => {
        const components = Array.isArray(permission.components)
          ? permission.components.map(component =>
              component?.id === id ? { ...component, checked: isChecked } : component
            )
          : [];
          
        return {
          ...permission,
          components
        };
      });
    });
  };

  const handleSpecialActionChange = (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    
    // Update the UI state for special actions
    setSpecialActions(prevState =>
      prevState.map(action =>
        action.id === id ? { ...action, checked: isChecked } : action
      )
    );
    
    // Update the special actions in permissionsWithConditions
    setPermissionsWithConditions(prevPermissions => {
      return prevPermissions.map(permission => {
        // Safely check if this permission has the special action
        const specialActions = Array.isArray(permission.special_actions) ? permission.special_actions : [];
        const hasSpecialAction = specialActions.some(action => action?.id === id);
        
        if (hasSpecialAction) {
          return {
            ...permission,
            special_actions: specialActions.map(action =>
              action?.id === id ? { ...action, checked: isChecked } : action
            )
          };
        }
        
        return permission;
      });
    });
  };

  const handleBackClick = () => {
    router.back();
  };

  const handleSaveSettings = () => {
    try {
      // Prepare data for saving
      const advancedSettingsData = {
        moduleName: moduleName,
        featureName: featureName,
        moduleKey: moduleKey || '',
        featureKey: featureKey || '',
        permission_id: permissionId || '',
        visibleComponents: visibleComponents.filter(comp => comp.checked).map(comp => ({
          id: comp.id,
          name: comp.name,
          description: comp.description || '',
          permission_key: comp.permission_key || ''
        })),
        specialActions: specialActions.filter(action => action.checked).map(action => ({
          id: action.id,
          name: action.name,
          permission_id: action.permission_id
        })),
        // Use the dynamically generated conditions from all permissions
        permissionsWithConditions: permissionsWithConditions.map(permission => ({
          ...permission,
          conditions: permission.conditions.map(condition => {
            // Update condition values from the condition dropdowns state
            const conditionKey = condition.condition_key || '';
            const dropdown = conditionDropdowns[conditionKey];
            
            if (dropdown) {
              return {
                ...condition,
                // Empty array means "All" is selected (backend expectation)
                value: dropdown.values.includes('all') ? [] : dropdown.values
              };
            }
            return condition;
          })
        }))
      };

      // Save to session storage
      console.log('Saving advanced settings:', advancedSettingsData);
      sessionStorage.setItem('advancedSettingsData', JSON.stringify(advancedSettingsData));
      
      // Navigate back to the previous page
      router.back();
    } catch (error) {
      console.error('Error saving advanced permissions data:', error);
      // Could add error notification here
    }
  };

// ...
  // Helper function to update condition values in all relevant states
  const updateConditionValues = (conditionKey: string, values: string[]) => {
    // Update the conditionDropdowns state
    setConditionDropdowns(prevDropdowns => {
      const updatedDropdowns = { ...prevDropdowns };
      
      if (updatedDropdowns[conditionKey]) {
        updatedDropdowns[conditionKey] = {
          ...updatedDropdowns[conditionKey],
          values: values
        };
      }
      
      return updatedDropdowns;
    });
    
    // Also update the dataAccessConditions for backward compatibility
    setDataAccessConditions(prevConditions => {
      // Check if condition already exists
      const existingIndex = prevConditions.findIndex(c =>
        (c.condition_key === conditionKey || c.id === conditionKey));

      if (existingIndex >= 0) {
        // Update existing condition
        const updatedConditions = [...prevConditions];
        updatedConditions[existingIndex] = {
          ...updatedConditions[existingIndex],
          value: values
        };
        return updatedConditions;
      } else {
        // Add new condition using information from conditionDropdowns
        const dropdown = conditionDropdowns[conditionKey];
        const conditionName = dropdown?.name || conditionKey;
        
        return [...prevConditions, {
          id: conditionKey,
          condition_key: conditionKey,
          name: conditionName,
          value: values
        }];
      }
    });
  };
  
  // Generic handler for condition dropdown changes
  const handleConditionChange = (conditionKey: string) => (event: SelectChangeEvent<string[]>) => {
    const newValues = event.target.value as string[];
    
    // Always set only 'all' as the selected value
    const valuesToSet = newValues.includes('all') ? ['all'] : [];
    
    // Update the condition values in state
    updateConditionValues(conditionKey, valuesToSet);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {t('Advanced Permissions for')} {featureName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('Configure Detailed Access Rules and Visibility Settings for')} {moduleName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="text"
            color="primary"
            onClick={handleBackClick}
            startIcon={<ArrowBackIcon />}
          >
            {t('Back To Role')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSettings}
            startIcon={<SaveIcon />}
          >
            {t('Save Settings')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 4 }}>
        <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <RuleIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography variant="h6" component="h2">
              {t('Record Access Rules')}
            </Typography>
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Typography variant="body2">{t('Loading dropdown options...')}</Typography>
            </Box>
          )}

          {apiError && (
            <Box sx={{ backgroundColor: 'error.light', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" color="error">
                {apiError}
              </Typography>
            </Box>
          )}

          {/* Permissions with Conditions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {t('Configure data access rules for this role. Each permission can have its own set of conditions.')}
            </Typography>
            
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
                        {permission.permission_name}
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
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
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
                                <Select
                                  multiple
                                  value={dropdown?.values?.includes('all') ? ['all'] : []}
                                  onChange={handleConditionChange(conditionKey)}
                                  renderValue={() => dropdown?.values?.includes('all') 
                                    ? t(`All ${dropdown?.name || 'options'}`) 
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
                                  
                                  {Array.isArray(dropdown?.options) && dropdown.options.map((option) => (
                                    <MenuItem 
                                      key={option?.id} 
                                      value={option?.id}
                                      disabled={true}
                                      sx={{ opacity: 0.7 }}
                                    >
                                      <Checkbox checked={false} disabled={true} />
                                      {option?.name || ''}
                                    </MenuItem>
                                  ))}
                                </Select>
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
          </Box>
        </Paper>

        <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
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
                        onChange={handleVisibleComponentChange(component.id)}
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
    </Container>
  );
};

export default AdvancedPermissionsPage;
