import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/app/services/api';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

interface WorkflowStepFieldConfig {
  predefined_field_id: number;
  field_name: string;
  field_type: string;
  is_required: boolean;
  validation_regex?: string;
  default_value?: any;
  options?: any[];
  help_text?: string;
  display_order: number;
}

interface WorkflowStepConfig {
  predefined_template_id: number;
  step_name: string;
  display_order: number;
  fields: WorkflowStepFieldConfig[];
  notification_template_ids?: string[];
}

interface CreateWorkflowPayload {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  initial_version_config: {
    description?: string;
    enable_partial_fulfillment?: boolean;
    max_hold_time_days?: number;
    notes?: string;
    steps: WorkflowStepConfig[];
  };
}

interface SaveVersionPayload {
  description?: string;
  enable_partial_fulfillment?: boolean;
  max_hold_time_days?: number;
  notes?: string;
  steps: WorkflowStepConfig[];
}

// Hook for creating a new workflow with initial version
export const useCreateWorkflowWithInitialVersion = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation('ofm');

  return useMutation({
    mutationFn: async (payload: CreateWorkflowPayload) => {
      const { data } = await api.post('/api/yash/ofm/workflows/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      enqueueSnackbar(t('workflow.create.success'), { variant: 'success' });
    },
    onError: (error: Error) => {
      enqueueSnackbar(t('workflow.create.error', { message: error.message }), { variant: 'error' });
    },
  });
};

// Hook for saving a new version of an existing workflow
export const useSaveNewWorkflowVersion = (workflowId: string) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation('ofm');

  return useMutation({
    mutationFn: async (payload: SaveVersionPayload) => {
      const { data } = await api.post(`/api/yash/ofm/workflows/${workflowId}/versions/save_version/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
      enqueueSnackbar(t('workflow.version.save.success'), { variant: 'success' });
    },
    onError: (error: Error) => {
      enqueueSnackbar(t('workflow.version.save.error', { message: error.message }), { variant: 'error' });
    },
  });
};

// Hook for deleting a workflow
export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation('ofm');

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const { data } = await api.delete(`/api/yash/ofm/workflows/${workflowId}/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      enqueueSnackbar(t('ofm.workflows.deleteSuccess'), { variant: 'success' });
    },
    onError: (error: Error) => {
      enqueueSnackbar(t('ofm.workflows.deleteError', { message: error.message }), { variant: 'error' });
    },
  });
};

// Hook for setting a workflow as default
export const useSetDefaultWorkflow = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation('ofm');

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const { data } = await api.post(`/api/yash/ofm/workflows/${workflowId}/set_default/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      enqueueSnackbar(t('ofm.workflows.setDefaultSuccess'), { variant: 'success' });
    },
    onError: (error: Error) => {
      enqueueSnackbar(t('ofm.workflows.setDefaultError', { message: error.message }), { variant: 'error' });
    },
  });
};

// Hook for duplicating a workflow
export const useDuplicateWorkflow = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation('ofm');

  return useMutation({
    mutationFn: async ({ workflowId, newName }: { workflowId: string; newName?: string }) => {
      const { data } = await api.post(apiEndpoints.workflows.duplicate(workflowId), 
        newName ? { new_name: newName } : {}
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      enqueueSnackbar(t('workflow.duplicate.success'), { variant: 'success' });
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: Error) => {
      enqueueSnackbar(t('workflow.duplicate.error', { message: error.message }), { variant: 'error' });
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};
