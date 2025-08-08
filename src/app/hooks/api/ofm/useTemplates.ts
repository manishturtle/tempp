import { useQuery } from '@tanstack/react-query';
import api from '@/app/services/api';
import type { PredefinedTemplate } from '@/app/types/ofm';

interface TemplatesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PredefinedTemplate[];
}

export const useTemplates = () => {
  return useQuery<TemplatesResponse>({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get('/api/yash/ofm/predefined-templates/');
      return data;
    },
  });
};
