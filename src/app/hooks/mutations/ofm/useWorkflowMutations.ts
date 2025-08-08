import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import {
  createWorkflowWithInitialVersion,
  saveNewWorkflowVersion,
} from '@/app/services/api/ofm/workflows';
import type {
  InitialWorkflowCreatePayload,
  WorkflowVersionConfigPayload,
} from '@/app/types/ofm';

export function useCreateWorkflowWithInitialVersion() {
  const { t } = useTranslation('ofm');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: InitialWorkflowCreatePayload) => createWorkflowWithInitialVersion(payload),
    onSuccess: (data) => {
      // Invalidate workflow list
      queryClient.invalidateQueries({ queryKey: ['ofm', 'workflows'] });
      
      // Show success message
      enqueueSnackbar(t('ofm.workflows.createSuccess'), { variant: 'success' });
      
      // Navigate to the editor
      router.push(`/Masters/admin/fulfillment/workflows/${data.id}/versions/latest/edit`);
    },
    onError: (error: Error) => {
      console.error('Failed to create workflow:', error);
      enqueueSnackbar(t('ofm.workflows.createError'), { variant: 'error' });
    },
  });
}

export function useSaveWorkflowVersion(workflowId: string) {
  const { t } = useTranslation('ofm');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: WorkflowVersionConfigPayload) => saveNewWorkflowVersion(workflowId, payload),
    onSuccess: (data) => {
      // Invalidate workflow list and specific workflow versions
      queryClient.invalidateQueries({ queryKey: ['ofm', 'workflows'] });
      queryClient.invalidateQueries({ queryKey: ['ofm', 'workflowVersions', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['ofm', 'workflowVersionDetail', workflowId, 'active'] });
      
      // Show success message
      enqueueSnackbar(t('ofm.workflows.saveVersionSuccess'), { variant: 'success' });
      
      // Navigate to the latest version
      router.push(`/Masters/admin/fulfillment/workflows/${workflowId}/versions/${data.id}/edit`);
    },
    onError: (error: Error) => {
      console.error('Failed to save workflow version:', error);
      enqueueSnackbar(t('ofm.workflows.saveVersionError'), { variant: 'error' });
    },
  });
}
