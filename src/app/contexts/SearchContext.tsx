'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';

interface SearchContextProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (query: string) => void;
  selectedProduct: number | null;
  setSelectedProduct: (id: number | null) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

interface SearchProviderProps {
  children: ReactNode;
}

/**
 * Provider component for managing search functionality across the application
 * 
 * @param props - Component props
 * @returns The SearchProvider component
 */
export const SearchProvider = ({ children }: SearchProviderProps): React.ReactElement => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  /**
   * Handle search action and navigation
   * 
   * @param query - Search query string
   */
  const handleSearch = (query: string): void => {
    setSearchQuery(query);
    
    if (!query) return;

    const tenant = params.tenant as string;
    
    // Check if we're already on the product listing page
    if (pathname === `/${tenant}/store/product`) {
      // We're already on the products page, no need to navigate
      return;
    }

    // Navigate to products page with search query
    router.push(`/${tenant}/store/product?search=${encodeURIComponent(query)}`);
  };

  return (
    <SearchContext.Provider 
      value={{ 
        searchQuery, 
        setSearchQuery,
        handleSearch,
        selectedProduct,
        setSelectedProduct
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

/**
 * Hook to use the search context
 * 
 * @returns The search context
 */
export const useSearch = (): SearchContextProps => {
  const context = useContext(SearchContext);
  
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  
  return context;
};
