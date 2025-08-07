import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import useNotification from '@/app/hooks/useNotification';
import { submitReturnRequest, ReturnRequestPayload } from './rmaService';

/**
 * Hook for submitting return requests
 * @returns Mutation hook for submitting return requests
 */
export const useSubmitReturnRequest = () => {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const notification = useNotification();

  return useMutation({
    mutationFn: submitReturnRequest,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: ['userOrderDetail', variables.order_id.toString()],
      });

      // Show success notification
      notification.showNotification({
        message: t('returns.initiation.notifications.success'),
        type: 'success'
      });
    },
    onError: (error) => {
      console.error('Error submitting return request:', error);
      // Show error notification
      notification.showNotification({
        message: t('returns.initiation.notifications.error'),
        type: 'error'
      });
    },
  });
};
