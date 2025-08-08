import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '@/app/services/api';
import type { PaginatedResponse } from '@/app/types/shared';
import type { Workflow, WorkflowVersion, PredefinedTemplate, AuditLogEntry, WorkflowVersionAuditLogResponse } from '@/app/types/ofm';

interface WorkflowListParams {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export const useWorkflowList = (
  params: WorkflowListParams,
  options?: UseQueryOptions<PaginatedResponse<Workflow>, Error>
) => {
  return useQuery<PaginatedResponse<Workflow>, Error>({
    queryKey: ['workflows', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Workflow>>('/api/yash/ofm/workflows/', {
        params: {
          page: params.page,
          page_size: params.pageSize,
          ordering: params.sortField ? `${params.sortOrder === 'desc' ? '-' : ''}${params.sortField}` : undefined,
          search: params.search,
          is_active: params.is_active,
          is_default: params.is_default,
        },
      });
      return data;
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    ...options,
  });
};

export const useWorkflowDetail = (
  id: string | null,
  options?: UseQueryOptions<Workflow, Error>
) => {
  return useQuery<Workflow, Error>({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) throw new Error('Workflow ID is required');
      const { data } = await api.get<Workflow>(`/api/yash/ofm/workflows/${id}/`);
      return data;
    },
    enabled: !!id,
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    ...options,
  });
};

export const useWorkflowVersionDetail = (
  workflowId: string | null,
  versionId: string,
  options?: Partial<UseQueryOptions<WorkflowVersion, Error>>
) => {
  return useQuery<WorkflowVersion, Error>({
    queryKey: ['workflow', workflowId, 'version', versionId],
    queryFn: async () => {
      if (!workflowId) throw new Error('Workflow ID is required');
      if (!versionId) throw new Error('Version ID is required');
      
      console.log(`Fetching workflow version detail: /api/yash/ofm/workflows/${workflowId}/versions/${versionId}/`);
      
      try {
        const { data } = await api.get<WorkflowVersion>(
          `/api/yash/ofm/workflows/${workflowId}/versions/${versionId}/`
        );
        console.log('Workflow version detail received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching workflow version detail:', error);
        throw error;
      }
    },
    enabled: !!workflowId && !!versionId && versionId !== 'active',
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false,
    retry: 3,
    ...options,
  });
};

export const useGetWorkflowVersions = (
  workflowId: string | null,
  params?: any,
  options?: UseQueryOptions<PaginatedResponse<WorkflowVersion>, Error>
) => {
  return useQuery<PaginatedResponse<WorkflowVersion>, Error>({
    queryKey: ['workflow', workflowId, 'versions'],
    queryFn: async () => {
      if (!workflowId) throw new Error('Workflow ID is required');
      const { data } = await api.get(`/api/yash/ofm/workflows/${workflowId}/versions/`, {
        params,
      });
      return data;
    },
    enabled: !!workflowId,
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    ...options,
  });
};

/**
 * Hook to fetch the active version of a workflow
 */
export const useGetActiveWorkflowVersion = (
  workflowId: string | null,
  options?: UseQueryOptions<WorkflowVersion[], Error>
) => {
  return useQuery<WorkflowVersion[], Error>({
    queryKey: ['workflow', workflowId, 'activeVersion'],
    queryFn: async () => {
      if (!workflowId) throw new Error('Workflow ID is required');
      
      console.log(`Fetching active workflow version: /api/yash/ofm/workflows/${workflowId}/versions/active/`);
      
      const { data } = await api.get<WorkflowVersion[]>(
        `/api/yash/ofm/workflows/${workflowId}/versions/active/`
      );
      
      console.log('Active workflow version data received:', data);
      return data;
    },
    enabled: !!workflowId && workflowId !== 'new',
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useGetPredefinedTemplates = (
  options?: UseQueryOptions<PaginatedResponse<PredefinedTemplate>, Error>
) => {
  return useQuery<PaginatedResponse<PredefinedTemplate>, Error>({
    queryKey: ['predefinedTemplates'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PredefinedTemplate>>(
        '/api/yash/ofm/predefined-templates/'
      );
      return data;
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    ...options,
  });
};

export const useGetWorkflowAuditLog = (
  workflowId: string,
  filters?: any,
  options?: UseQueryOptions<WorkflowVersionAuditLogResponse, Error>
) => {
  return useQuery<WorkflowVersionAuditLogResponse, Error>({
    queryKey: ['workflow', workflowId, 'audit'],
    queryFn: async () => {
      const { data } = await api.get(`/api/yash/ofm/workflows/${workflowId}/versions/audit_logs/`, {
        params: filters,
      });
      return data;
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    ...options,
  });
};
