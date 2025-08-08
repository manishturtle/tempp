import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkflows,
  fetchWorkflowDetail,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  fetchWorkflowVersions,
  fetchWorkflowVersion,
  createWorkflowVersion,
  fetchPredefinedTemplates,
  fetchPredefinedTemplate
} from '@/services/api/ofm';
import type {
  WorkflowListParams,
  CreateWorkflowParams,
  UpdateWorkflowParams,
  CreateVersionParams,
  PredefinedTemplate // Import the type
} from '@/types/ofm';

// Query key factory
const ofmKeys = {
  all: ['ofm'] as const,
  workflows: () => [...ofmKeys.all, 'workflows'] as const,
  workflow: (id: string) => [...ofmKeys.workflows(), id] as const,
  versions: (workflowId: string) => [...ofmKeys.workflow(workflowId), 'versions'] as const,
  version: (workflowId: string, versionId: string) => [...ofmKeys.versions(workflowId), versionId] as const,
  templates: () => [...ofmKeys.all, 'templates'] as const, // Add key for templates
  template: (id: string) => [...ofmKeys.templates(), id] as const,
};

// Workflow Hooks
export const useWorkflows = (params?: WorkflowListParams) => {
  return useQuery({
    queryKey: [...ofmKeys.workflows(), params],
    queryFn: () => fetchWorkflows(params),
  });
};

export const useWorkflowDetail = (id: string) => {
  return useQuery({
    queryKey: ofmKeys.workflow(id),
    queryFn: () => fetchWorkflowDetail(id),
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWorkflowParams) => createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ofmKeys.workflows() });
    },
  });
};

export const useUpdateWorkflow = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateWorkflowParams) => updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ofmKeys.workflow(id) });
      queryClient.invalidateQueries({ queryKey: ofmKeys.workflows() });
    },
  });
};

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ofmKeys.workflows() });
      queryClient.removeQueries({ queryKey: ofmKeys.workflow(id) });
    },
  });
};

// Workflow Version Hooks
export const useWorkflowVersions = (workflowId: string, params?: WorkflowListParams) => {
  return useQuery({
    queryKey: [...ofmKeys.versions(workflowId), params],
    queryFn: () => fetchWorkflowVersions(workflowId, params),
  });
};

export const useWorkflowVersion = (workflowId: string, versionId: string) => {
  return useQuery({
    queryKey: ofmKeys.version(workflowId, versionId),
    queryFn: () => fetchWorkflowVersion(workflowId, versionId),
  });
};

export const useCreateWorkflowVersion = (workflowId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateVersionParams) => createWorkflowVersion(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ofmKeys.versions(workflowId) });
      queryClient.invalidateQueries({ queryKey: ofmKeys.workflow(workflowId) });
    },
  });
};

// Template Hooks
export const usePredefinedTemplates = (params?: WorkflowListParams) => {
  return useQuery({
    queryKey: [...ofmKeys.templates(), params],
    queryFn: () => fetchPredefinedTemplates(params),
  });
};

export const usePredefinedTemplate = (id: string) => {
  return useQuery({
    queryKey: ofmKeys.template(id),
    queryFn: () => fetchPredefinedTemplate(id),
  });
};
