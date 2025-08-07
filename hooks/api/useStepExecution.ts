import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completeStep, executeBatchAction, getStepDefinition, StepCompletionPayload, BatchActionPayload, StepDefinition } from '@/services/api/ofm/tasks';

/**
 * Hook for fetching step definition with form fields and validation rules
 */
export const useGetStepDefinition = (stepId: string | null | undefined) => {
  return useQuery<StepDefinition, Error>({
    queryKey: ['ofm', 'stepDefinition', stepId],
    queryFn: () => getStepDefinition(stepId!),
    enabled: !!stepId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for completing a workflow step for a single order item
 */
export const useCompleteStep = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      oifId, 
      payload, 
      confirmShipping = false 
    }: { 
      oifId: string, 
      payload: StepCompletionPayload, 
      confirmShipping?: boolean 
    }) => completeStep(oifId, payload, confirmShipping),
    
    onSuccess: (_, variables) => {
      // Invalidate relevant queries - ensure we use the correct query keys
      queryClient.invalidateQueries({ queryKey: ['orderFulfillmentList'] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail'] });
      queryClient.invalidateQueries({ queryKey: ['ofm', 'orderFulfillmentDetail'] });
      
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ['orderFulfillmentList'] });
      
      // Show success notification
      console.log(`Successfully completed step for item ${variables.oifId}`);
    },
    
    onError: (error: any) => {
      // Check if this is a confirmation required error that can be handled
      if (error.requiresConfirmation) {
        // This error should be handled by the UI to show a confirmation dialog
        // The UI can then retry with confirmShipping=true
        console.warn('Confirmation required:', error.message);
      } else {
        // Show error notification for other errors
        console.error('Error completing step:', error);
      }
    }
  });
};

/**
 * Hook for executing batch actions on multiple order items
 */
export const useExecuteBatchAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      payload, 
      confirmShipping = false 
    }: { 
      payload: BatchActionPayload, 
      confirmShipping?: boolean 
    }) => executeBatchAction(payload, confirmShipping),
    
    onSuccess: (result) => {
      // Invalidate relevant queries - ensure we use the correct query keys
      queryClient.invalidateQueries({ queryKey: ['orderFulfillmentList'] });
      queryClient.invalidateQueries({ queryKey: ['taskDetail'] });
      queryClient.invalidateQueries({ queryKey: ['ofm', 'orderFulfillmentDetail'] });
      
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ['orderFulfillmentList'] });
      
      // Show success notification with details if available
      const successCount = result.success?.length || 0;
      const failedCount = result.failed?.length || 0;
      
      if (failedCount > 0) {
        console.warn(`Batch action completed with ${successCount} successful and ${failedCount} failed items`);
      } else {
        console.log(`Successfully executed batch action on ${successCount} items`);
      }
    },
    
    onError: (error: any) => {
      // Check if this is a confirmation required error that can be handled
      if (error.requiresConfirmation) {
        // This error should be handled by the UI to show a confirmation dialog
        // The UI can then retry with confirmShipping=true
        console.warn('Confirmation required for batch action:', error.message);
      } else {
        // Show error notification for other errors
        console.error('Error executing batch action:', error);
      }
    }
  });
};
