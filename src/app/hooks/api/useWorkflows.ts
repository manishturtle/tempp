import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Workflow, WorkflowVersion, WorkflowVersionConfig } from '@/app/types/workflow';

const BASE_URL = '/api/yash/ofm/workflows/';

async function fetchWorkflow(id: string): Promise<Workflow> {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch workflow');
  }
  return response.json();
}

async function saveWorkflowVersion(workflowId: string, version: WorkflowVersionConfig): Promise<void> {
  const response = await fetch(`${BASE_URL}/${workflowId}/versions/save_version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(version),
  });
  if (!response.ok) {
    throw new Error('Failed to save workflow version');
  }
}

async function createWorkflow(payload: { name: string; description: string; initial_version: WorkflowVersionConfig }): Promise<Workflow> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create workflow');
  }
  return response.json();
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('/api/yash/ofm/workflows/');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      return response.json() as Promise<Workflow[]>;
    },
  });
}

export function useWorkflow(workflowId: string) {
  return useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const response = await fetch(`/api/yash/ofm/workflows/${workflowId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow');
      }
      return response.json() as Promise<Workflow>;
    },
    enabled: !!workflowId,
  });
}

export function useWorkflowVersion(workflowId: string, versionId: string) {
  return useQuery({
    queryKey: ['workflow', workflowId, 'version', versionId],
    queryFn: async () => {
      const response = await fetch(`/api/yash/ofm/workflows/${workflowId}/versions/${versionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow version');
      }
      return response.json() as Promise<WorkflowVersion>;
    },
  });
}

export function useSaveWorkflowVersion(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: WorkflowVersionConfig) => {
      const response = await fetch(`/api/yash/ofm/workflows/${workflowId}/versions/save_version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error('Failed to save workflow version');
      }
      return response.json() as Promise<WorkflowVersion>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
    },
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description: string; initial_version: WorkflowVersionConfig }) => {
      const response = await fetch('/api/yash/ofm/workflows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }
      return response.json() as Promise<Workflow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
