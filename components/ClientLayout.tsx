'use client';

import AppLayout from './AppLayout';
import dynamic from 'next/dynamic';

// Dynamically import AccessibilityChecker to avoid including it in production
const AccessibilityChecker = dynamic(
  () => import('./providers/AccessibilityChecker'),
  { ssr: false }
);

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Only include AccessibilityChecker in development */}
      {process.env.NODE_ENV === 'development' && <AccessibilityChecker />}
      <AppLayout>{children}</AppLayout>
    </>
  );
}
