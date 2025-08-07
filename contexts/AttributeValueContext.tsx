'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { Attribute as AttributeManagerAttribute, AttributeGroup as AttributeManagerGroup } from '@/app/components/admin/products/forms/AttributeValueManager';
import { useFetchAttributeGroups, useFetchAttributes } from '@/app/hooks/api/attributes';

// Define API response types
interface ApiResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * Type definition for the AttributeValue context
 */
interface AttributeValueContextType {
  // Selected attribute groups
  selectedGroups: number[];
  setSelectedGroups: (groups: number[]) => void;
  
  // Attributes data
  attributes: AttributeManagerAttribute[];
  attributesLoading: boolean;
  attributesError: Error | null;
  
  // Attribute groups data
  attributeGroups: AttributeManagerGroup[];
  groupsLoading: boolean;
  groupsError: Error | null;
  
  // Filtered attributes based on selected groups
  filteredAttributes: AttributeManagerAttribute[];
  
  // Actions
  handleGroupChange: (event: React.SyntheticEvent, value: AttributeManagerGroup[]) => void;
  handleRemoveAttribute: (attributeId: number) => void;
  handleVariantAttributeToggle: (attribute: AttributeManagerAttribute, isSelected: boolean) => void;
  
  // Product type state
  isVariableProduct: boolean;
  setIsVariableProduct: (isVariable: boolean) => void;
  
  // Selected variant attributes
  variantAttributes: AttributeManagerAttribute[];
}

/**
 * Create the context with default undefined value
 */
const AttributeValueContext = createContext<AttributeValueContextType | undefined>(undefined);

/**
 * Custom hook to use the AttributeValue context
 */
export const useAttributeValue = (): AttributeValueContextType => {
  const context = useContext(AttributeValueContext);
  if (!context) {
    throw new Error('useAttributeValue must be used within an AttributeValueProvider');
  }
  return context;
};

/**
 * Props for the AttributeValueProvider component
 */
interface AttributeValueProviderProps {
  children: ReactNode;
  initialVariableProduct?: boolean;
}

/**
 * Provider component that makes the attribute value context available to its children
 */
export const AttributeValueProvider: React.FC<AttributeValueProviderProps> = ({ 
  children,
  initialVariableProduct = false
}) => {
  // State for selected groups
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  
  // State for variable product
  const [isVariableProduct, setIsVariableProduct] = useState<boolean>(initialVariableProduct);
  
  // State for variant attributes
  const [variantAttributes, setVariantAttributes] = useState<AttributeManagerAttribute[]>([]);
  
  // Fetch attribute groups
  const { 
    data: attributeGroupsData, 
    isLoading: groupsLoading, 
    error: groupsError 
  } = useFetchAttributeGroups();
  
  // Fetch attributes
  const { 
    data: attributesData, 
    isLoading: attributesLoading, 
    error: attributesError 
  } = useFetchAttributes();
  
  // Process attribute groups data to ensure it's an array and map to the expected type
  const attributeGroups = useMemo<AttributeManagerGroup[]>(() => {
    if (!attributeGroupsData) return [];
    const groups = Array.isArray(attributeGroupsData) ? attributeGroupsData : attributeGroupsData.results || [];
    
    // Map API response to the expected AttributeManagerGroup type
    return groups.map(group => ({
      ...group,
      // Ensure required properties exist
      id: group.id,
      name: group.name,
      client_id: group.client_id || 0, // Default to 0 if undefined
      display_order: group.display_order || 0
    }));
  }, [attributeGroupsData]);
  
  // Process attributes data to ensure it's an array and map to the expected type
  const attributes = useMemo<AttributeManagerAttribute[]>(() => {
    if (!attributesData) return [];
    const attrs = Array.isArray(attributesData) ? attributesData : attributesData.results || [];
    
    // Map API response to the expected AttributeManagerAttribute type
    return attrs.map(attr => ({
      ...attr,
      // Ensure required properties exist
      id: attr.id,
      name: attr.name,
      code: attr.code,
      data_type: attr.data_type,
      data_type_display: attr.data_type_display || attr.data_type, // Default to data_type if display not available
      groups: attr.groups || [],
      options: attr.options || [],
      is_active: attr.is_active !== undefined ? attr.is_active : true,
      is_required: attr.is_required !== undefined ? attr.is_required : false,
      is_variant: attr.is_variant !== undefined ? attr.is_variant : false,
      validation_rules: attr.validation_rules || {}
    }));
  }, [attributesData]);
  
  // Filter attributes based on selected groups
  const filteredAttributes = useMemo<AttributeManagerAttribute[]>(() => {
    if (selectedGroups.length === 0) return [];
    
    return attributes.filter((attr) => 
      attr.is_active && 
      attr.groups.some((groupId) => selectedGroups.includes(groupId))
    );
  }, [attributes, selectedGroups]);
  
  // Handle attribute group selection change
  const handleGroupChange = useCallback((event: React.SyntheticEvent, value: AttributeManagerGroup[]) => {
    const newGroupIds = value.map((group) => group.id);
    
    // Find which groups were removed (if any)
    const removedGroupIds = selectedGroups.filter(id => !newGroupIds.includes(id));
    
    // If groups were removed, we need to clean up related attributes
    if (removedGroupIds.length > 0) {
      console.log('AttributeValueContext: Groups removed:', removedGroupIds);
      
      // Find attributes that belong exclusively to the removed groups
      // (i.e., they don't belong to any of the remaining selected groups)
      const attributesToRemove = attributes.filter(attr => {
        // Check if this attribute belongs to any of the removed groups
        const belongsToRemovedGroup = attr.groups.some(groupId => 
          removedGroupIds.includes(groupId)
        );
        
        // Check if this attribute also belongs to any of the remaining groups
        const belongsToRemainingGroup = attr.groups.some(groupId => 
          newGroupIds.includes(groupId)
        );
        
        // Remove if it belongs to a removed group but not to any remaining group
        return belongsToRemovedGroup && !belongsToRemainingGroup;
      });
      
      // Remove these attributes from variant attributes
      if (attributesToRemove.length > 0) {
        console.log('AttributeValueContext: Attributes to remove due to group removal:', 
          attributesToRemove.map(a => ({ id: a.id, name: a.name }))
        );
        
        // Create a list of IDs to remove for easier lookup
        const attributeIdsToRemove = attributesToRemove.map(attr => attr.id);
        
        // Update variant attributes by removing the attributes that belong to removed groups
        setVariantAttributes(prev => {
          // Filter out attributes that are in the remove list
          const updatedVariantAttributes = prev.filter(attr => 
            !attributeIdsToRemove.includes(attr.id)
          );
          
          console.log('AttributeValueContext: Updated variant attributes after group removal:', 
            updatedVariantAttributes.map(a => ({ id: a.id, name: a.name }))
          );
          
          return updatedVariantAttributes;
        });
        
        // Emit an event to notify components that variant attributes have changed due to group removal
        // This is important for components like AttributeValueManager to update their form state
        const event = new CustomEvent('variant-attributes-changed', {
          detail: {
            removedAttributeIds: attributeIdsToRemove,
            reason: 'group-removal',
            removedGroupIds
          }
        });
        window.dispatchEvent(event);
      }
    }
    
    // Update selected groups
    setSelectedGroups(newGroupIds);
  }, [selectedGroups, attributes]);
  
  // Handle removing an attribute
  const handleRemoveAttribute = useCallback((attributeId: number) => {
    // Also remove from variant attributes if present
    setVariantAttributes((prev) => prev.filter((attr) => attr.id !== attributeId));
  }, []);
  
  // Handle toggling an attribute for variants
  const handleVariantAttributeToggle = useCallback((attribute: AttributeManagerAttribute, isSelected: boolean) => {
    console.log(`AttributeValueContext: Toggling variant attribute ${attribute.name} (ID: ${attribute.id}) - isSelected: ${isSelected}`);
    
    // Create a modified copy of the attribute with the is_variant flag set based on selection
    const updatedAttribute = {
      ...attribute,
      is_variant: isSelected // Set the is_variant flag based on checkbox state
    };
    
    setVariantAttributes((prev) => {
      // Log current state for debugging
      console.log('AttributeValueContext: Current variant attributes before update:', 
        prev.map(a => ({ id: a.id, name: a.name, isVariant: a.is_variant }))
      );
      
      if (isSelected) {
        // First check if this attribute is already in the array to avoid duplicates
        const attributeExists = prev.some(attr => attr.id === attribute.id);
        
        if (attributeExists) {
          // If it exists, we need to update its is_variant flag
          console.log(`AttributeValueContext: Attribute ${attribute.name} (ID: ${attribute.id}) already exists, updating is_variant flag`);
          const newState = prev.map(attr => 
            attr.id === attribute.id ? updatedAttribute : attr
          );
          console.log('AttributeValueContext: Updated variant attributes after updating flag:', 
            newState.map(a => ({ id: a.id, name: a.name, isVariant: a.is_variant }))
          );
          return newState;
        }
        
        // Add the attribute if it doesn't exist
        const newState = [...prev, updatedAttribute];
        console.log('AttributeValueContext: New variant attributes after adding:', 
          newState.map(a => ({ id: a.id, name: a.name, isVariant: a.is_variant }))
        );
        return newState;
      } else {
        // Remove the attribute completely when unchecked
        const newState = prev.filter(attr => attr.id !== attribute.id);
        console.log('AttributeValueContext: New variant attributes after removing:', 
          newState.map(a => ({ id: a.id, name: a.name, isVariant: a.is_variant }))
        );
        return newState;
      }
    });
  }, []);
  
  // Create the context value object
  const value: AttributeValueContextType = {
    selectedGroups,
    setSelectedGroups,
    attributes,
    attributesLoading,
    attributesError,
    attributeGroups,
    groupsLoading,
    groupsError,
    filteredAttributes,
    handleGroupChange,
    handleRemoveAttribute,
    handleVariantAttributeToggle,
    isVariableProduct,
    setIsVariableProduct,
    variantAttributes
  };
  
  return (
    <AttributeValueContext.Provider value={value}>
      {children}
    </AttributeValueContext.Provider>
  );
};

export default AttributeValueContext;
