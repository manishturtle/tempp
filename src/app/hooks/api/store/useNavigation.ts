'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';

/**
 * Interface for subcategory in the division hierarchy
 */
export interface Subcategory {
  id: number;
  name: string;
  image: string | null;
  image_alt_text: string;
}

/**
 * Interface for category in the division hierarchy
 */
export interface Category {
  id: number;
  name: string;
  image: string | null;
  image_alt_text: string;
  subcategories: Subcategory[];
}

/**
 * Interface for division in the hierarchy
 */
export interface Division {
  id: number;
  name: string;
  image: string | null;
  image_alt_text: string;
  categories: Category[];
}

/**
 * Interface for simplified division in header config
 */
export interface SimpleDivision {
  id: number;
  name: string;
  division_id: number;
}

/**
 * Interface for the header configuration
 */
export interface HeaderConfig {
  id: number;
  name: string;
  divisions: SimpleDivision[];
}

/**
 * Type for combined navigation data
 */
export interface NavigationData {
  divisions: Division[];
  headerConfig: HeaderConfig | null;
}


/**
 * Custom hook to fetch only division hierarchy
 * 
 * @returns Query result with division hierarchy data
 */
export const useDivisionHierarchy = () => {
  const tenantSlug = typeof window !== 'undefined' 
    ? window.location.pathname.split('/')[1] 
    : '';

  return useQuery<Division[]>({
    queryKey: ['divisionHierarchy', tenantSlug],
    queryFn: async () => {
      try {
        const response = await api.get(
          `/products/catalogue/active-division-hierarchy/`,
          { withCredentials: true }
        );
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch division hierarchy:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

/**
 * Custom hook to fetch only header configuration
 * 
 * @returns Query result with header configuration data
 */
export const useHeaderConfig = () => {
  const tenantSlug = typeof window !== 'undefined' 
    ? window.location.pathname.split('/')[1] 
    : '';

  return useQuery<HeaderConfig | null>({
    queryKey: ['headerConfig', tenantSlug],
    queryFn: async () => {
      try {
        const response = await api.get(
          `/site-config/header/`,
          { withCredentials: true }
        );
        return response.data || null;
      } catch (error) {
        console.error('Failed to fetch header configuration:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

/**
 * Type for dynamic content block data
 * Using Record<string, any> to allow for flexible content structure
 */
type ContentBlockData = Record<string, any>;

/**
 * Interface for landing page content block
 */
interface ContentBlock {
  id: number;
  order: number;
  block_type: string;
  title: string;
  content: ContentBlockData;
  is_active: boolean;
}

/**
 * Interface for landing page data
 */
export interface LandingPageData {
  id: number;
  slug: string;
  title: string;
  meta_description: string | null;
  meta_keywords: string | null;
  blocks: ContentBlock[];
}

/**
 * Custom hook to fetch landing page data by page ID
 * 
 * @param pageId - The ID of the landing page to fetch
 * @returns Query result with landing page data
 */
export const useLandingPage = (pageId: number | string) => {
  const tenantSlug = typeof window !== 'undefined' 
    ? window.location.pathname.split('/')[1] 
    : '';

  return useQuery<LandingPageData | null>({
    queryKey: ['landingPage', tenantSlug, pageId],
    queryFn: async () => {
      if (!pageId) return null;
      
      try {
        const response = await api.get(
          `/pages/${pageId}/`,
          { withCredentials: true }
        );
        return response.data || null;
      } catch (error) {
        console.error('Failed to fetch landing page:', error);
        return null;
      }
    },
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

