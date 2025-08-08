import { api } from '../index';
import { FieldDefinition } from '../../../types/ofm/workflows';

/**
 * Fetches field definitions for a specific workflow step version
 * @param stepVersionId - The ID of the workflow step version
 * @returns Promise with array of field definitions
 */
export const getStepFieldDefinitions = async (stepVersionId: string): Promise<FieldDefinition[]> => {
  const response = await api.get<FieldDefinition[]>(`/api/yash/ofm/step_definitions/${stepVersionId}/fields/`);
  return response.data;
};
