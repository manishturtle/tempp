'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Attribute } from '../components/admin/products/forms/AttributeValueManager';

// Define the context type
interface ProductAttributesContextType {
  selectedVariantAttributes: Attribute[];
  setSelectedVariantAttributes: React.Dispatch<React.SetStateAction<Attribute[]>>;
  toggleVariantAttribute: (attribute: Attribute, isSelected: boolean) => void;
}

// Create the context with a default value
const ProductAttributesContext = createContext<ProductAttributesContextType | undefined>(undefined);

// Provider component
interface ProductAttributesProviderProps {
  children: ReactNode;
}

export const ProductAttributesProvider = ({ children }: ProductAttributesProviderProps): React.ReactElement => {
  const [selectedVariantAttributes, setSelectedVariantAttributes] = useState<Attribute[]>([]);

  // Helper function to toggle variant attributes
  const toggleVariantAttribute = (attribute: Attribute, isSelected: boolean): void => {
    console.log('Context: toggling variant attribute', attribute.name, isSelected);
    
    if (isSelected) {
      setSelectedVariantAttributes(prev => {
        const updated = [...prev, attribute];
        console.log('Context: updated variant attributes after adding:', updated);
        return updated;
      });
    } else {
      setSelectedVariantAttributes(prev => {
        const updated = prev.filter(attr => attr.id !== attribute.id);
        console.log('Context: updated variant attributes after removing:', updated);
        return updated;
      });
    }
  };

  return (
    <ProductAttributesContext.Provider
      value={{
        selectedVariantAttributes,
        setSelectedVariantAttributes,
        toggleVariantAttribute
      }}
    >
      {children}
    </ProductAttributesContext.Provider>
  );
};

// Custom hook for using the context
export const useProductAttributes = (): ProductAttributesContextType => {
  const context = useContext(ProductAttributesContext);
  if (context === undefined) {
    throw new Error('useProductAttributes must be used within a ProductAttributesProvider');
  }
  return context;
};
