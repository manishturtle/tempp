import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../use-debounce';
import api from '@/lib/storeapi';

// Check API instance
console.log('API instance:', api);

interface SearchResult {
  id: number;
  name: string;
  sku: string;
  slug: string;
  display_price: string;
  thumbnail?: string;
  images?: Array<{ image: string }>;
}

export const useProductSearch = (tenantSlug: string, initialSearchTerm: string = '') => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isOpen, setIsOpen] = useState(false);

  console.log('Search term:', debouncedSearchTerm, 'Tenant slug:', tenantSlug);
  
  const { data, isLoading, isError } = useQuery<{ results: SearchResult[] }>({
    queryKey: ['products', 'search', debouncedSearchTerm, tenantSlug],
    queryFn: async () => {
      if (!debouncedSearchTerm.trim()) return { results: [] };

      try {
        console.log('Making API call with search term:', debouncedSearchTerm);
        const response = await api.get('/products/products/search/', {
          params: {
            q: debouncedSearchTerm,
            page_size: 5
          },
         
        });
        console.log('Search API response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Search error:', error);
        return { results: [] };
      }
    },
    enabled: !!debouncedSearchTerm.trim(),
    placeholderData: (previousData) => previousData, // Keeps previous data while loading
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Format the search results to match our SearchResult interface
  const searchResults = useMemo(() => {
    if (!data?.results) return [];
    return data.results.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      slug: item.slug,
      display_price: item.display_price,
      thumbnail: item.images?.[0]?.image || ''
    }));
  }, [data]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isLoading,
    isError,
    isOpen,
    setIsOpen,
  };
};
