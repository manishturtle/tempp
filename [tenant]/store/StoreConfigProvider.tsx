'use client';

import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useGetConfiguration } from '@/app/hooks/api/store/useGetConfiguration';
import { StoreConfigContext } from './layout';

export function StoreConfigProvider({ children }: { children: React.ReactNode }) {
  const { data: storeConfig, isLoading, error } = useGetConfiguration();
  
  // Show loading state while configuration is being fetched
  if (isLoading || !storeConfig) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state if configuration failed to load
  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'background.default',
        flexDirection: 'column',
        gap: 2
      }}>
        <div>Failed to load store configuration</div>
        <div>Please refresh the page</div>
      </Box>
    );
  }

  return (
    <StoreConfigContext.Provider value={storeConfig}>
      {children}
    </StoreConfigContext.Provider>
  );
}
