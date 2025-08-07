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
  MoreHoriz as MoreHorizIcon,
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

const AddRolePage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant_slug: string }>();
  const [modules, setModules] = useState<Module[]>([]);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionSelection>({});
  const [selectedComponents, setSelectedComponents] = useState<Record<string, boolean>>({});
  const [selectedConditions, setSelectedConditions] = useState<Record<string, number[]>>({}); // permissionId -> conditionIds
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openOthersModal, setOpenOthersModal] = useState(false);
  const [currentOtherPermissions, setCurrentOtherPermissions] = useState<Permission[]>([]);
  const [currentFeaturePermissions, setCurrentFeaturePermissions] = useState<Permission[]>([]); 
  const [currentFeatureName, setCurrentFeatureName] = useState('');
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
    
    return 'other';
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

  // Fetch modules and permissions from the API
  const fetchModulesAndPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/user/roles/`, {
        headers: {
          ...getAuthHeaders(),
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch modules and permissions');
      }
      
      const data: ApiResponse = await response.json();
      
      // Initialize with the first role's modules or empty array if no roles
      if (data.roles && data.roles.length > 0) {
        setModules(data.roles[0].modules || []);
        
        // Initialize permissions with CRUD auto-selected but advanced options not selected
        const initialPermissions: PermissionSelection = {};
        const initialComponents: Record<string, boolean> = {};
        const initialConditions: Record<string, number[]> = {};
        
        // Add null checks for all arrays
        const modules = data.roles[0].modules || [];
        modules.forEach(module => {
          const features = module.features || [];
          features.forEach(feature => {
            const permissions = feature.permissions || [];
            permissions.forEach(permission => {
              // Determine if this is a basic CRUD permission based on its key
              const permKey = permission.permission_key?.toLowerCase() || '';
              const isCrudPermission = (
                permKey.includes('view') || 
                permKey.includes('list') || 
                permKey.includes('create') || 
                permKey.includes('add') || 
                permKey.includes('edit') || 
                permKey.includes('update') || 
                permKey.includes('delete')
              );
              
              // Only pre-select CRUD permissions, leave special permissions unchecked
              initialPermissions[permission.permission_key] = isCrudPermission && permission.is_active === true;
              
              // Initialize empty conditions array for this permission
              initialConditions[permission.permission] = [];
              
              // Initialize all components as NOT selected by default
              if (permission.components && Array.isArray(permission.components)) {
                permission.components.forEach(component => {
                  if (component && component.component_key) {
                    initialComponents[component.component_key] = false;
                  }
                });
              }
            });
          });
        });
        
        setSelectedPermissions(initialPermissions);
        setSelectedComponents(initialComponents);
        setSelectedConditions(initialConditions);
      }
    } catch (err) {
      console.error('Error fetching modules and permissions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_slug]);
  
  useEffect(() => {
    fetchModulesAndPermissions();
  }, [fetchModulesAndPermissions]);

  // Toggle permission selection
  const handlePermissionChange = (permissionKey: string) => {
    // Allow toggling for all permissions
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  // Handler for component checkbox changes
  const handleComponentChange = (permissionId: number, componentId: number, isChecked: boolean) => {
    setSelectedComponents(prev => ({
      ...prev,
      [`${permissionId}_${componentId}`]: isChecked
    }));
  };

  // Handler for condition checkbox changes
  const handleConditionChange = (permissionId: number, conditionId: number, isChecked: boolean) => {
    setSelectedConditions(prev => {
      const currentConditions = prev[permissionId] || [];
      
      if (isChecked) {
        // Add condition if not already present
        if (!currentConditions.includes(conditionId)) {
          return {
            ...prev,
            [permissionId]: [...currentConditions, conditionId]
          };
        }
      } else {
        // Remove condition
        return {
          ...prev,
          [permissionId]: currentConditions.filter(id => id !== conditionId)
        };
      }
      
      return prev;
    });
  };

  // Handler for opening the others modal
  const handleOpenOthersModal = (otherPermissions: Permission[], featureName: string, allPermissions: Permission[]) => {
    setCurrentOtherPermissions(otherPermissions);
    setCurrentFeaturePermissions(allPermissions);
    setCurrentFeatureName(featureName);
    setOpenOthersModal(true);
  };
  
  // Handler for closing the others modal
  const handleCloseOthersModal = () => {
    setOpenOthersModal(false);
  };

  // Handler for updating advanced permissions from the modal
  const handleAdvancedPermissionsChange = (updatedData: any) => {
    const { moduleKey, featureKey, components, specialActions, formattedPermissions } = updatedData;
    
    // Update selected components based on the modal data
    components.forEach((component: any) => {
      selectedComponents[component.id] = component.checked;
    });
    setSelectedComponents({ ...selectedComponents });
    
    // Update selected permissions based on special actions
    specialActions.forEach((action: any) => {
      selectedPermissions[action.id] = action.checked;
    });
    setSelectedPermissions({ ...selectedPermissions });
    
    // Store the formatted permissions data for API submission
    const advancedData = {
      ...updatedData,
      // Ensure we have the correctly formatted API data
      formattedPermissions: formattedPermissions || []
    };
    
    // Update advanced permissions state
    setAdvancedPermissions(prevState => ({
      ...prevState,
      [`${moduleKey}.${featureKey}`]: advancedData
    }));
    
    // Log the formatted permissions data that will be used in the API
    console.log('Updated advanced permissions with API format:', formattedPermissions);
    
    // Show success message
    setSnackbarMessage('Advanced permissions updated');
    setSnackbarOpen(true);
  };

  // Handler for navigating to advanced settings page
  const handleNavigateToAdvancedSettings = (moduleKey: string, featureKey: string) => {
    // Find the module and feature to pass their data to the advanced permissions page
    const module = modules.find(m => m.module_key === moduleKey);
    const feature = module?.features.find(f => f.feature_key === featureKey);
    
    if (module && feature) {
      // Filter to only include permissions that are currently selected by the user
      const activePermissions = feature.permissions.filter(permission => 
        selectedPermissions[permission.permission_key] === true
      );
      
      // If no permissions are selected, don't show the advanced settings
      if (activePermissions.length === 0) {
        setSnackbarMessage(t('Please select at least one permission for this feature to configure advanced settings'));
        setSnackbarOpen(true);
        return;
      }
      
      // Extract all components from the selected permissions
      const components = (activePermissions || [])
        .flatMap(p => p.components || [])
        .map(comp => comp ? ({
          id: comp.component_key,
          name: comp.component_name,
          description: comp.component_description || '',
          checked: selectedComponents[comp.component_key] || false,
          is_active: comp.is_active,
          type: 'component'
        }) : null).filter(Boolean) as any[];
      
      // Extract special actions (which are permissions beyond basic CRUD)
      // Get ALL permissions from the feature, not just active ones, to detect all special actions
      // This ensures we include permissions like test_webhook even if they're not selected
      console.log('All feature permissions for special actions detection:', feature.permissions);
      
      // Use all feature permissions instead of just activePermissions to detect all possible special actions
      const specialActions = (feature.permissions || [])
        // Get only permissions that are truly special operations (not CRUD)
        .filter(p => {
          const permKey = p.permission_key?.toLowerCase() || '';
          
          // Standard CRUD operations to filter out, even if part of specialized domains
          const crudOperations = ['view', 'list', 'create', 'add', 'edit', 'update', 'delete', 'remove'];
          
          // For dot notation permissions (domain.operation), e.g., "prompt_publishing.download"
          if (permKey.includes('.')) {
            const parts = permKey.split('.');
            const operation = parts[parts.length - 1];
            
            // Log each permission we're analyzing
            console.log(`Analyzing permission: ${p.permission_key} (${p.permission_name}) - dot notation operation: ${operation}`);
            
            // If it's not in the CRUD list, consider it a special operation
            const isSpecial = !crudOperations.includes(operation);
            console.log(`  Is special action? ${isSpecial}`);
            return isSpecial;
          }
          
          // Keywords that indicate special actions (add more as needed)
          const specialKeywords = ['test', 'webhook', 'run', 'improvise', 'approve', 'reject', 'publish'];
          const hasSpecialKeyword = specialKeywords.some(keyword => permKey.includes(keyword));
          
          // For non-dot-notation permissions, check special keywords first
          if (hasSpecialKeyword) {
            console.log(`Analyzing permission: ${p.permission_key} (${p.permission_name}) - has special keyword`);
            console.log(`  Is special action? true`);
            return true;
          }
          
          // If no special keywords, check if it's a standard CRUD action
          const permName = p.permission_name?.toLowerCase() || '';
          const isCrud = crudOperations.some(op => 
            permName.includes(op) || permKey.includes(op)
          );
          
          // Log non-dot notation permissions
          console.log(`Analyzing permission: ${p.permission_key} (${p.permission_name}) - standard format`);
          console.log(`  Is CRUD? ${isCrud}, Is special action? ${!isCrud}`);
          
          // If it doesn't look like basic CRUD, it's probably special
          return !isCrud;
        })
        .map(p => ({
          id: p.permission_key,
          permission_id: p.id, // Keep track of the original permission ID
          name: p.permission_name,
          description: p.permission_description || '',
          // Always set special actions to unchecked by default
          checked: false,
          is_active: p.is_active,
          type: 'special_action'
        })).filter(Boolean) as any[];
      
      // Log the detected special actions
      console.log('Detected special actions:', specialActions);
      
      // Group permissions with their conditions - this preserves the relationship
      // Only include permissions that actually have conditions or components
      // First, get all permissions from the current feature
      const allPermissions = feature.permissions || [];
      
      // Then filter to only include selected permissions that have conditions or components
      const permissionsWithConditions = allPermissions
        .filter(permission => {
          const isSelected = selectedPermissions[permission.permission_key] === true;
          const hasConditions = Array.isArray(permission.conditions) && permission.conditions.length > 0;
          const hasComponents = Array.isArray(permission.components) && permission.components.length > 0;
          return isSelected && (hasConditions || hasComponents);
        })
        .map(permission => ({
        id: permission.id,
        permission_key: permission.permission_key,
        permission_name: permission.permission_name,
        permission_description: permission.permission_description || '',
        is_active: permission.is_active,
        conditions: (permission.conditions || []).map(cond => ({
          id: cond.id,
          condition_id: cond.condition,
          condition_key: cond.condition_key,
          condition_name: cond.condition_name,
          condition_description: cond.condition_description || '',
          is_active: cond.is_active,
          value: [], // Initialize with empty array for the advanced page to populate
          dropdown_source: getDropdownSourceFromConditionKey(cond.condition_key)
        }))
      }));
      
      // Also create a flattened list of unique conditions for UI rendering
      // First get all permissions from the current feature that are selected
      const selectedPermissionKeys = Object.entries(selectedPermissions || {})
        .filter(([_, isSelected]) => isSelected)
        .map(([key]) => key);
        
      // Then get all conditions from those selected permissions
      const dataAccessConditions = allPermissions
        .filter(permission => selectedPermissionKeys.includes(permission.permission_key))
        .flatMap(p => (p.conditions || []))
        .filter(cond => cond) // Filter out any null/undefined conditions
        .map(cond => ({
          id: cond.condition_key,
          condition_key: cond.condition_key,
          name: cond.condition_name,
          condition_name: cond.condition_name,
          description: cond.condition_description || '',
          is_active: cond.is_active,
          type: 'data_access_condition',
          value: [], // Initialize with empty array for the advanced page to populate
          dropdown_source: getDropdownSourceFromConditionKey(cond.condition_key)
        }));
      
      // Remove duplicates from components and conditions by ID
      const uniqueComponents = Array.from(
        new Map(
          (components || []).map(comp => [comp.id, comp])
        ).values()
      );
      
      const uniqueSpecialActions = Array.from(
        new Map(
          (specialActions || []).filter(Boolean).map(action => [action?.id, action])
        ).values()
      );
      
      // For conditions, keep them distinct by condition_key
      const uniqueDataAccessConditions = Array.from(
        new Map(
          (dataAccessConditions || []).filter(Boolean).map(condition => [condition?.id, condition])
        ).values()
      );
      
      // Only navigate to advanced settings if there's something to configure
      if (uniqueComponents.length === 0 && uniqueSpecialActions.length === 0 && uniqueDataAccessConditions.length === 0) {
        // Show a message to the user that there are no advanced settings for this feature
        setSnackbarMessage(t('This feature has no advanced settings available.'));
        setSnackbarOpen(true);
        return;
      }
      
      // Create the data object to pass to the modal directly
      const advancedData = {
        moduleName: module.name,
        featureName: feature.name,
        moduleKey: moduleKey,
        featureKey: featureKey,
        components: uniqueComponents,
        specialActions: uniqueSpecialActions,
        dataAccessConditions: uniqueDataAccessConditions,
        permissionsWithConditions: permissionsWithConditions // Add the grouped permissions with their conditions
      };
      
      // Set the current module and feature information
      setCurrentModuleKey(moduleKey);
      setCurrentFeatureKey(featureKey);
      setCurrentModuleName(module.name);
      setCurrentFeatureName(feature.name);
      setCurrentAdvancedPermissionsData(advancedData);

      console.log('Passing advanced permissions data:', {
        components: uniqueComponents,
        specialActions: uniqueSpecialActions,
        dataAccessConditions: uniqueDataAccessConditions,
        permissionsWithConditions: permissionsWithConditions
      }); 
    }
    
    // We no longer navigate to another page - just open the modal instead
    // Modal state is already set up in the earlier part of this function
    
    // Open the advanced permissions modal
    setAdvancedPermissionsModalOpen(true);
  };
  
  // Helper function to determine the dropdown source based on condition key
  const getDropdownSourceFromConditionKey = (conditionKey: string): string => {
    switch (conditionKey) {
      case 'is_in_customer_group':
        return 'customer_groups';
      case 'is_in_same_region':
        return 'regions';
      case 'is_in_same_department':
        return 'departments';
      default:
        return '';
    }
  };
  
  // Handler for changing tabs in the modal
  const handleTabChange = (tab: 'special' | 'components') => {
    setActiveTab(tab);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!roleName.trim()) {
      setError('Role name is required');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting role creation...');
      
      
      
      // Get the app_id from localStorage or use a default
      const appId = localStorage.getItem('app_id') || 10;
      
      // Prepare permissions array in the required format
      const permissions: any[] = [];
      
      // Group permissions by permission_key
      const permissionsByKey: Record<string, any> = {};
      
      // Debug log the modules structure
      console.log('Modules:', modules);
      
      if (!modules || !Array.isArray(modules)) {
        throw new Error('No modules data available');
      }
      
      // Process modules and permissions
      for (const module of modules) {
        if (!module?.features?.length) continue;
        
        for (const feature of module.features) {
          if (!feature?.permissions?.length) continue;
          
          for (const permission of feature.permissions) {
            // Skip if permission_key is missing or not selected
            if (!permission?.permission_key || !selectedPermissions[permission.permission_key]) {
              continue;
            }
            
            const permKey = permission.permission_key;
            
            // Check if this is a component or special action from advanced modal
            const advancedPermissionKey = `${module.module_key}.${feature.feature_key}`;
            const advancedData = advancedPermissions[advancedPermissionKey];
            
            // If this is a permission that should be controlled by the advanced modal
            // and the modal was opened for this module/feature, but no components or actions
            // were selected, then skip this permission
            if (advancedData) {
              // Skip permissions that should have components or special actions but none were selected
              const hasComponents = permission.components?.length > 0;
              if (hasComponents && (!advancedData.components || !advancedData.components.some((comp: any) => comp.checked))) {
                continue; // Skip this permission if it has components but none were selected
              }
            }
            
            // Initialize permission in our map if it doesn't exist
            if (!permissionsByKey[permKey]) {
              permissionsByKey[permKey] = {
                permission_key: permKey,
                is_active: true,
                components: [],
                conditions: []
              };
            }
            
            // Add components if any are selected for this permission
            if (permission.components?.length) {
              let hasSelectedComponents = false;
              
              for (const comp of permission.components) {
                if (!comp?.component_key) continue;
                
                const compKey = comp.component_key;
                if (selectedComponents[compKey]) {
                  permissionsByKey[permKey].components.push({
                    component_key: compKey,
                    is_active: true
                  });
                  hasSelectedComponents = true;
                }
              }
              
              // If this permission has components but none were selected,
              // then don't include this permission at all
              if (permission.components.length > 0 && !hasSelectedComponents) {
                delete permissionsByKey[permKey];
                continue;
              }
            }
            
            // Add conditions if any are selected for this permission
            if (selectedConditions[permission.permission]?.length > 0) {
              for (const conditionId of selectedConditions[permission.permission]) {
                permissionsByKey[permKey].conditions.push({
                  condition_key: 'custom_condition', // Replace with actual condition key if available
                  value: ['100'], // Default value as per example
                  is_active: true
                });
              }
            }
          }
        }
      }
      
      // Convert the grouped permissions to an array
      Object.values(permissionsByKey).forEach(perm => {
        // Skip permissions that have empty components when they should have components
        const moduleFeatures = modules.flatMap(m => m.features);
        const allPermissions = moduleFeatures.flatMap(f => f.permissions);
        const permissionData = allPermissions.find(p => p.permission_key === perm.permission_key);
        
        // If this permission has components but none were selected, skip it
        if (permissionData?.components?.length > 0 && perm.components.length === 0) {
          return;
        }
        
        const permissionObj: any = {
          permission_key: perm.permission_key,
          is_active: perm.is_active,
        };
        
        if (perm.components.length > 0) {
          permissionObj.components = perm.components;
        }
        
        if (perm.conditions.length > 0) {
          permissionObj.conditions = perm.conditions;
        }
        
        permissions.push(permissionObj);
      });
      
      // Add advanced permissions data from the modal
      // This includes properly formatted components and conditions
      Object.values(advancedPermissions).forEach((advancedData: any) => {
        if (advancedData.formattedPermissions && Array.isArray(advancedData.formattedPermissions)) {
          advancedData.formattedPermissions.forEach((formattedPerm: any) => {
            // Check if this permission already exists in our list
            const existingPermIndex = permissions.findIndex(p => 
              p.permission_key === formattedPerm.permission_key
            );
            
            if (existingPermIndex >= 0) {
              // Update existing permission with advanced settings
              const existingPerm = permissions[existingPermIndex];
              
              // Merge components if they exist in both
              if (formattedPerm.components && Array.isArray(formattedPerm.components)) {
                existingPerm.components = existingPerm.components || [];
                
                // Add any components from advanced settings that aren't already there
                formattedPerm.components.forEach((comp: any) => {
                  const exists = existingPerm.components.some((c: any) => 
                    c.component_key === comp.component_key
                  );
                  
                  if (!exists) {
                    existingPerm.components.push(comp);
                  }
                });
              }
              
              // Add conditions if they exist in the advanced settings
              if (formattedPerm.conditions && Array.isArray(formattedPerm.conditions)) {
                existingPerm.conditions = existingPerm.conditions || [];
                
                // Add all conditions from advanced settings
                formattedPerm.conditions.forEach((cond: any) => {
                  existingPerm.conditions.push(cond);
                });
              }
            } else {
              // Add this as a new permission entry
              permissions.push(formattedPerm);
            }
          });
        }
      });
      
      // Create a new array with ALL explicitly selected permissions
      // This ensures we don't miss any permissions that the user selected
      const allSelectedPermissionKeys = Object.keys(selectedPermissions)
        .filter(key => selectedPermissions[key] === true);
      
      console.log('Selected permission keys:', allSelectedPermissionKeys);
      
      // Prepare the final permissions array
      const finalPermissions = [];
      
      // First, include all permission objects that were already processed
      for (const perm of permissions) {
        if (allSelectedPermissionKeys.includes(perm.permission_key)) {
          finalPermissions.push(perm);
          
          // Remove from the keys list to track which ones we've processed
          const index = allSelectedPermissionKeys.indexOf(perm.permission_key);
          if (index > -1) {
            allSelectedPermissionKeys.splice(index, 1);
          }
        }
      }
      
      // Then add any remaining selected permissions that weren't included yet
      for (const key of allSelectedPermissionKeys) {
        finalPermissions.push({
          permission_key: key,
          is_active: true
        });
      }
      
      // Log the final permissions list
      console.log('Final permissions list:', finalPermissions.length, 'permissions');
      
      // Prepare the request body with properly formatted permissions
      const requestBody = {
        name: roleName,
        description: roleDescription,
        is_active: true,
        is_default: false,
        app_id: parseInt(appId),
        is_super_role: false,
        permissions: finalPermissions
      };
      
      console.log('Submitting role data:', JSON.stringify(requestBody, null, 2));
      
      // Make the API call
      const apiUrl = `${AI_PLATFORM_API_BASE_URL}/${tenant_slug}/tenant/role-management/roles/`;
      console.log('Calling API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', responseData);
        throw new Error(responseData.detail || responseData.message || 'Failed to create role');
      }
      
      console.log('Role created successfully:', responseData);
      setSuccessMessage('Role created successfully');
      setSnackbarMessage('Role created successfully');
      setSnackbarOpen(true);
      
      // Redirect back to roles list after a short delay
      setTimeout(() => {
        router.push(`/${tenant_slug}/Crm/ai-platform/role-management`);
      }, 1500);
      
    } catch (err) {
      console.error('Error creating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to create role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${tenant_slug}/Crm/ai-platform/role-management`);
  };

  const handleSelectAll = () => {
    const allPermissions: PermissionSelection = {};
    
    // Mark all permissions as selected
    modules.forEach(module => {
      module.features.forEach(feature => {
        feature.permissions.forEach(permission => {
          allPermissions[permission.permission_key] = true;
        });
      });
    });
    
    setSelectedPermissions(allPermissions);
  };

  return (
    <Container sx={{ maxWidth: '1200px', mx: 'auto', my: 2 }}>
      <Card sx={{ boxShadow: 3, borderRadius: '8px' }}>
        {/* Header with close button */}
        {/* <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton sx={{ mr: 1 }} onClick={handleCancel}>
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" fontWeight="medium">Create New Role</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">Active</Typography>
            <IconButton size="small">
              <PersonIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box> */}

        {/* Main content */}
        <Box sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2 
          }}>
            <Typography variant="h5" fontWeight="bold">Create New Role</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleCancel}
                sx={{ textTransform: 'none' }}
              >
                {t('Cancel')}
              </Button>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                form="roleForm"
                sx={{ textTransform: 'none' }}
              >
                {t('Save')}
              </Button>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" mb={4}>
            Define a new role with appropriate permissions for your organization.
          </Typography>

          <Box component="form" id="roleForm" onSubmit={handleSubmit}>
            {/* Role Details Section */}
            <Box mb={4}>
              <Typography variant="h6" fontWeight="medium" mb={2}>Role Details</Typography>
              
              <Box mb={3}>
                <Typography variant="body2" fontWeight="medium" mb={0.5}>Role Name</Typography>
                <TextField
                  fullWidth
                  placeholder="e.g., Regional Sales Manager"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
              </Box>
              
              <Box>
                <Typography variant="body2" fontWeight="medium" mb={0.5}>Description</Typography>
                <TextField
                  fullWidth
                  placeholder="Describe the purpose of this role"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  multiline
                  rows={3}
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
              </Box>
            </Box>

            {/* Permissions Section */}
            <Box>
              <Typography variant="h6" fontWeight="medium" mb={1}>Features Permissions</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Set high-level CRUD permissions here. For more granular rules, use the Advanced settings for each module.
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 2, 
                mb: 2 
              }}>
                <Button 
                  startIcon={<UnfoldMoreIcon fontSize="small" />}
                  sx={{ color: 'primary.main', textTransform: 'none' }}
                >
                  Expand All
                </Button>
                <Button 
                  startIcon={<DoneAllIcon fontSize="small" />}
                  sx={{ color: 'primary.main', textTransform: 'none' }}
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              </Box>
              
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', width: '35%' }}>Feature</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', width: '10%' }}>View</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', width: '10%' }}>Add</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', width: '10%' }}>Edit</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', width: '10%' }}>Delete</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', width: '15%' }}>Advanced</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {modules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No modules found</TableCell>
                        </TableRow>
                      ) : (
                        modules.map((module) => (
                          module.features.map((feature) => {
                            // Group permissions by type for this feature
                            const featurePermissions = feature.permissions;
                            const viewPermissions = featurePermissions.filter(p => getPermissionType(p.permission_key) === 'view');
                            const addPermissions = featurePermissions.filter(p => getPermissionType(p.permission_key) === 'add');
                            const editPermissions = featurePermissions.filter(p => getPermissionType(p.permission_key) === 'edit');
                            const deletePermissions = featurePermissions.filter(p => getPermissionType(p.permission_key) === 'delete');
                            
                            // Check if any permissions of each type exist
                            const hasView = viewPermissions.length > 0;
                            const hasAdd = addPermissions.length > 0;
                            const hasEdit = editPermissions.length > 0;
                            const hasDelete = deletePermissions.length > 0;
                            
                            return (
                              <TableRow key={feature.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                <TableCell sx={{ fontWeight: 500 }}>
                                  <Box>
                                    <Typography variant="subtitle2">{feature.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {feature.description}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center" sx={{ px: 1 }}>
                                  {viewPermissions.length > 0 ? (
                                    viewPermissions.map(perm => (
                                      <Checkbox
                                        key={perm.id}
                                        checked={!!selectedPermissions[perm.permission_key]}
                                        onChange={() => handlePermissionChange(perm.permission_key)}
                                        color="primary"
                                        size="small"
                                      />
                                    ))
                                  ) : (
                                    <Checkbox
                                      checked={false}
                                      disabled={true}
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center" sx={{ px: 1 }}>
                                  {addPermissions.length > 0 ? (
                                    addPermissions.map(perm => (
                                      <Checkbox
                                        key={perm.id}
                                        checked={!!selectedPermissions[perm.permission_key]}
                                        onChange={() => handlePermissionChange(perm.permission_key)}
                                        color="primary"
                                        size="small"
                                      />
                                    ))
                                  ) : (
                                    <Checkbox
                                      checked={false}
                                      disabled={true}
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center" sx={{ px: 1 }}>
                                  {editPermissions.length > 0 ? (
                                    editPermissions.map(perm => (
                                      <Checkbox
                                        key={perm.id}
                                        checked={!!selectedPermissions[perm.permission_key]}
                                        onChange={() => handlePermissionChange(perm.permission_key)}
                                        color="primary"
                                        size="small"
                                      />
                                    ))
                                  ) : (
                                    <Checkbox
                                      checked={false}
                                      disabled={true}
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center" sx={{ px: 1 }}>
                                  {deletePermissions.length > 0 ? (
                                    deletePermissions.map(perm => (
                                      <Checkbox
                                        key={perm.id}
                                        checked={!!selectedPermissions[perm.permission_key]}
                                        onChange={() => handlePermissionChange(perm.permission_key)}
                                        color="primary"
                                        size="small"
                                      />
                                    ))
                                  ) : (
                                    <Checkbox
                                      checked={false}
                                      disabled={true}
                                      size="small"
                                    />
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  <Tooltip title={t('Advanced permissions settings')}>
                                    <span>
                                      <IconButton 
                                        size="small" 
                                        sx={{ 
                                          color: 'primary.main',
                                          opacity: feature.permissions.some(perm => perm.components.length > 0) ? 1 : 0.5
                                        }}
                                        onClick={() => handleNavigateToAdvancedSettings(module.module_key, feature.feature_key)}
                                        disabled={!feature.permissions.some(perm => perm.components.length > 0)}
                                      >
                                        <SettingsIcon fontSize="small" />
                                        {advancedPermissions[`${module.module_key}.${feature.feature_key}`] && (
                                          <Box 
                                            sx={{
                                              position: 'absolute',
                                              top: 0,
                                              right: 0,
                                              width: 8,
                                              height: 8,
                                              borderRadius: '50%',
                                              bgcolor: 'success.main'
                                            }}
                                          />
                                        )}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <InfoIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Click the <SettingsIcon sx={{ fontSize: '1rem', verticalAlign: 'middle' }} /> icon to configure advanced rules and attribute-based conditions.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        
        {/* Footer removed as buttons are now in the header */}
      </Card>
      
      {error && (
        <Box sx={{ mt: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Others Permissions Modal */}
      <Dialog 
        open={openOthersModal} 
        onClose={handleCloseOthersModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {currentFeatureName} - Configuration
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Box sx={{ display: 'flex', mb: 1 }}>
            <Button 
              variant={activeTab === 'special' ? 'contained' : 'outlined'}
              onClick={() => handleTabChange('special')} 
              sx={{ mr: 1 }}
            >
              Special Permissions
            </Button>
            <Button 
              variant={activeTab === 'components' ? 'contained' : 'outlined'}
              onClick={() => handleTabChange('components')}
            >
              Components
            </Button>
          </Box>
        </Box>
        <DialogContent>
          {activeTab === 'special' && (
            <Box sx={{ mt: 1 }}>
              {currentOtherPermissions.length > 0 ? (
                <FormGroup>
                  {currentOtherPermissions.map(perm => (
                    <FormControlLabel
                      key={perm.id}
                      control={
                        <Checkbox
                          checked={!!selectedPermissions[perm.permission_key]}
                          onChange={() => handlePermissionChange(perm.permission_key)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{perm.permission_key}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {perm.permission_description || perm.permission_name}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              ) : (
                <Typography>No special permissions available for this feature.</Typography>
              )}
            </Box>
          )}
          
          {activeTab === 'components' && (
            <Box sx={{ mt: 1 }}>
              {currentFeaturePermissions.some(p => p.components && p.components.length > 0) ? (
                <>
                  {currentFeaturePermissions.map(permission => (
                    permission.components && permission.components.length > 0 && (
                      <Box key={permission.id} sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
                          {permission.permission_name || permission.permission_key}
                        </Typography>
                        
                        <FormGroup sx={{ ml: 2 }}>
                          {permission.components.map(component => (
                            <FormControlLabel
                              key={component.id}
                              control={
                                <Checkbox
                                  checked={!!selectedComponents[component.component_key]}
                                  onChange={() => handleComponentChange(component.component_key)}
                                  color="primary"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">{component.component_name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {component.component_description}
                                  </Typography>
                                </Box>
                              }
                            />
                          ))}
                        </FormGroup>
                      </Box>
                    )
                  ))}
                </>
              ) : (
                <Typography>No components available for this feature.</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOthersModal}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Advanced Permissions Modal */}
      <AdvancedPermissionsModal 
        open={advancedPermissionsModalOpen}
        onClose={() => setAdvancedPermissionsModalOpen(false)}
        onSave={handleAdvancedPermissionsChange}
        moduleKey={currentModuleKey}
        featureKey={currentFeatureKey}
        moduleName={currentModuleName}
        featureName={currentFeatureName}
        permissionsData={currentAdvancedPermissionsData}
      />
    </Container>
  );
};

export default AddRolePage;
