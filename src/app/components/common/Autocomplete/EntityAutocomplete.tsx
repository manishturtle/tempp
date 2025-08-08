'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  AutocompleteProps
} from '@mui/material';
import { Controller, Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Generic entity type with common properties
export interface Entity {
  id: number | string;
  name: string;
  is_active?: boolean;
  [key: string]: any; // Allow for additional properties
}

export interface EntityAutocompleteProps {
  name: string;
  control: Control<any>;
  label: string;
  apiEndpoint: string | (() => string); // Can be either a string or a function that returns a string
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  filterParams?: Record<string, string | number | boolean>;
  onChange?: (value: Entity | null) => void;
  dependsOn?: {
    field: string;
    param: string;
  };
  value?: any;
  valueField?: string; // Field to use as the value (default: 'id')
  getOptionLabel?: (option: Entity) => string; // Custom function to get option label
}

/**
 * A reusable autocomplete component for entity selection
 * Handles API fetching, filtering, and form integration
 */
const EntityAutocomplete: React.FC<EntityAutocompleteProps> = ({
  name,
  control,
  label,
  apiEndpoint,
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  filterParams = { is_active: true },
  onChange,
  dependsOn,
  value,
  valueField = 'id',
  getOptionLabel = (option) => option?.name || ''
}) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

  // Build query string from filter params
  const buildQueryString = (params: Record<string, any>): string => {
    const queryParams = new URLSearchParams();
    
    // Use a proper type guard to check if apiEndpoint is a function
    const isFunction = (value: string | (() => string)): value is (() => string) => {
      return typeof value === 'function';
    };
    
    // Resolve the endpoint to a string
    const resolvedEndpoint = isFunction(apiEndpoint) ? apiEndpoint() : apiEndpoint;
    
    // Add paginate=false for specific endpoints that need all data for dropdowns
    const noPaginationEndpoints = ['/shared/currencies/', '/shared/countries/', '/products/catalogue/divisions/'];
    if (noPaginationEndpoints.includes(resolvedEndpoint)) {
      queryParams.append('paginate', 'false');
    }
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  };

  // All endpoints now require authentication for multi-tenant architecture
  const requiresAuth = (): boolean => {
    return true; // Always return true to ensure all API requests are authenticated
  };

  // Fetch data from API
  const fetchData = async (params: Record<string, any> = {}) => {
    setLoading(true);
    try {
      // Combine default filter params with any additional params
      const allParams = { ...filterParams, ...params };
      
      // Handle the endpoint - it could be a string or a function
      // Use a proper type guard to check if apiEndpoint is a function
      const isFunction = (value: string | (() => string)): value is (() => string) => {
        return typeof value === 'function';
      };
      
      let resolvedEndpoint = isFunction(apiEndpoint) ? apiEndpoint() : apiEndpoint;
      
      // For specific endpoints, explicitly add paginate=false
      if (
        resolvedEndpoint.includes('/products/catalogue/divisions/') || 
        resolvedEndpoint.includes('/products/catalogue/categories/') ||
        resolvedEndpoint.includes('/products/catalogue/subcategories/')
      ) {
        allParams.paginate = 'false';
      }
      
      // Special handling for subcategories when filtering by category
      let endpoint = resolvedEndpoint;
      
      // When dealing with subcategories that depend on a category
      if (resolvedEndpoint.includes('/products/catalogue/subcategories/') && 
          dependsOn?.field && 
          dependsOn.param === 'category' && 
          value && 
          value[dependsOn.field]) {
        // For subcategories, we use the category ID as a query parameter
        allParams.category = value[dependsOn.field];
      }
      
      const queryString = buildQueryString(allParams);
      
      // Always add auth headers for all endpoints
      const headers = getAuthHeaders();
      
      const response = await api.get(`${endpoint}${queryString}`, {
        headers
      });
      // console.log(`${name} API Response:`, response.data);

      // Handle different response structures
      let entitiesData: Entity[] = [];
      if (Array.isArray(response.data)) {
        entitiesData = response.data;
      } else if (response.data && response.data.results) {
        entitiesData = response.data.results;
      }
      
      // Filter out inactive entities (if not already filtered by API)
      const activeEntities = entitiesData.filter((entity: Entity) => entity.is_active !== false);
      setOptions(activeEntities);
      // console.log(`Active ${name}:`, activeEntities);
    } catch (error) {
      console.error(`Error fetching ${name}:`, error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Create a memoized version of the endpoint for dependency tracking
  const memoizedEndpoint = useMemo(() => {
    // Use a proper type guard to check if apiEndpoint is a function
    const isFunction = (value: string | (() => string)): value is (() => string) => {
      return typeof value === 'function';
    };
    
    return isFunction(apiEndpoint) ? apiEndpoint() : apiEndpoint;
  }, [apiEndpoint]);
  
  // Combined effect for data fetching
  useEffect(() => {
    if (dependsOn && dependsOn.field && value && dependsOn.param) {
      // If we have a dependency, only fetch when that value exists
      const params = { [dependsOn.param]: value[dependsOn.field] };
      fetchData(params);
    } else if (!dependsOn) {
      // If no dependency, fetch only once
      fetchData();
    }
  }, [memoizedEndpoint, dependsOn?.field && value?.[dependsOn.field]]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={options}
          loading={loading}
          disabled={disabled}
          getOptionLabel={getOptionLabel}
          value={options.find(option => option[valueField] === field.value) || null}
          onChange={(event, newValue) => {
            field.onChange(newValue ? newValue[valueField] : '');
            if (onChange) {
              onChange(newValue);
            }
            // console.log(`Selected ${name}:`, newValue);
          }}
          isOptionEqualToValue={(option, value) => option?.[valueField] === value?.[valueField]}
          renderInput={(params) => (
            <TextField
              {...params}
              label={required ? `${label} *` : label}
              size="small"
              error={!!fieldState.error || error}
              helperText={fieldState.error?.message || helperText}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
};

export default EntityAutocomplete;
