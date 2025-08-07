'use client';

import { ReactNode } from 'react';
import { ProductProvider } from '@/app/contexts/ProductContext';

/**
 * Layout component for products section
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {React.ReactElement} Layout component with ProductProvider
 */
export default function ProductsLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <ProductProvider>
      {children}
    </ProductProvider>
  );
}
