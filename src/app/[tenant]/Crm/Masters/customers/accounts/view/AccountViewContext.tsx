'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

/**
 * AccountViewContextType defines the shape of the context data
 * It includes the accountId and a function to update it
 */
interface AccountViewContextType {
  accountId: string;
  setAccountId: (id: string) => void;
}

/**
 * AccountViewProviderProps defines the props for the context provider
 */
interface AccountViewProviderProps {
  children: ReactNode;
  initialAccountId?: string;
}

// Create the context with a default value
const AccountViewContext = createContext<AccountViewContextType | undefined>(undefined);

// Storage key for localStorage
const ACCOUNT_ID_STORAGE_KEY = 'currentAccountId';

/**
 * AccountViewProvider component
 * Provides account ID state and setter function to all child components
 * Uses localStorage to persist account ID between page navigations
 * 
 * @param {ReactNode} children - Child components that will have access to the context
 * @param {string} initialAccountId - Optional initial account ID value
 */
export function AccountViewProvider({ 
  children, 
  initialAccountId = '' 
}: AccountViewProviderProps) {
  // Initialize from localStorage or initialAccountId prop
  const [accountId, setAccountIdState] = useState<string>(() => {
    // When running on client, check localStorage first
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem(ACCOUNT_ID_STORAGE_KEY);
      return storedId || initialAccountId;
    }
    return initialAccountId;
  });
  
  // Custom setter that updates both state and localStorage
  const setAccountId = (id: string) => {
    setAccountIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, id);
    }
  };
  
  // If initialAccountId is provided and different from current, update
  useEffect(() => {
    if (initialAccountId && initialAccountId !== accountId) {
      setAccountId(initialAccountId);
    }
  }, [initialAccountId, accountId]);
  
  // Create a memoized value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    accountId,
    setAccountId,
  }), [accountId]);

  return (
    <AccountViewContext.Provider value={contextValue}>
      {children}
    </AccountViewContext.Provider>
  );
}

/**
 * Custom hook to use the account view context
 * @returns {AccountViewContextType} The account view context
 * @throws {Error} If used outside of an AccountViewProvider
 */
export function useAccountView(): AccountViewContextType {
  const context = useContext(AccountViewContext);
  
  if (context === undefined) {
    throw new Error('useAccountView must be used within an AccountViewProvider');
  }
  
  return context;
}
