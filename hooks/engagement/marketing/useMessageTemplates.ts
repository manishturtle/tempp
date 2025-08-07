import { useQuery } from '@tanstack/react-query';
import { MessageTemplate, ChannelType, PaginatedResponse } from '@/types/marketing';
import apiClient from '../../../utils/apiClient';
import { useNotification } from '../../useNotification';
import { MARKETING_API } from '../../../constants/apiConstants';

/**
 * Hook to fetch message templates with optional filtering
 */
export const useGetMessageTemplates = (
  tenantSlug: string,
  page: number = 1,
  searchTerm: string = '',
  channelType?: ChannelType,
  pageSize: number = 10
) => {
  const { showError } = useNotification();
  
  return useQuery<PaginatedResponse<MessageTemplate>, Error>({
    queryKey: ['messageTemplates', tenantSlug, page, searchTerm, channelType, pageSize],
    queryFn: async () => {
      try {
        const params: Record<string, any> = {
          page,
          page_size: pageSize,
        };
        
        if (searchTerm) {
          params.search = searchTerm;
        }
        
        if (channelType) {
          params.channel_type = channelType;
        }
        
        const response = await apiClient.get(MARKETING_API.MESSAGE_TEMPLATES(tenantSlug), { params });
        return response.data;
      } catch (error: any) {
        showError('Failed to fetch message templates', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
    enabled: Boolean(tenantSlug) && Boolean(page),
  });
};

/**
 * Hook to fetch a single message template by ID
 */
export const useGetMessageTemplateById = (tenantSlug: string, templateId?: number) => {
  const { showError } = useNotification();
  
  return useQuery<MessageTemplate, Error>({
    queryKey: ['messageTemplate', tenantSlug, templateId],
    queryFn: async () => {
      try {
        if (!templateId) {
          throw new Error('Template ID is required');
        }
        const response = await apiClient.get(MARKETING_API.MESSAGE_TEMPLATE_BY_ID(tenantSlug, templateId));
        return response.data;
      } catch (error: any) {
        showError('Failed to fetch message template', error);
        throw error;
      }
    },
    enabled: Boolean(tenantSlug) && Boolean(templateId),
  });
};
