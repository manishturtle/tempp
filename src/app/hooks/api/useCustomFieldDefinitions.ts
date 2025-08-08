/**
 * Custom hook for fetching custom field definitions for a specific entity type
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getAuthHeaders } from './auth';
import { CustomFieldDefinition } from '@/app/types/account';

/**
 * Custom hook to fetch custom field definitions for a specific entity type
 * @param entityType - The type of entity to fetch custom field definitions for (e.g., 'Account', 'Contact')
 * @returns Query result with custom field definitions
 */
export const useCustomFieldDefinitions = (entityType: string) => {
  return useQuery<CustomFieldDefinition[]>({
    queryKey: ['customFieldDefinitions', entityType],
    queryFn: async () => {
      const response = await api.get(`custom-field-definitions/?entity_type=${entityType}&is_active=true`, {
        headers: getAuthHeaders()
      });
      return response.data.results || [];
    }
  });
};

export default useCustomFieldDefinitions;
