import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/app/services/api';
import type { Workflow, WorkflowVersion, InitialWorkflowCreatePayload, WorkflowCreateResponse } from '@/app/types/ofm';
import type { PaginatedResponse } from '@/app/types/common';

interface CreateWorkflowPayload {
  name: string;
  description?: string;
  template_id?: string;
  initial_version?: WorkflowVersion;
}

interface WorkflowVersionsResponse extends PaginatedResponse<WorkflowVersion> {
  results: WorkflowVersion[];
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWorkflowPayload) => {
      const { data } = await api.post<Workflow>('/api/yash/ofm/workflows/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Workflow> & { id: string }) => {
      const { data } = await api.patch<Workflow>(`/api/yash/ofm/workflows/${id}/`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/yash/ofm/workflows/${id}/`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export const useCreateWorkflowWithInitialVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InitialWorkflowCreatePayload) => {
      const { data } = await api.post<WorkflowCreateResponse>('/api/yash/ofm/workflows/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};

export function useGetWorkflowVersions(workflowId: string | null, options?: { enabled?: boolean }) {
  return useQuery<WorkflowVersionsResponse, Error>({
    queryKey: ['workflow', workflowId, 'versions'],
    queryFn: async () => {
      const { data } = await api.get<WorkflowVersionsResponse>(`/api/yash/ofm/workflows/${workflowId}/versions/`);
      return data;
    },
    enabled: !!workflowId && options?.enabled !== false,
  });
}

export function useCopyWorkflowVersion(options?: { 
  onSuccess?: (data: WorkflowVersion) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, sourceVersionId }: { workflowId: string; sourceVersionId: string }) => {
      const { data } = await api.post<WorkflowVersion>(
        `/api/yash/ofm/workflows/${workflowId}/versions/${sourceVersionId}/copy/`
      );
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', variables.workflowId, 'versions'] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
