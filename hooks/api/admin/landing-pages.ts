import { useMutation, useQuery, UseMutationResult, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Image Upload Response Type
interface UploadImageResponse {
  url: string;
}

// Types for Landing Pages
export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  meta_keywords?: string;
  is_active?: boolean;
  content_blocks?: ContentBlock[];
  created_at?: string;
  updated_at?: string;
  blocks?: ContentBlock[];
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ContentBlock {
  id: string;
  landing_page_id: string;
  block_type: BlockType;
  title: string;
  content: Record<string, any>;
  order: number;
  created_at: string;
  updated_at: string;
}

export type BlockType = 
  | 'HERO_CAROUSEL' 
  | 'BANNER_AD_GRID' 
  | 'RECENTLY_VIEWED' 
  | 'FEATURED_PRODUCTS'
  | 'TEXT_CONTENT'
  | 'NEWSLETTER_SIGNUP';

export interface LandingPageCreatePayload {
  slug: string;
  title: string;
  meta_description: string;
  is_active: boolean;
}

export interface ContentBlockCreatePayload {
  page: string;
  block_type: BlockType;
  title: string;
  content: Record<string, any>;
}

export interface ContentBlockReorderPayload {
  page: string;
  block_ids: string[];
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

/**
 * Fetches all landing pages for admin interface
 * @returns UseQueryResult with landing pages data
 */
export const useAdminLandingPages = (): UseQueryResult<PaginatedResponse<LandingPage>, AxiosError<ApiError>> => {
  return useQuery<PaginatedResponse<LandingPage>, AxiosError<ApiError>>({
    queryKey: ['adminLandingPages'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<LandingPage>>(
        apiEndpoints.pages.adminPages,
        { headers: await getAuthHeaders() }
      );
      return data;
    }
  });
};

/**
 * Fetches a single landing page with its content blocks
 * @param pageIdOrSlug - ID or slug of the landing page to fetch
 * @returns UseQueryResult with landing page data
 */
export const useAdminLandingPage = (pageIdOrSlug: string): UseQueryResult<LandingPage, AxiosError<ApiError>> => {
  return useQuery<LandingPage, AxiosError<ApiError>>({
    queryKey: ['adminLandingPage', pageIdOrSlug],
    queryFn: async () => {
      // The backend uses slug as the lookup field, not id
      const { data } = await api.get<LandingPage>(
        `${apiEndpoints.pages.adminPages}${pageIdOrSlug}/`,
        { headers: await getAuthHeaders() }
      );
      return data;
    },
    enabled: !!pageIdOrSlug
  });
};

/**
 * Creates a new landing page
 * @returns UseMutationResult for creating a landing page
 */
export const useCreateLandingPage = (): UseMutationResult<
  LandingPage,
  AxiosError<ApiError>,
  LandingPageCreatePayload
> => {
  const queryClient = useQueryClient();
  
  return useMutation<LandingPage, AxiosError<ApiError>, LandingPageCreatePayload>({
    mutationFn: async (payload: LandingPageCreatePayload) => {
      const { data } = await api.post<LandingPage>(
        apiEndpoints.pages.adminPages,
        payload,
        { headers: await getAuthHeaders() }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLandingPages'] });
    }
  });
};

/**
 * Updates an existing landing page
 * @returns UseMutationResult for updating a landing page
 */
export const useUpdateLandingPage = (): UseMutationResult<
  LandingPage,
  AxiosError<ApiError>,
  { id: string; payload: Partial<LandingPageCreatePayload> }
> => {
  const queryClient = useQueryClient();
  
  return useMutation<LandingPage, AxiosError<ApiError>, { id: string; payload: Partial<LandingPageCreatePayload> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put<LandingPage>(
        `${apiEndpoints.pages.adminPages}${id}/`,
        payload,
        { headers: await getAuthHeaders() }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminLandingPages'] });
      queryClient.invalidateQueries({ queryKey: ['adminLandingPage', variables.id] });
    }
  });
};

/**
 * Deletes a landing page
 * @returns UseMutationResult for deleting a landing page
 */
export const useDeleteLandingPage = (): UseMutationResult<void, AxiosError<ApiError>, string> => {
  const queryClient = useQueryClient();
  
  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: async (id: string) => {
      await api.delete<void>(
        `${apiEndpoints.pages.adminPages}${id}/`,
        { headers: await getAuthHeaders() }
      );
    },
    onSuccess: () => {
      // Invalidate the paginated landing pages query
      queryClient.invalidateQueries({ queryKey: ['adminLandingPages'] });
    }
  });
};

/**
 * Creates a new content block
 * @returns UseMutationResult for creating a content block
 */
export const useCreateContentBlock = (): UseMutationResult<
  ContentBlock,
  AxiosError<ApiError>,
  ContentBlockCreatePayload
> => {
  const queryClient = useQueryClient();
  
  return useMutation<ContentBlock, AxiosError<ApiError>, ContentBlockCreatePayload>({
    mutationFn: async (payload: ContentBlockCreatePayload) => {
      const { data } = await api.post<ContentBlock>(
        apiEndpoints.pages.adminContentBlocks,
        payload,
        { headers: await getAuthHeaders() }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminLandingPage', variables.page] });
    }
  });
};

/**
 * Updates an existing content block
 * @returns UseMutationResult for updating a content block
 */
export const useUpdateContentBlock = (): UseMutationResult<
  ContentBlock,
  AxiosError<ApiError>,
  { id: string; payload: Partial<ContentBlockCreatePayload> }
> => {
  const queryClient = useQueryClient();
  
  return useMutation<ContentBlock, AxiosError<ApiError>, { id: string; payload: Partial<ContentBlockCreatePayload> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch<ContentBlock>(
        `${apiEndpoints.pages.adminContentBlocks}${id}/`,
        payload,
        { headers: await getAuthHeaders() }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      // We don't know the landing page ID here, so we rely on the calling component to invalidate the correct queries
      if (variables.payload.page) {
        queryClient.invalidateQueries({ queryKey: ['adminLandingPage', variables.payload.page] });
      }
    }
  });
};

/**
 * Deletes a content block
 * @returns UseMutationResult for deleting a content block
 */
export const useDeleteContentBlock = (landingPageId: string): UseMutationResult<void, AxiosError<ApiError>, string> => {
  const queryClient = useQueryClient();
  
  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: async (id: string) => {
      await api.delete<void>(
        `${apiEndpoints.pages.adminContentBlocks}${id}/`,
        { headers: await getAuthHeaders() }
      );
    },
    onSuccess: () => {
      if (landingPageId) {
        queryClient.invalidateQueries({ queryKey: ['adminLandingPage', landingPageId] });
      }
    }
  });
};

/**
 * Reorders content blocks for a landing page
 * @returns UseMutationResult for reordering content blocks
 */
export const useReorderContentBlocks = (): UseMutationResult<
  void,
  AxiosError<ApiError>,
  ContentBlockReorderPayload
> => {
  const queryClient = useQueryClient();
  
  return useMutation<void, AxiosError<ApiError>, ContentBlockReorderPayload>({
    mutationFn: async (payload: ContentBlockReorderPayload) => {
      await api.post<void>(
        apiEndpoints.pages.reorderContentBlocks,
        payload,
        { headers: await getAuthHeaders() }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminLandingPage', variables.page] });
    }
  });
};
