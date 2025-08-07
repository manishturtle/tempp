'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProductSKUContextType {
  selectedSKU: string | null;
  setSelectedSKU: (sku: string | null) => void;
}

const ProductSKUContext = createContext<ProductSKUContextType | undefined>(undefined);

/**
 * Provider component for product SKU state management
 * Used for navigating between product listing and detail pages
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function ProductSKUProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [selectedSKU, setSelectedSKU] = useState<string | null>(null);

  const value = {
    selectedSKU,
    setSelectedSKU,
  };

  return (
    <ProductSKUContext.Provider value={value}>
      {children}
    </ProductSKUContext.Provider>
  );
}

/**
 * Hook to access product SKU context
 * 
 * @returns {ProductSKUContextType} Product SKU context
 * @throws {Error} If used outside of ProductSKUProvider
 */
export function useProductSKUContext(): ProductSKUContextType {
  const context = useContext(ProductSKUContext);
  
  if (context === undefined) {
    throw new Error('useProductSKUContext must be used within a ProductSKUProvider');
  }
  
  return context;
}
