import { useQuery } from '@tanstack/react-query';
import { FieldDefinition } from '../../../types/ofm/workflows';
import { getStepFieldDefinitions } from '../../../services/api/ofm/workflows';

/**
 * Hook for fetching field definitions for a specific workflow step version
 * @param stepVersionId - The ID of the workflow step version
 * @returns Query result with field definitions data
 */
export const useGetStepFieldDefinitions = (stepVersionId: string | null | undefined) => {
  return useQuery<FieldDefinition[], Error>({
    queryKey: ['ofm', 'stepFieldDefinitions', stepVersionId],
    queryFn: () => getStepFieldDefinitions(stepVersionId!),
    enabled: !!stepVersionId,
  });
};
