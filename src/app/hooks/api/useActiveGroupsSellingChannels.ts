import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { apiEndpoints } from '@/lib/api';
import api from '@/lib/api';
import { getAuthHeaders } from './auth';

export interface SellingChannel {
  id: number;
  status: 'ACTIVE' | 'INACTIVE';
  segment_name: string;
}

type QueryOptions = Omit<
  UseQueryOptions<SellingChannel[], Error>,
  'queryKey' | 'queryFn' | 'staleTime' | 'refetchOnWindowFocus'
>;

/**
 * Hook to fetch active selling channels
 * @param options - Query options
 * @returns Query result with selling channels data
 */
export const useActiveSellingChannels = (
  options?: QueryOptions
): UseQueryResult<SellingChannel[], Error> => {
  return useQuery<SellingChannel[], Error>({
    queryKey: ['active-selling-channels'],
    queryFn: async () => {
      const { data } = await api.get<SellingChannel[]>(
        apiEndpoints.sellingChannels.active,
        { headers: getAuthHeaders() }
      );
      return data;
    },
    ...options,
  });
};

/**
 * Hook to fetch a single active selling channel by ID
 * @param id - The ID of the selling channel to fetch
 * @param options - Query options
 * @returns Query result with the selling channel data
 */
export const useActiveSellingChannel = (
  id: number,
  options?: QueryOptions
) => {
  const result = useActiveSellingChannels(options);
  const channel = result.data?.find((c) => c.id === id);
  
  return {
    ...result,
    data: channel,
  };
};
