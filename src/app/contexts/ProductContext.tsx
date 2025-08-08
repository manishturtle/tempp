'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProductContextType {
  selectedProductId: number | null;
  setSelectedProductId: (id: number | null) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

/**
 * Provider component for product-related state management
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function ProductProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const value = {
    selectedProductId,
    setSelectedProductId,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

/**
 * Hook to access product context
 * 
 * @returns {ProductContextType} Product context
 * @throws {Error} If used outside of ProductProvider
 */
export function useProductContext(): ProductContextType {
  const context = useContext(ProductContext);
  
  if (context === undefined) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  
  return context;
}
