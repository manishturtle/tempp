'use client';

import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { RoleAccessProvider } from '../../../contexts/ai-platform/RoleAccessContext';
import { TenantProvider } from '../../../contexts/ai-platform/TenantContext';

interface AIPlatformLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for AI Platform pages
 * Provides necessary context providers for AI Platform functionality
 */
export default function AIPlatformLayout({
  children,
}: AIPlatformLayoutProps): React.ReactElement {
  return (
    <TenantProvider>
      <RoleAccessProvider>
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        }>
          {children}
        </Suspense>
      </RoleAccessProvider>
    </TenantProvider>
  );
}
