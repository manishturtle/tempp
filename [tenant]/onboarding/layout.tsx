"use client";

import React from 'react';
import { Box } from '@mui/material';
import { ThemeProvider } from '@/app/theme/ThemeContext';
import { LanguageProvider } from '@/app/i18n/LanguageContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/app/i18n/i18n-config';
import { QueryProvider } from '@/app/components/providers/QueryProvider';
import { AuthProvider } from '@/app/contexts/AuthContext';

/**
 * Layout component for the onboarding section
 * This layout wraps all onboarding pages with necessary providers
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <LanguageProvider>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100vh',
                  bgcolor: 'background.default',
                }}
              >
                {children}
              </Box>
            </LanguageProvider>
          </I18nextProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
