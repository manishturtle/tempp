'use client';

import React from 'react';
import { useLanguage } from '@/app/i18n/LanguageContext';
import { getTranslation } from '@/app/i18n/languageUtils';

interface PageTitleProps {
  titleKey: string;
  descriptionKey?: string;
  children?: React.ReactNode;
}

export default function PageTitle({ titleKey, descriptionKey, children }: PageTitleProps) {
  const { currentLanguage } = useLanguage();
  
  // Function to translate text
  const t = (key: string) => getTranslation(key, currentLanguage);
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      {descriptionKey && (
        <p className="text-gray-600">{t(descriptionKey)}</p>
      )}
      {children}
    </div>
  );
}
