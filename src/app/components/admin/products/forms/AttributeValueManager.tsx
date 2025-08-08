// src/components/AttributeValueManager/AttributeValueManager.tsx

import React, { FC, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Autocomplete, TextField, Alert, CircularProgress, Stack, Divider, Paper, Grid, IconButton, Checkbox, FormControl,
  FormHelperText, MenuItem, Select, Chip, Tooltip, AutocompleteChangeReason,
  Radio, RadioGroup, FormControlLabel, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Button
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslation } from 'react-i18next';
import { Control, useController, UseFormSetValue, Controller, FieldError, Path, FieldPath, FieldValues, useFormContext } from 'react-hook-form';
import { useFetchAttributeGroups, useFetchAttributes } from '@/app/hooks/api/attributes';

// --- Date Picker Imports ---
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Import the AttributeValue context
import { useAttributeValue, AttributeValueProvider } from '@/app/contexts/AttributeValueContext';
import dayjs from 'dayjs'; // Import dayjs

// --- Type Definitions ---
// (Ensure these match your actual project types)
interface UserReference {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface AttributeOption {
  id: number;
  client_id?: number; // Make optional to match API type
  company_id?: number; // Make optional to match API type
  option_label: string;
  option_value: string | number; // Allow number for values potentially
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: UserReference | null;
  updated_by?: UserReference | null;
}

interface ValidationRules {
  min_value?: number;
  max_value?: number;
  min_date?: string; // Expecting ISO string or YYYY-MM-DD
  max_date?: string; // Expecting ISO string or YYYY-MM-DD
  date_format?: string; // (Currently unused, DatePicker handles format)
  min_length?: number;
  max_length?: number;
  pattern?: string; // For regex
  integer_only?: boolean;
  min_selections?: number;
  max_selections?: number;
  [key: string]: any; // Allow other potential rules
}

export interface Attribute {
  id: number;
  client_id?: number; // Make optional to match API type
  company_id?: number; // Make optional to match API type
  name: string;
  code: string;
  label: string;
  description?: string | null;
  data_type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTI_SELECT'; // Use union type
  data_type_display?: string; // Make this optional to match API response
  validation_rules?: ValidationRules; // Make optional to match API type
  is_required: boolean;
  is_active: boolean;
  use_for_variants: boolean;
  is_variant?: boolean; // Flag to track if this attribute is selected for variants in UI
  groups: number[] | any[]; // Make more flexible to handle both number[] and AttributeGroup[]
  options?: AttributeOption[]; // Make optional to match API type
  created_at: string;
  updated_at: string;
  created_by?: UserReference | null;
  updated_by?: UserReference | null;
  isDisabled?: boolean; // New flag to mark variant-defining attributes for disabled state
}

export interface AttributeGroup {
    id: number;
    client_id?: number; // Make optional to match API type
    company_id?: number; // Make optional to match API type
    name: string;
    display_order?: number; // Make optional to match API type
    is_active: boolean; // Used for filtering groups
    created_at: string;
    updated_at: string;
    created_by?: UserReference | null;
    updated_by?: UserReference | null;
}

// Shape of the data managed by react-hook-form for this component
interface ProductAttributeValue {
    value: any; // Can be string, number, boolean, string[] (for multi-select), string (ISO for date) etc.
    use_variant: boolean;
    is_deleted?: boolean; // New flag to track if attribute is deleted
}
// Define a simpler form data structure that just focuses on what we need in this component
interface ProductFormData {
    attributes?: Record<string, ProductAttributeValue>; // Map attribute ID to its value/variant info
    [key: string]: any; // Allow any other fields
}

// Type for the form context
type FormContextType = any; // Using any to avoid TypeScript errors

// Define the structure of attribute values from the API
interface AttributeValue {
  id?: number;
  attribute: number;
  value?: any;
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: string;
  value_option?: number;
  use_variant?: boolean;
}

// --- Component Props Interface ---
interface AttributeValueManagerProps {
  control: Control<any>; // Using any type to avoid TypeScript errors
  setValue: UseFormSetValue<any>; // Using any type to avoid TypeScript errors
  onDeleteAttribute?: (attributeId: number) => void; // Callback to handle deletion in parent/form state
  watch?: any; // Function to watch form values, used to check product type
  defaultValues?: AttributeValue[]; // Default values for attributes with proper typing
  onVariantToggle?: (attribute: Attribute, isSelected: boolean) => void; // Callback when variant checkbox is toggled
  isVariableProduct?: boolean; // Flag to indicate if this is a variable product
  selectedGroupIds?: number[]; // IDs of selected attribute groups
  variantDefiningAttributeIds?: number[]; // IDs of attributes used for variants
  onValuesChange?: (values: any) => void; // Callback when attribute values change
  viewMode?: boolean; // Flag to indicate if the component is in view-only mode
}

// --- Helper Component: AttributeRow ---
interface AttributeRowProps {
    attribute: Attribute;
    control: Control<any>; // Using any type to avoid TypeScript errors
    viewMode?: boolean; // Flag to indicate if the component is in view-only mode
    onRemoveAttribute: (attributeId: number) => void;
    onVariantToggle?: (attribute: Attribute, isSelected: boolean) => void;
    isVariableProduct?: boolean; // Flag to indicate if product type is Variable
    isDisabled?: boolean; // Flag to indicate if attribute is disabled
}

const AttributeRow: FC<AttributeRowProps> = ({ attribute, control, onRemoveAttribute, onVariantToggle, isVariableProduct = false, isDisabled = false, viewMode = false }) => {
    // Access the context
    const { handleVariantAttributeToggle } = useAttributeValue();
    const { t } = useTranslation();
    // Access the form context to trigger validation
    // Using any type to avoid TypeScript errors with form context
    const methods = useFormContext<any>();
    
    // State to track if this attribute is being used for variants
    const [isVariantAttribute, setIsVariantAttribute] = useState<boolean>(false);
    
    // Use proper typing for nested paths in react-hook-form
    const fieldNameValue = `attributes.${attribute.id}.value` as Path<ProductFormData>;
    const fieldNameVariant = `attributes.${attribute.id}.use_variant` as Path<ProductFormData>;
    const fieldNameDeleted = `attributes.${attribute.id}.is_deleted` as Path<ProductFormData>;

    // --- Generate Validation Rules for RHF ---
    const getValidationRules = () => {
        const rules: any = {};
        const vr = attribute.validation_rules || {};
        const fieldLabel = attribute.label || attribute.name;

        // Required Rule (Applies to all types)
        if (attribute.is_required) {
            rules.required = t('form.validations.required');
            // For multi-select, required means at least one selection if min_selections isn't set
            if (attribute.data_type === 'MULTI_SELECT' && vr?.min_selections === undefined) {
                 if (!rules.validate) rules.validate = {};
                 rules.validate.required = (value: any[]) => (Array.isArray(value) && value.length > 0) || rules.required;
            }
             // For boolean, required usually means it must be true
             if (attribute.data_type === 'BOOLEAN') {
                  if (!rules.validate) rules.validate = {};
                  rules.validate.requiredTrue = (value: boolean) => value === true || rules.required;
             }
        }

        // Type-Specific Rules
        switch (attribute.data_type) {
            case 'TEXT':
                if (vr?.min_length !== undefined) rules.minLength = { value: vr.min_length, message: t('form.validations.minLength', { min: vr.min_length }) };
                if (vr?.max_length !== undefined) rules.maxLength = { value: vr.max_length, message: t('form.validations.maxLength', { max: vr.max_length }) };
                if (vr?.pattern) rules.pattern = { value: new RegExp(vr.pattern), message: t('form.validations.pattern') };
                break;
            case 'NUMBER':
                // For NUMBER type, we need to use a custom validation approach
                if (!rules.validate) rules.validate = {};
                
                // For NUMBER type, we need specialized validation
                
                // Add required validation if needed
                if (attribute.is_required) {
                    rules.required = t('form.validations.required');
                }
                
                // For number fields, we need a custom validation approach
                if (!rules.validate) rules.validate = {};
                
                // Log validation rules for debugging if needed
                if (vr?.min_value !== undefined || vr?.max_value !== undefined) {
                    console.log(`Setting up number validation for ${attribute.name}:`, vr);
                }
                
                // Add a comprehensive validator for number fields
                rules.validate.numberValidation = (value: any) => {
                    // Debug logging for number validation
                    if (process.env.NODE_ENV !== 'production' && (vr?.min_value !== undefined || vr?.max_value !== undefined)) {
                        console.log(`Validating number field ${attribute.name} with value:`, value);
                    }
                    
                    // Skip validation if empty and not required
                    if ((value === undefined || value === null || value === '') && !attribute.is_required) {
                        return true;
                    }
                    
                    // Handle empty values for required fields
                    if ((value === undefined || value === null || value === '') && attribute.is_required) {
                        return t('form.validations.required');
                    }
                    
                    // Convert to number for validation - ensure we're working with a number
                    let numValue: number;
                    try {
                        // Handle both string and number inputs
                        numValue = typeof value === 'string' ? Number(value) : value;
                    } catch (e) {
                        return t('form.validations.number');
                    }
                    
                    // Check if it's a valid number
                    if (isNaN(numValue)) {
                        return t('form.validations.number');
                    }
                    
                    // Integer-only check
                    if (vr?.integer_only && !Number.isInteger(numValue)) {
                        return t('form.validations.integerOnly');
                    }
                    
                    // Min value check
                    if (vr?.min_value !== undefined && numValue < vr.min_value) {
                        const errorMsg = t('form.validations.minValue', { min: vr.min_value });
                        
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`Min validation failed for ${fieldLabel}:`, { value, numValue, min: vr.min_value, errorMsg });
                        }
                        return errorMsg;
                    }
                    
                    // Max value check
                    if (vr?.max_value !== undefined && numValue > vr.max_value) {
                        const errorMsg = t('form.validations.maxValue', { max: vr.max_value });
                        
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`Max validation failed for ${fieldLabel}:`, { value, numValue, max: vr.max_value, errorMsg });
                        }
                        return errorMsg;
                    }
                    
                    // If we reach here, validation passed
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`Validation passed for ${fieldLabel}:`, { value, numValue });
                    }
                    return true;
                };
                break;
             case 'DATE':
                 // Add custom date validation
                 if (vr?.min_date || vr?.max_date) {
                     if (!rules.validate) rules.validate = {};
                     rules.validate.dateRange = (value: string) => {
                         if (!value) return true;
                         const date = dayjs(value);
                         if (!date.isValid()) return t('form.validations.pattern');
                         if (vr?.min_date && date.isBefore(dayjs(vr.min_date))) {
                             return t('validation.minDate', `"${fieldLabel}" must be on or after ${dayjs(vr.min_date).format('DD/MM/YYYY')}`);
                         }
                         if (vr?.max_date && date.isAfter(dayjs(vr.max_date))) {
                             return t('validation.maxDate', `"${fieldLabel}" must be on or before ${dayjs(vr.max_date).format('DD/MM/YYYY')}`);
                         }
                         return true;
                     };
                 }
                 break;
            case 'MULTI_SELECT':
                 if (vr?.min_selections !== undefined || vr?.max_selections !== undefined) {
                      if (!rules.validate) rules.validate = {};
                      rules.validate.selectionCount = (value: any[]) => { // Add specific named validation
                         const len = Array.isArray(value) ? value.length : 0;
                         if (vr?.min_selections !== undefined && len < vr.min_selections) return t('form.validations.minSelections', { min: vr.min_selections });
                         if (vr?.max_selections !== undefined && len > vr.max_selections) return t('form.validations.maxSelections', { max: vr.max_selections });
                         return true;
                     };
                 }
                break;
            case 'SELECT':
                // Add validation for SELECT type if needed
                break;
        }
        return rules;
    };

    // --- RHF Controllers ---
    // Get field state for error display, but use <Controller> for rendering inputs
    const { fieldState: valueFieldState } = useController({ name: fieldNameValue, control, rules: getValidationRules() });
    // Variant field can use useController directly as it's a simple checkbox
    const { field: variantField } = useController({ name: fieldNameVariant, control, defaultValue: false });

    const valueError = valueFieldState.error as FieldError | undefined;

    // --- Dynamic Input Rendering ---
    const renderInput = () => {
        // Add disabled state to common input props when variant checkbox is checked
        const commonInputProps = { 
            size: 'small' as 'small', 
            disabled: isVariantAttribute || isDisabled // Disable input when used for variants or when attribute is disabled
        };
        const rhfValidationRules = getValidationRules(); // Get rules for Controller

        switch (attribute.data_type) {
            case 'TEXT':
                return <Controller
                    name={fieldNameValue}
                    control={control}
                    rules={rhfValidationRules}
                    defaultValue=""
                    render={({ field }) => (
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder={attribute.label || attribute.name}
                            {...commonInputProps}
                            {...field}
                            helperText={valueError?.message}
                            disabled={viewMode}
                        />
                    )}
                />;
            case 'NUMBER':
                return <Controller
                    name={fieldNameValue}
                    control={control}
                    rules={rhfValidationRules}
                    defaultValue="" 
                    // Use string as internal value type to avoid React controlled input issues
                    render={({ field, fieldState }) => {
                        const vr = attribute.validation_rules || {};
                        // Get local error from fieldState
                        const localError = fieldState.error;
                        
                        // For debugging purposes in development
                        useEffect(() => {
                            if (process.env.NODE_ENV !== 'production' && (vr?.min_value !== undefined || vr?.max_value !== undefined)) {
                                console.log(`Number field ${attribute.name} state:`, {
                                    value: field.value,
                                    hasError: !!localError,
                                    errorMessage: localError?.message,
                                    validationRules: vr
                                });
                            }
                        }, [field.value, localError]);
                        
                        // Force validation on mount for required fields
                        useEffect(() => {
                            if (attribute.is_required) {
                                // Trigger validation after mounting
                                setTimeout(() => {
                                    field.onChange(field.value || ''); // Re-trigger validation
                                }, 100);
                            }
                        }, []);
                        
                        // Check if this is a number field with min/max constraints
                        const hasNumberConstraints = attribute.data_type === 'NUMBER' && 
                            (vr?.min_value !== undefined || vr?.max_value !== undefined);
                        
                        // Determine max allowed digits based on validation range
                        const getMaxDigits = (): number => {
                            if (!hasNumberConstraints) return 10; // Default to 10 digits if no constraints
                            
                            // Calculate max digits based on max value
                            if (vr?.max_value !== undefined) {
                                return vr.max_value.toString().length;
                            }
                            
                            // If only min value is defined, use its length + 1 as a reasonable default
                            if (vr?.min_value !== undefined) {
                                return vr.min_value.toString().length + 1;
                            }
                            
                            return 10; // Default to 10 digits
                        };
                        
                        const maxDigits = getMaxDigits();
                        
                        // State to track the current display value (as string)
                        const [displayValue, setDisplayValue] = useState<string>(
                            // Initialize from field.value
                            field.value === null || field.value === undefined ? '' : String(field.value)
                        );
                        
                        // Create a custom onChange handler that works with string values
                        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            
                            // Always update display value for controlled input
                            setDisplayValue(val);
                            
                            // Validate input format (digits, decimal, minus sign)
                            const numericRegex = /^-?\d*\.?\d*$/;
                            if (val !== '' && !numericRegex.test(val)) {
                                return; // Don't update form value if invalid format
                            }
                            
                            // Special case for empty string, partial inputs like '-', '.'
                            if (val === '' || val === '-' || val === '.' || val === '-.') {
                                // For empty or partial inputs, store the string directly
                                field.onChange(val);
                                
                                // Update in form context
                                const formContext = useFormContext();
                                if (formContext) {
                                    const attributeId = String(attribute.id);
                                    formContext.setValue(`attributes.${attributeId}.value`, val);
                                }
                                return;
                            }
                            
                            // For valid numbers, convert to numeric type
                            const numVal = Number(val);
                            
                            // Log for debugging in development
                            if (process.env.NODE_ENV !== 'production' && hasNumberConstraints) {
                                console.log(`onChange for ${attribute.name}: ${val} -> ${numVal} (max digits: ${maxDigits})`);
                            }
                            
                            // Update the field value
                            field.onChange(numVal);
                            console.log(`Updated attribute ${attribute.name} (${attribute.id}) value to: ${numVal}`);
                            
                            // Also update the attribute value in the form context
                            const formContext = useFormContext();
                            if (formContext) {
                                // Ensure the attribute exists in the attributes record
                                const attributeId = String(attribute.id);
                                const currentAttributes = formContext.getValues('attributes') || {};
                                
                                if (!currentAttributes[attributeId]) {
                                    // Initialize the attribute if it doesn't exist
                                    formContext.setValue(`attributes.${attributeId}`, {
                                        attribute_id: attribute.id,
                                        attribute_name: attribute.name,
                                        attribute_code: attribute.code,
                                        attribute_type: attribute.data_type,
                                        value: numVal,
                                        use_variant: false,
                                        is_deleted: false
                                    });
                                    console.log(`Initialized attribute ${attribute.name} (${attribute.id}) in form context`);
                                } else {
                                    // Update just the value if the attribute already exists
                                    formContext.setValue(`attributes.${attributeId}.value`, numVal);
                                    console.log(`Updated attribute ${attribute.name} (${attribute.id}) value in form context to: ${numVal}`);
                                }
                            }
                            
                            // Immediately validate for number fields with constraints
                            if (hasNumberConstraints && methods?.trigger) {
                                // Immediate validation is crucial for manual entry
                                methods.trigger(fieldNameValue);
                                
                                // Also perform validation after a short delay to ensure state is updated
                                setTimeout(() => {
                                    methods.trigger(fieldNameValue);
                                }, 100);
                            }
                        };
                        
                        // Create a custom onBlur handler
                        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                            // Sync displayValue with form state on blur to ensure we always submit the latest value
                            // This ensures the current displayed value is what gets submitted
                            if (displayValue === '' || displayValue === '-' || displayValue === '.' || displayValue === '-.') {
                                // For empty or partial inputs, store the empty string
                                field.onChange('');
                                
                                // Update in form context
                                const formContext = useFormContext();
                                if (formContext) {
                                    const attributeId = String(attribute.id);
                                    formContext.setValue(`attributes.${attributeId}.value`, '');
                                }
                            } else if (displayValue !== '' && !isNaN(Number(displayValue))) {
                                // For valid numbers, ensure the numeric value is in the form state
                                const numVal = Number(displayValue);
                                field.onChange(numVal);
                                
                                // Update in form context
                                const formContext = useFormContext();
                                if (formContext) {
                                    const attributeId = String(attribute.id);
                                    formContext.setValue(`attributes.${attributeId}.value`, numVal);
                                }
                            }
                            
                            field.onBlur();
                            
                            // Force validation on blur for all number fields
                            if (methods?.trigger) {
                                methods.trigger(fieldNameValue);
                            }
                            
                            // Validate values outside the allowed range for number fields
                            if (hasNumberConstraints) {
                                // Get the current value (from displayValue to ensure latest)
                                const currentValue = displayValue;
                                
                                // If value is a valid number, trigger validation to show error messages if outside range
                                if (currentValue !== '' && !isNaN(Number(currentValue))) {
                                    const numValue = Number(currentValue);
                                    
                                    // Check if value is outside constraints and trigger validation
                                    if ((vr?.min_value !== undefined && numValue < vr.min_value) || 
                                        (vr?.max_value !== undefined && numValue > vr.max_value)) {
                                        
                                        if (process.env.NODE_ENV !== 'production') {
                                            console.log(`Value outside range: ${numValue}, min: ${vr?.min_value}, max: ${vr?.max_value}`);
                                        }
                                        
                                        // Trigger validation to show error message
                                        if (methods?.trigger) methods.trigger(fieldNameValue);
                                    }
                                }
                            }
                        };
                        
                        return (
                            <TextField
                                fullWidth
                                type="text"
                                variant="outlined"
                                placeholder={attribute.label || attribute.name}
                                inputProps={{
                                    min: vr.min_value,
                                    max: vr.max_value,
                                    step: vr.integer_only ? 1 : 'any',
                                    // Add maxLength attribute to limit input length
                                    maxLength: maxDigits + ((vr?.min_value !== undefined && vr.min_value < 0) ? 1 : 0) // Add 1 for negative sign if needed
                                }}
                                {...commonInputProps}
                                // Use our controlled display value state for the input
                                value={displayValue}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                // Add keyUp and keyDown handlers to validate on manual entry
                                onKeyUp={(e) => {
                                    if (hasNumberConstraints && methods?.trigger) {
                                        // Immediate validation on key up
                                        methods.trigger(fieldNameValue);
                                    }
                                }}
                                disabled={viewMode}
                                onKeyDown={(e) => {
                                    // Allow special keys and control combinations
                                    const controlKeys = [
                                        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                        'Tab', 'Enter', 'Escape', 'Home', 'End'
                                    ];
                                    
                                    // Allow control combinations for copy/paste etc
                                    if (e.ctrlKey || e.metaKey || e.altKey) {
                                        return; // Allow all control combinations
                                    }
                                    
                                    // Check if key is a permitted key
                                    const isControlKey = controlKeys.includes(e.key);
                                    const isDigit = /^\d$/.test(e.key);
                                    const isDot = e.key === '.' && !displayValue.includes('.');
                                    const isMinus = e.key === '-' && 
                                                  (displayValue === '' || 
                                                   // Allow minus at start when replacing selection
                                                   window.getSelection()?.toString() === displayValue);
                                    
                                    // If not a permitted key, prevent default action
                                    if (!isControlKey && !isDigit && !isDot && !isMinus) {
                                        e.preventDefault();
                                    }
                                    
                                    // Prevent entering more digits than allowed
                                    if (isDigit || isDot) {
                                        const valueWithoutSymbols = displayValue.replace(/[-\.]/g, '');
                                        const selectionLength = window.getSelection()?.toString().length || 0;
                                        
                                        // Only check length if not replacing existing characters
                                        if (selectionLength === 0 && valueWithoutSymbols.length >= maxDigits) {
                                            e.preventDefault();
                                        }
                                    }
                                }}
                                // Show validation error if any
                                error={!!localError || !!valueError}
                                helperText={localError?.message || valueError?.message}
                                FormHelperTextProps={{
                                    sx: {
                                        fontWeight: (!!localError || !!valueError) ? 'bold' : 'normal',
                                        color: (!!localError || !!valueError) ? 'error.main' : 'inherit'
                                    }
                                }}
                                InputProps={{
                                    endAdornment: (vr?.min_value !== undefined || vr?.max_value !== undefined) && (
                                        <Tooltip title={`Valid range: ${vr?.min_value !== undefined ? vr.min_value : 'any'} - ${vr?.max_value !== undefined ? vr.max_value : 'any'}`}>
                                            <IconButton size="small" edge="end">
                                                <InfoIcon fontSize="small" color="info" />
                                            </IconButton>
                                        </Tooltip>
                                    )
                                }}
                            />
                        );
                    }}
                />;
            case 'BOOLEAN':
                return <Controller
                    name={fieldNameValue}
                    control={control}
                    rules={rhfValidationRules}
                    defaultValue={false}
                    render={({ field: { onChange, onBlur, value, ref, name } }) => {
                        // Ensure we're working with a proper boolean
                        const boolValue = value === true;
                        const { t } = useTranslation();
                        
                        // Log the current value for debugging
                        console.log(`Boolean field ${attribute.name} value:`, { raw: value, processed: boolValue });
                        
                        return (
                            <FormControl 
                                component="fieldset" 
                                error={!!valueError}
                                fullWidth
                                size="small"
                                disabled={isVariantAttribute || isDisabled || viewMode}
                            >
                                <RadioGroup
                                    row
                                    aria-label={attribute.label || attribute.name}
                                    name={name}
                                    value={boolValue.toString()} // Use string 'true'/'false' for RadioGroup
                                    onChange={(e) => {
                                        // Convert string 'true'/'false' to boolean
                                        const newValue = e.target.value === 'true';
                                        console.log(`Setting ${attribute.name} to:`, newValue);
                                        onChange(newValue);
                                    }}
                                    onBlur={onBlur}
                                >
                                    <FormControlLabel 
                                        value="true" 
                                        control={<Radio size="small" disabled={isVariantAttribute || isDisabled} />} 
                                        label={t('yes')} 
                                    />
                                    <FormControlLabel 
                                        value="false" 
                                        control={<Radio size="small" disabled={isVariantAttribute || isDisabled} />} 
                                        label={t('no')} 
                                    />
                                </RadioGroup>
                                {valueError && (
                                    <FormHelperText error>{valueError.message}</FormHelperText>
                                )}
                            </FormControl>
                        );
                    }}
                />;
            case 'DATE':
                return (
                    <Controller
                        name={fieldNameValue}
                        control={control}
                        rules={rhfValidationRules}
                        defaultValue={null}
                        render={({ field: { onChange, value, ref } }) => {
                            // Safely convert value to dayjs object
                            const dateValue = value ? dayjs(value as string) : null;
                            return (
                                <DatePicker
                                    value={dateValue}
                                    onChange={(date) => {
                                        // Format date as YYYY-MM-DD before saving
                                        const formattedDate = date ? date.format('YYYY-MM-DD') : null;
                                        onChange(formattedDate);
                                    }}
                                    minDate={attribute.validation_rules?.min_date ? dayjs(attribute.validation_rules.min_date) : undefined}
                                    maxDate={attribute.validation_rules?.max_date ? dayjs(attribute.validation_rules.max_date) : undefined}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            variant: "outlined",
                                            ...commonInputProps,
                                            helperText: valueError?.message || null,
                                            inputRef: ref
                                        }
                                    }}
                                    disabled={viewMode}
                                />
                            );
                        }}
                    />
                );
            case 'SELECT':
                return <Controller
                    name={fieldNameValue}
                    control={control}
                    rules={rhfValidationRules}
                    defaultValue={null}
                    render={({ field }) => {
                        // Convert field value to option object if it's just an ID
                        const selectedOption = field.value && typeof field.value === 'number' 
                            ? attribute.options?.find(opt => opt.id === field.value)
                            : field.value;

                        // Log current selection
                        console.log(`SELECT field ${attribute.name} value:`, { 
                            raw: field.value,
                            processed: selectedOption 
                        });

                        return (
                            <FormControl fullWidth size="small" disabled={isVariantAttribute || isDisabled}>
                                <Autocomplete
                                    value={selectedOption || null}
                                    onChange={(_, newValue) => {
                                        // Save the option ID for API
                                        const value = newValue ? newValue.id : null;
                                        console.log(`Setting ${attribute.name} to:`, { newValue, value });
                                        field.onChange(value);
                                    }}
                                    options={attribute.options || []}
                                    getOptionLabel={(option) => 
                                        typeof option === 'object' ? option.option_label : ''
                                    }
                                    isOptionEqualToValue={(option, value) =>
                                        option.id === value
                                    }
                                    disabled={isVariantAttribute || isDisabled || viewMode}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={attribute.label || attribute.name}
                                            error={!!valueError}
                                            helperText={valueError?.message}
                                            size='small'
                                            disabled={isVariantAttribute || isDisabled || viewMode}
                                        />
                                    )}
                                />
                            </FormControl>
                        );
                    }}
                />;
            case 'MULTI_SELECT':
                return <Controller
                    name={fieldNameValue}
                    control={control}
                    rules={rhfValidationRules}
                    defaultValue={[]}
                    render={({ field }) => {
                        // Convert field values to option objects if they're just IDs
                        const selectedOptions = Array.isArray(field.value) 
                            ? field.value.map(val => 
                                typeof val === 'number'
                                    ? attribute.options?.find(opt => opt.id === val)
                                    : val
                            ).filter(Boolean)
                            : [];

                        // Log current selection
                        console.log(`MULTI_SELECT field ${attribute.name} value:`, {
                            raw: field.value,
                            processed: selectedOptions
                        });

                        return (
                            <FormControl fullWidth size="small" disabled={isVariantAttribute || isDisabled}>
                                <Autocomplete
                                    multiple
                                    value={selectedOptions}
                                    onChange={(_, newValue) => {
                                        // Save array of option IDs for API
                                        const values = newValue.map(item => item.id);
                                        console.log(`Setting ${attribute.name} to:`, { newValue, values });
                                        field.onChange(values);
                                    }}
                                    options={attribute.options || []}
                                    getOptionLabel={(option) => 
                                        typeof option === 'object' ? option.option_label : ''
                                    }
                                    isOptionEqualToValue={(option, value) =>
                                        option.id === value
                                    }
                                    disabled={isVariantAttribute || isDisabled || viewMode}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={attribute.label || attribute.name}
                                            error={!!valueError}
                                            helperText={valueError?.message}
                                            size='small'
                                            disabled={isVariantAttribute || isDisabled || viewMode}
                                        />
                                    )}
                                    renderTags={(tagValue, getTagProps) =>
                                        tagValue.map((option, index) => (
                                            <Chip
                                                label={option.option_label}
                                                {...getTagProps({ index })}
                                                key={option.id}
                                                size="small"
                                            />
                                        ))
                                    }
                                />
                            </FormControl>
                        );
                    }}
                />;
            default:
                return <TextField fullWidth variant="outlined" placeholder={`Unsupported type: ${attribute.data_type}`} {...commonInputProps} disabled />;
        }
    };

    // --- Row Render ---
    return (
        <Paper variant="outlined" sx={{ p: 1, mb: 1, width: '100%' }}>
            <Grid container spacing={1} alignItems="center">
                {/* Specification Name as a non-editable text field with label */}
                <Grid item xs={12} sm={5}>
                    <TextField
                        value={attribute.label || attribute.name}
                        fullWidth
                        size="small"
                        InputProps={{
                            readOnly: true,
                        }}
                    />
                </Grid>
                {/* Value Input & Error */}
                <Grid item xs={12} sm={5}>
                    <FormControl fullWidth error={!!valueError}>
                        {renderInput()}
                        {/* Error message is now displayed within each input component */}
                    </FormControl>
                </Grid>
                
                {/* Use for Variant Checkbox - Only shown for Variable products AND only for SELECT/MULTI_SELECT attributes */}
                {isVariableProduct && (attribute.data_type === 'SELECT' || attribute.data_type === 'MULTI_SELECT') ? (
                    <Grid item xs={6} sm={2} sx={{ textAlign: 'center' }}>
                        <Tooltip title={!attribute.use_for_variants ? t('attributes.variantNotAllowedTooltip', 'This attribute cannot be used for variants') : t('attributes.useForVariantTooltip', 'Use this attribute to generate product variants')}>
                            <Box>
                                <Checkbox 
                                    checked={Boolean(variantField.value)} 
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        // Update form field value
                                        variantField.onChange(isChecked);
                                        
                                        // Update local state
                                        setIsVariantAttribute(isChecked);
                                        
                                        // Update the variant_defining_attributes array in the form
                                        const currentVariantAttrs = methods.getValues('variant_defining_attributes') || [];
                                        
                                        if (isChecked) {
                                            // Add this attribute ID to variant_defining_attributes if not already present
                                            if (!currentVariantAttrs.includes(attribute.id)) {
                                                methods.setValue('variant_defining_attributes', [...currentVariantAttrs, attribute.id]);
                                                console.log(`Added attribute ${attribute.id} (${attribute.name}) to variant_defining_attributes`);
                                            }
                                        } else {
                                            // Remove this attribute ID from variant_defining_attributes
                                            methods.setValue(
                                                'variant_defining_attributes', 
                                                currentVariantAttrs.filter((id: number) => id !== attribute.id)
                                            );
                                            console.log(`Removed attribute ${attribute.id} (${attribute.name}) from variant_defining_attributes`);
                                        }
                                        
                                        // Call the context method to update variant attributes
                                        handleVariantAttributeToggle(attribute, isChecked);
                                        
                                        // If checked, reset the value field
                                        if (isChecked) {
                                            // Always set to empty/null value regardless of type
                                            // This ensures all inputs are visibly cleared
                                            let resetValue = null;
                                            
                                            // For specific types that need special empty values
                                            if (attribute.data_type === 'TEXT') {
                                                resetValue = '';
                                            } else if (attribute.data_type === 'MULTI_SELECT') {
                                                resetValue = [];
                                            } else if (attribute.data_type === 'BOOLEAN') {
                                                resetValue = false;
                                            } else if (attribute.data_type === 'SELECT') {
                                                resetValue = '';
                                            }
                                            
                                            // Use setValue from the form context to reset the value
                                            // Using shouldDirty: true and shouldTouch: true to ensure the UI updates
                                            methods?.setValue?.(fieldNameValue, resetValue, { 
                                                shouldValidate: false, 
                                                shouldDirty: true,
                                                shouldTouch: true
                                            });
                                            
                                            // Force a re-render of the field by triggering change event
                                            setTimeout(() => {
                                                // Trigger a change event on the form to ensure the UI updates
                                                methods?.trigger?.(fieldNameValue);
                                                
                                                // For SELECT and MULTI_SELECT, we may need to force the Autocomplete to reset
                                                if (attribute.data_type === 'SELECT' || attribute.data_type === 'MULTI_SELECT') {
                                                    // Get the field element and dispatch a change event
                                                    const fieldElement = document.querySelector(`[name="${fieldNameValue}"]`);
                                                    if (fieldElement) {
                                                        const event = new Event('change', { bubbles: true });
                                                        fieldElement.dispatchEvent(event);
                                                    }
                                                }
                                            }, 0);
                                        }
                                        
                                        // Use the context to toggle variant attribute
                                        console.log('AttributeValueManager: Toggling variant attribute', {
                                            attributeId: attribute.id,
                                            attributeName: attribute.name,
                                            isChecked,
                                            timestamp: new Date().toISOString()
                                        });
                                        
                                        // First update the form value using methods from the form context
                                        methods?.setValue?.(`attributes.${attribute.id}.use_variant`, isChecked, {
                                            shouldValidate: false,
                                            shouldDirty: true,
                                            shouldTouch: true
                                        });
                                        
                                        // Then update the context state
                                        handleVariantAttributeToggle(attribute, isChecked);
                                    }} 
                                    onBlur={variantField.onBlur} 
                                    name={variantField.name} 
                                    ref={variantField.ref} 
                                    disabled={!attribute.use_for_variants || viewMode} 
                                    size="medium" 
                                    inputProps={{ 'aria-label': t('attributes.useForVariantLabel', 'Use for Variant') }} 
                                />
                            </Box>
                        </Tooltip>
                    </Grid>
                ) : (
                  // Empty Grid item to maintain layout when checkbox is hidden
                  <Grid item xs={6} sm={2}></Grid>
                )}

            </Grid>
        </Paper>
    );
};

// --- Main Component Implementation ---
const AttributeValueManager: FC<AttributeValueManagerProps> = ({ control, setValue, onDeleteAttribute, watch, selectedGroupIds = [], variantDefiningAttributeIds = [], onValuesChange, viewMode = false, defaultValues = [] }): React.ReactElement => {
  const { t } = useTranslation();
  const { handleVariantAttributeToggle: contextHandleVariantAttributeToggle } = useAttributeValue();
  const [selectedGroups, setSelectedGroups] = useState<AttributeGroup[]>([]);
  const [selectedVariantAttributes, setSelectedVariantAttributes] = useState<Attribute[]>([]);
  
  // Dialog state for group removal confirmation
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [groupToRemove, setGroupToRemove] = useState<{
    removedGroups: AttributeGroup[];
    newValue: AttributeGroup[];
  } | null>(null);
  
  // Check if product type is Variable (PARENT)
  // Import ProductType enum at the top of the file
  // ProductType.PARENT is 'PARENT' based on the enum definition
  const productType = watch ? watch('product_type') : null;
  const [isVariableProduct, setIsVariableProduct] = useState<boolean>(productType === 'PARENT');
  
  // Monitor changes to product type and update state to force re-render
  useEffect(() => {
    if (watch) {
      const currentProductType = watch('product_type');
      setIsVariableProduct(currentProductType === 'PARENT');
      console.log('Product type changed:', currentProductType, 'isVariableProduct:', currentProductType === 'PARENT');
    }
  }, [watch, productType]);

  // Data Fetching - Use selectedGroupIds for filtering when available
  const { data: groupsData, isLoading: groupsLoading, error: groupsError } = useFetchAttributeGroups({ is_active: true });
  
  // Fetch attributes for all selected groups
  // We use an empty filter to get all attributes, then filter them client-side
  // This ensures we get all attributes even if they belong to multiple groups
  const { data: attributesData, isLoading: attributesLoading, error: attributesError } = useFetchAttributes({});
  
  // Log selected group IDs for debugging
  useEffect(() => {
    if (selectedGroupIds && selectedGroupIds.length > 0) {
      console.log('Selected group IDs:', selectedGroupIds);
    }
  }, [selectedGroupIds]);
  
  // Extract the results array from the paginated response
  const groupsArray = groupsData?.results || [];
  // Ensure attributesData is an array
  const attributesArray = attributesData?.results || [];
  
  // Sync selectedGroups with groupsArray when selectedGroupIds changes
  useEffect(() => {
    if (selectedGroupIds && selectedGroupIds.length > 0 && groupsArray.length > 0) {
      const matchingGroups = groupsArray.filter(group => selectedGroupIds.includes(group.id));
      if (matchingGroups.length > 0) {
        setSelectedGroups(matchingGroups);
      }
    }
  }, [selectedGroupIds, groupsArray]);
  
  // Update the form's attribute_groups field whenever selectedGroups changes
  useEffect(() => {
    if (selectedGroups.length > 0) {
      const groupIds = selectedGroups.map(group => group.id);
      // Compare with current value to prevent unnecessary updates
      const currentGroups = watch('attribute_groups') || [];
      
      // Only update if the arrays are different
      if (JSON.stringify(currentGroups.sort()) !== JSON.stringify(groupIds.sort())) {
        setValue('attribute_groups', groupIds, { shouldDirty: true });
        console.log('Updated attribute_groups in form:', groupIds);
      }
    }
  }, [selectedGroups, setValue, watch]);
  
  // State to track excluded attribute IDs (attributes that have been removed by the user)
  const [excludedAttributeIds, setExcludedAttributeIds] = useState<number[]>([]);
  
  // State to track all attributes from all selected groups
  const [allGroupAttributes, setAllGroupAttributes] = useState<Attribute[]>([]);
  
  // Effect to update allGroupAttributes when attributesData changes
  useEffect(() => {
    if (attributesData?.results && attributesData.results.length > 0) {
      // Add new attributes without duplicates
      setAllGroupAttributes(prevAttributes => {
        const existingIds = new Set(prevAttributes.map(attr => attr.id));
        const newAttributes = attributesData.results.filter(attr => !existingIds.has(attr.id));
        
        if (newAttributes.length === 0) {
          return prevAttributes; // No new attributes to add
        }
        
        return [...prevAttributes, ...newAttributes];
      });
    }
  }, [attributesData]);
  
  // Effect to process defaultValues and set form values for attributes
  useEffect(() => {
    if (defaultValues && defaultValues.length > 0) {
      console.log('Processing default attribute values:', defaultValues);
      
      // If we don't have attributes loaded yet, try to get them from attributesData
      const attributesToUse = allGroupAttributes.length > 0 
        ? allGroupAttributes 
        : (attributesData?.results || []);
      
      if (attributesToUse.length === 0) {
        console.warn('No attributes available to process defaultValues');
        return; // Wait until attributes are available
      }
      
      console.log('Using attributes:', attributesToUse.map(a => ({ id: a.id, name: a.name })));
      
      // Process each attribute value from the API response
      defaultValues.forEach(attrValue => {
        console.log('Processing attribute value:', attrValue);
        
        // Find the corresponding attribute in attributesToUse
        const attribute = attributesToUse.find(attr => attr.id === attrValue.attribute);
        
        if (attribute) {
          console.log('Found matching attribute:', { id: attribute.id, name: attribute.name, dataType: attribute.data_type });
          
          // Set the attribute value in the form
          const fieldNameValue = `attributes.${attribute.id}.value`;
          const fieldNameVariant = `attributes.${attribute.id}.use_variant`;
          
          // Set the value based on the attribute type
          let valueToSet;
          
          switch (attribute.data_type) {
            case 'TEXT':
              valueToSet = attrValue.value_text !== undefined ? attrValue.value_text : attrValue.value;
              console.log(`Setting TEXT value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
              break;
            case 'NUMBER':
              valueToSet = attrValue.value_number !== undefined ? attrValue.value_number : attrValue.value;
              console.log(`Setting NUMBER value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
              break;
            case 'BOOLEAN':
              valueToSet = attrValue.value_boolean !== undefined ? attrValue.value_boolean : attrValue.value;
              console.log(`Setting BOOLEAN value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
              break;
            case 'DATE':
              valueToSet = attrValue.value_date !== undefined ? attrValue.value_date : attrValue.value;
              console.log(`Setting DATE value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
              break;
            case 'SELECT':
              // For SELECT, we need to set the option ID
              valueToSet = attrValue.value_option !== undefined 
                ? attrValue.value_option 
                : (attrValue.value && typeof attrValue.value === 'object' && 'id' in attrValue.value 
                  ? attrValue.value.id 
                  : attrValue.value);
              console.log(`Setting SELECT value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
              break;
            case 'MULTI_SELECT':
              // For MULTI_SELECT, we need to set an array of option IDs
              if (Array.isArray(attrValue.value)) {
                valueToSet = attrValue.value.map((v: any) => typeof v === 'object' && v !== null ? v.id : v);
              } else if (attrValue.value !== null && attrValue.value !== undefined) {
                valueToSet = [attrValue.value];
              } else {
                valueToSet = [];
              }
              console.log(`Setting MULTI_SELECT value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
              break;
            default:
              valueToSet = attrValue.value;
              console.log(`Setting default value for ${attribute.name}:`, valueToSet);
              setValue(fieldNameValue, valueToSet);
          }
          
          // Set the variant flag if this attribute is used for variants
          if (variantDefiningAttributeIds.includes(attribute.id)) {
            console.log(`Setting use_variant=true for ${attribute.name}`);
            setValue(fieldNameVariant, true);
          }
        } else {
          console.warn(`Could not find attribute with ID ${attrValue.attribute} in loaded attributes`);
        }
      });
    }
  }, [defaultValues, allGroupAttributes, attributesData, setValue, variantDefiningAttributeIds]);
  
  // Effect to reset allGroupAttributes when all groups are removed
  useEffect(() => {
    if (selectedGroupIds.length === 0) {
      setAllGroupAttributes([]);
    }
  }, [selectedGroupIds]);

  // Filtering Logic (Shows attributes from all selected groups, including variant-defining ones but marked for disabled state)
  const filteredAttributes = useMemo(() => {
    // If no attributes or no groups selected, return empty array
    if (attributesData?.results?.length === 0 || selectedGroupIds.length === 0) return [];
    
    // Get all attributes from the API response
    const allAttributes = attributesData?.results || [];
    
    // Filter attributes based on selected groups and excluded attributes
    return allAttributes
      .filter(attribute => {
        // Check if attribute is active
        if (attribute.is_active !== true) return false;
        
        // Check if attribute is not in excluded list
        if (excludedAttributeIds.includes(attribute.id)) return false;
        
        // Check if attribute belongs to any of the currently selected groups
        const attrGroups = Array.isArray(attribute.groups) ? attribute.groups : [];
        
        // Handle both cases: groups as number[] or as AttributeGroup[]
        if (attrGroups.length === 0) return false;
        
        if (typeof attrGroups[0] === 'number') {
          return selectedGroupIds.some(groupId => (attrGroups as number[]).includes(groupId));
        } else if (typeof attrGroups[0] === 'object') {
          return selectedGroupIds.some(groupId => 
            (attrGroups as any[]).some(group => group.id === groupId)
          );
        }
        
        return false;
      })
      .map(attribute => ({
        ...attribute,
        // Mark as disabled if it's a variant-defining attribute
        isDisabled: variantDefiningAttributeIds?.includes(attribute.id) || false
      }));
  }, [attributesData, selectedGroupIds, excludedAttributeIds, variantDefiningAttributeIds]);
  
  // Handler to remove an attribute from the filtered list
  const handleRemoveAttribute = (attributeId: number) => {
    setExcludedAttributeIds(prev => [...prev, attributeId]);
    // If parent component provided a callback, call it too
    if (onDeleteAttribute) {
      onDeleteAttribute(attributeId);
    }
    
    // Also remove from selected variant attributes if it exists there
    setSelectedVariantAttributes(prev => prev.filter(attr => attr.id !== attributeId));
  };
  
  // Manual function to get current attribute values - only called when needed
  const getAttributeValues = () => {
    if (!filteredAttributes.length || !watch) return [];
    
    // Filter attributes with values and map to API format
    return filteredAttributes
      .filter(attr => {
        const value = watch(`attributes.${attr.id}.value`);
        return value !== undefined && value !== null && value !== '';
      })
      .map(attr => {
        // Create the base attribute value object with only the required fields
        // The backend expects a simple structure with just attribute ID and value
        return {
          attribute: attr.id,
          value: watch(`attributes.${attr.id}.value`)
        };
      });
  };
  
  // Update parent component with current values - called from attribute row components
  const updateParentValues = useCallback(() => {
    if (!viewMode && onValuesChange) {
      const values = getAttributeValues();
      if (values.length > 0) {
        onValuesChange(values);
      }
    }
  }, [filteredAttributes, onValuesChange, viewMode, watch]);
  

  // Handler for when an attribute is selected/deselected for variants
  const handleVariantAttributeToggle = (attribute: Attribute, isSelected: boolean) => {
    if (isSelected) {
      // Add to selected attributes if not already there
      setSelectedVariantAttributes(prev => {
        // Check if attribute is already in the array
        const exists = prev.some(attr => attr.id === attribute.id);
        if (!exists) {
          const newArray = [...prev, attribute];
          console.log('Selected variant attributes:', newArray);
          return newArray;
        }
        return prev;
      });
    } else {
      // Remove from selected attributes
      setSelectedVariantAttributes(prev => {
        const newArray = prev.filter(attr => attr.id !== attribute.id);
        console.log('Selected variant attributes:', newArray);
        return newArray;
      });
    }
    
    // Always update the context state to keep it in sync
    contextHandleVariantAttributeToggle(attribute, isSelected);
  };

  // Loading/Error States
  const isLoading: boolean = groupsLoading || attributesLoading;
  const fetchError: Error | unknown = groupsError || attributesError;

  // --- Render Logic ---
  return (
    // IMPORTANT: Wrap with LocalizationProvider for Date Pickers
    <LocalizationProvider dateAdapter={AdapterDayjs}>
        
                <>
             
                 {/* Group Selector */}
                  <Autocomplete<AttributeGroup, true>
                     multiple options={groupsArray}
                     getOptionLabel={(option) => `${option?.name ?? 'Unnamed'} (ID: ${option?.id ?? 'N/A'})`}
                     value={selectedGroups}
                     onChange={(event, newValue) => {
                       // Find which groups were removed (if any)
                       const newGroupIds = newValue.map(group => group.id);
                       const removedGroupIds = selectedGroups
                         .map(group => group.id)
                         .filter(id => !newGroupIds.includes(id));
                       
                       // If groups were removed, show confirmation dialog
                       if (removedGroupIds.length > 0) {
                         console.log('AttributeValueManager: Groups removal requested:', removedGroupIds);
                         
                         // Find the removed groups
                         const removedGroups = selectedGroups.filter(group => 
                           removedGroupIds.includes(group.id)
                         );
                         
                         // Store the new value and removed groups for later use
                         setGroupToRemove({
                           removedGroups,
                           newValue
                         });
                         
                         // Open confirmation dialog
                         setConfirmDialogOpen(true);
                         
                         // Don't update the state yet - wait for confirmation
                         return;
                       }
                       
                       // If no groups were removed, just update the state
                       setSelectedGroups(newValue);
                     }}
                     renderInput={(params) => ( <TextField {...params} variant="outlined" label={t('attributes.selectGroupsToAdd')} placeholder={ isLoading ? t('loading') : (groupsArray.length > 0) ? t('attributes.selectGroupsPlaceholder') : t('attributes.noActiveGroupsAvailable') } fullWidth size="small" /> )}
                     loading={groupsLoading}
                     noOptionsText={t('attributes.noActiveGroups')}
                     isOptionEqualToValue={(option, value) => option?.id === value?.id}
                     sx={{ mb: 2 }}
                     disabled={viewMode}
                 />
                 <Divider sx={{ mb: 2 }} />

                 {/* Loading/Error Display for Attribute Section */}
                 {attributesLoading && !groupsLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={25} /> <Typography sx={{ml:1}} color="text.secondary">Loading attributes...</Typography>
                    </Box>
                )}
                 {fetchError && !attributesLoading && (
                     <Alert severity="error" sx={{ mt: 2 }}>
                         Error loading data: {(fetchError instanceof Error) ? fetchError.message : 'Unknown error'}
                     </Alert>
                )}


                 {/* --- Header Row --- */}
                {!attributesLoading && !fetchError && filteredAttributes.length > 0 && (
                    <Paper elevation={0} sx={{ p: 1, mb: 1, backgroundColor: 'action.hover', display: { xs: 'none', sm: 'block' } }}>
                        <Grid container spacing={1} alignItems="center">
                            <Grid item xs={12} sm={5}><Typography variant="caption" fontWeight="bold" sx={{ pl: 1 }}>{t('attributes.headerSpecName', 'Specification Name')}</Typography></Grid>
                            <Grid item xs={12} sm={isVariableProduct ? 5 : 7}><Typography variant="caption" fontWeight="bold">{t('attributes.headerValue', 'Value')}</Typography></Grid>
                            {isVariableProduct && (
                                <Grid item xs={6} sm={2} sx={{ textAlign: 'center' }}>
                                    <Tooltip title={t('attributes.useForVariantTooltip', 'Use this attribute to generate product variants')}>
                                        <Typography variant="caption" fontWeight="bold">{t('attributes.headerUseVariant', 'Use Variant')}</Typography>
                                    </Tooltip>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                 )}

                {/* Attribute Rows */}
                {!attributesLoading && !fetchError && (
                    <Stack spacing={0}> {/* Use Stack for the list of rows */}
                     {filteredAttributes.length > 0 ? (
                         filteredAttributes.map((attribute) => (
                              <AttributeRow
                                 key={attribute.id}
                                 attribute={attribute}
                                 control={control}
                                 onRemoveAttribute={handleRemoveAttribute}
                                 onVariantToggle={handleVariantAttributeToggle}
                                 isVariableProduct={isVariableProduct}
                                 isDisabled={attribute.isDisabled}
                                 viewMode={viewMode}
                              />
                         ))
                     ) : (
                        // Show message only if groups are selected but no matching attributes found
                        selectedGroups.length > 0 && (
                            <Typography sx={{ fontStyle: 'italic', color: 'text.secondary', textAlign: 'center', p:2 }}>
                               {t('attributes.noMatchingActiveAttributes')}
                            </Typography>
                        )
                     )}
                     {/* Prompt if no groups are selected yet and not loading */}
                     {selectedGroups.length === 0 && !attributesLoading && (
                         <Typography sx={{ fontStyle: 'italic', color: 'text.secondary', textAlign: 'center', p:2 }}>
                          {t('attributes.selectGroupPromptToAdd')}
                         </Typography>
                     )}
                    </Stack>
                )}
                {/* Confirmation Dialog for Group Removal */}
                <Dialog
                  open={confirmDialogOpen}
                  onClose={() => setConfirmDialogOpen(false)}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                    {t('attributes.confirmGroupRemoval')}
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                      {t('attributes.confirmGroupRemovalMessage')}
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button 
                      onClick={() => {
                        if (groupToRemove) {
                          const { removedGroups, newValue } = groupToRemove;
                          const removedGroupIds = removedGroups.map(group => group.id);
                          const newGroupIds = newValue.map(group => group.id);
                          
                          console.log('AttributeValueManager: Confirming groups removal:', removedGroupIds);
                          
                          // Find attributes that belong exclusively to the removed groups
                          const attributesToReset = attributesArray.filter(attr => {
                            // Check if this attribute belongs to any of the removed groups
                            const belongsToRemovedGroup = attr.groups && attr.groups.length > 0 && 
                              attr.groups.some((group: any) => {
                                // Handle both cases: when group is a number or an object with id
                                const groupId = typeof group === 'number' ? group : group?.id;
                                return removedGroupIds.includes(groupId);
                              });
                            
                            // Check if this attribute also belongs to any of the remaining groups
                            const belongsToRemainingGroup = attr.groups && attr.groups.length > 0 && 
                              attr.groups.some((group: any) => {
                                // Handle both cases: when group is a number or an object with id
                                const groupId = typeof group === 'number' ? group : group?.id;
                                return newGroupIds.includes(groupId);
                              });
                            
                            // Reset if it belongs to a removed group but not to any remaining group
                            return belongsToRemovedGroup && !belongsToRemainingGroup;
                          });
                          
                          // Reset form values for these attributes
                          if (attributesToReset.length > 0) {
                            console.log('AttributeValueManager: Resetting form values for attributes:', 
                              attributesToReset.map(a => ({ id: a.id, name: a.name }))
                            );
                            
                            // First, update local state and context for all variant attributes
                            attributesToReset.forEach(attr => {
                              // Update local state
                              setSelectedVariantAttributes(prev => 
                                prev.filter(a => a.id !== attr.id)
                              );
                              
                              // Update context state directly
                              contextHandleVariantAttributeToggle(attr, false);
                            });
                            
                            // Then reset form values for each attribute
                            attributesToReset.forEach(attr => {
                              // Reset the attribute value
                              setValue(`attributes.${attr.id}.value`, null);
                              // Reset the variant checkbox
                              setValue(`attributes.${attr.id}.use_variant`, false, {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true
                              });
                            });
                            
                            // Also remove from excluded attributes to ensure they show up again if the group is re-added
                            setExcludedAttributeIds(prev => 
                              prev.filter(id => !attributesToReset.some(attr => attr.id === id))
                            );
                            
                            // Remove from selected variant attributes in local state
                            setSelectedVariantAttributes(prev => 
                              prev.filter(attr => !attributesToReset.some(a => a.id === attr.id))
                            );
                            
                            // Dispatch a custom event to notify other components about the change
                            const attributeIds = attributesToReset.map(attr => attr.id);
                            const event = new CustomEvent('attribute-group-removed', {
                              detail: {
                                removedGroupIds,
                                removedAttributeIds: attributeIds
                              }
                            });
                            window.dispatchEvent(event);
                          }
                          
                          // Update selected groups
                          setSelectedGroups(newValue);
                        }
                        
                        // Close the dialog
                        setConfirmDialogOpen(false);
                        setGroupToRemove(null);
                      }} 
                      color="primary" 
                      autoFocus
                    >
                      {t('common.delete')}
                    </Button>
                  </DialogActions>
                </Dialog>
                </>
            
    </LocalizationProvider>
  );
};

// Export the component directly since we're now providing the context at the ProductForm level
export default AttributeValueManager;