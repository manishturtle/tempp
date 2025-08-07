'use client';

import React, { useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccountById } from '@/app/hooks/api/customers';
import { AccountDetailPage } from '@/app/components/admin/customers/AccountDetailPage';
import { AccountViewProvider, useAccountView } from './AccountViewContext';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Account Detail Content component
 * Uses the AccountView context to fetch and display account data
 */
function AccountDetailContent() {
  const { accountId, setAccountId } = useAccountView();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get accountId from URL query parameter if not already in context
  useEffect(() => {
    const idFromQuery = searchParams.get('id');
    console.log('AccountDetailContent - Current accountId from context:', accountId);
    console.log('AccountDetailContent - ID from query:', idFromQuery);
    
    if (idFromQuery && !accountId) {
      console.log('AccountDetailContent - Setting accountId from query:', idFromQuery);
      setAccountId(idFromQuery);
    }
  }, [searchParams, accountId, setAccountId]);

  // Fetch account data
  const { 
    data: accountData, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['accountDetail', accountId],
    queryFn: () => getAccountById(accountId),
    enabled: !!accountId,
  });

  // If no account ID is provided, show an error message
  if (!accountId) {
    console.log('AccountDetailContent - No accountId available, showing error');
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-red-500">Error</h1>
        <p>No account ID provided. Please navigate to this page from the accounts list.</p>
        <button 
          onClick={() => router.push('/Crm/Masters/customers/accounts')} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Accounts List
        </button>
      </div>
    );
  }

  return (
    <AccountDetailPage
      accountId={accountId}
      accountData={accountData}
      isLoading={isLoading}
      isError={isError}
      error={error as Error}
    />
  );
}

/**
 * Account Detail Page (Static Route)
 * Displays detailed information about a specific account using context
 * Route: /Crm/Masters/customers/accounts/view
 */
function AccountDetailPageContent() {
  // Get the account ID from the URL query parameter to initialize the context
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get('id') || '';
  
  return (
    <AccountViewProvider initialAccountId={initialAccountId}>
      <AccountDetailContent />
    </AccountViewProvider>
  );
}

export default function AccountDetailPageStaticRoute() {
  return (
    <Suspense fallback={<div className="p-4">Loading account details...</div>}>
      <AccountDetailPageContent />
    </Suspense>
  );
}
