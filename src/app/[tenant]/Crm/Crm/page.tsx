'use client';

import React from 'react';
import Link from 'next/link';
import PageTitle from '@/app/components/PageTitle';
import { useLanguage } from '@/app/i18n/LanguageContext';
import { getTranslation } from '@/app/i18n/languageUtils';

export default function CrmPage() {
  const { currentLanguage } = useLanguage();
  const t = (key: string) => getTranslation(key, currentLanguage);
  
  return (
    <div className="space-y-4">
      <PageTitle titleKey="sidenav.crm" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/Crm/contacts" className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">{t('sidenav.items.contacts')}</h2>
          <p className="text-gray-600">{t('pages.crm.contacts.description')}</p>
        </Link>
        <Link href="/Crm/leads" className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">{t('sidenav.items.leads')}</h2>
          <p className="text-gray-600">{t('pages.crm.leads.description')}</p>
        </Link>
        <Link href="/Crm/deals" className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">{t('sidenav.items.deals')}</h2>
          <p className="text-gray-600">{t('pages.crm.deals.description')}</p>
        </Link>
      </div>
    </div>
  );
}
