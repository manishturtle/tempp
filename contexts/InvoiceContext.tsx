'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface InvoiceContextType {
  invoiceId: string | null;
  setInvoiceId: (id: string | null) => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

// Local storage key for persisting invoice ID
const INVOICE_ID_STORAGE_KEY = 'ecommerce_current_invoice_id';

/**
 * Provider component for invoice-related state management
 * Persists invoice ID across page refreshes using localStorage
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function InvoiceProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [invoiceId, setInvoiceIdState] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedInvoiceId = localStorage.getItem(INVOICE_ID_STORAGE_KEY);
      if (savedInvoiceId) {
        setInvoiceIdState(savedInvoiceId);
      }
    }
  }, []);

  // Update localStorage when invoiceId changes
  const setInvoiceId = (id: string | null) => {
    setInvoiceIdState(id);
    
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(INVOICE_ID_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(INVOICE_ID_STORAGE_KEY);
      }
    }
  };

  const value = {
    invoiceId,
    setInvoiceId,
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
}

/**
 * Hook to access invoice context
 * 
 * @returns {InvoiceContextType} Invoice context
 * @throws {Error} If used outside of InvoiceProvider
 */
export function useInvoiceContext(): InvoiceContextType {
  const context = useContext(InvoiceContext);
  
  if (context === undefined) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }
  
  return context;
}
