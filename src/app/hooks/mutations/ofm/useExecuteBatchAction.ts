import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { executeBatchAction } from '@/services/api/ofm/tasks';
import { BatchActionPayload, BatchActionResponse, BatchActionResultItem } from '@/types/ofm/tasks';

/**
 * Hook for executing batch actions on Order Item Fulfillments (OIFs)
 * 
 * @returns Mutation object with mutate function, loading state, error state, and modals state/handlers
 */
const useExecuteBatchAction = () => {
  const { t } = useTranslation('ofm');
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  // State for confirmation modal
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<string>('');
  const [confirmationCount, setConfirmationCount] = useState(0);
  const [pendingPayload, setPendingPayload] = useState<BatchActionPayload | null>(null);
  
  // State for results modal
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [successResults, setSuccessResults] = useState<BatchActionResultItem[]>([]);
  const [failedResults, setFailedResults] = useState<BatchActionResultItem[]>([]);

  const mutation = useMutation<BatchActionResponse, Error, BatchActionPayload>({
    mutationFn: executeBatchAction,
    
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['ofm', 'tasks'],
      });
      
      // Display success message with summary
      enqueueSnackbar(
        t('ofm:tasks.batchResult', {
          success: data.success.length,
          failed: data.failed.length,
        }),
        {
          variant: data.failed.length > 0 ? 'warning' : 'success',
        }
      );
      
      // If there are failures, show the results modal
      if (data.failed.length > 0) {
        setSuccessResults(data.success);
        setFailedResults(data.failed);
        setResultsModalOpen(true);
      }
      
      // Reset confirmation state
      setConfirmationModalOpen(false);
      setPendingPayload(null);
    },
    
    onError: (error) => {
      // Log the error for debugging
      console.error('Batch action error:', error);
      
      // Display generic error message
      enqueueSnackbar(t('ofm:common.error'), {
        variant: 'error',
      });
      
      // Reset confirmation state
      setConfirmationModalOpen(false);
      setPendingPayload(null);
    },
  });

  /**
   * Show confirmation modal before executing batch action
   */
  const confirmBatchAction = (payload: BatchActionPayload) => {
    setConfirmationAction(payload.action);
    setConfirmationCount(payload.oif_ids.length);
    setPendingPayload(payload);
    setConfirmationModalOpen(true);
  };

  /**
   * Execute the pending batch action after confirmation
   */
  const executePendingBatchAction = () => {
    if (pendingPayload) {
      mutation.mutate(pendingPayload);
    }
  };

  /**
   * Cancel the pending batch action
   */
  const cancelPendingBatchAction = () => {
    setConfirmationModalOpen(false);
    setPendingPayload(null);
  };

  /**
   * Close the results modal
   */
  const closeResultsModal = () => {
    setResultsModalOpen(false);
    setSuccessResults([]);
    setFailedResults([]);
  };

  return {
    // Mutation properties
    mutate: confirmBatchAction,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    
    // Confirmation modal properties
    confirmationModalOpen,
    confirmationAction,
    confirmationCount,
    onConfirm: executePendingBatchAction,
    onCancel: cancelPendingBatchAction,
    
    // Results modal properties
    resultsModalOpen,
    successResults,
    failedResults,
    onCloseResults: closeResultsModal,
  };
};

export default useExecuteBatchAction;
