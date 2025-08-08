'use client';

import React, { createContext, useContext, useState } from 'react';

interface AuthRefreshContextType {
  refreshTrigger: number;
  refreshAuthState: () => void;
}

const AuthRefreshContext = createContext<AuthRefreshContextType | undefined>(undefined);

/**
 * Provider component for the AuthRefresh context
 * This allows components to trigger a refresh of auth-dependent components
 * without needing to reload the entire page
 */
export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAuthState = () => {
    // Increment the counter to trigger re-renders in subscribed components
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AuthRefreshContext.Provider value={{ refreshTrigger, refreshAuthState }}>
      {children}
    </AuthRefreshContext.Provider>
  );
}

/**
 * Hook to access the AuthRefresh context
 * Components can use this to refresh auth-dependent components like the Header
 */
export function useAuthRefresh() {
  const context = useContext(AuthRefreshContext);
  if (context === undefined) {
    throw new Error('useAuthRefresh must be used within an AuthRefreshProvider');
  }
  return context;
}
