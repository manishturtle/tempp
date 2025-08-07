'use client';

import { ReactNode, useEffect } from 'react';
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

// This component initializes i18next on the client side
// It should be used as a wrapper in layout.tsx or other client components
export default function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Ensure i18n is initialized on the client side
    if (!i18n.isInitialized) {
      i18n.init();
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
