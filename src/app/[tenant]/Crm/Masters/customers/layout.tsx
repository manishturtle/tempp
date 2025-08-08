"use client";

/**
 * Customers Layout Component
 * 
 * This layout component wraps all customer-related pages and provides common UI elements
 */
import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Box 
      component="main" 
      sx={{ 
        flexGrow: 1, 
        width: '100%', 
        height: '100%',
        overflow: 'auto'
      }}
    >
      {children}
    </Box>
  );
}
