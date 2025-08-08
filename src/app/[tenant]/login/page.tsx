"use client";

import React from "react";
import { LoginForm } from "@/app/auth/components/LoginForm";
import { QueryProvider } from "@/app/auth/providers/query-provider";
import { ThemeProvider } from "@/app/theme/ThemeContext";
import { LanguageProvider } from "@/app/i18n/LanguageContext";
import { I18nextProvider } from "react-i18next";
import i18n from "@/app/i18n/i18n-config";
import { AuthProvider } from "@/app/contexts/AuthContext";

/**
 * Login page
 */
export default function LoginPage(): React.ReactElement {

  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <LanguageProvider>
              <LoginForm />
            </LanguageProvider>
          </I18nextProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
