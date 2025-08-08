'use client';

import React from 'react';
import { DrawerProvider } from '../../../contexts/DrawerContext';

interface ServiceManagementLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for Service Management pages
 * Provides DrawerProvider context for all Service Management components that use AnimatedDrawer
 */
export default function ServiceManagementLayout({
  children,
}: ServiceManagementLayoutProps): React.ReactElement {
  return (
    <DrawerProvider>
      {children}
    </DrawerProvider>
  );
}
