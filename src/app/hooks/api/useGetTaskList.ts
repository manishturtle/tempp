import { useQuery } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

export interface TaskListItem {
  oif_id: string;
  order_id: string;
  product_id: string;
  sku: string;
  current_step: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TaskListItem[];
}

export interface TaskListParams {
  page?: number;
  page_size?: number;
  status?: string[];
  step?: string[];
  assigned_to?: string;
  search?: string;
  ordering?: string;
}

/**
 * Fetch task list from the API
 */
const fetchTaskList = async (params: TaskListParams): Promise<TaskListResponse> => {
  const { data } = await api.get('/api/yash/ofm/execution/tasks/list/', { 
    params,
    headers: getAuthHeaders()
  });
  return data;
};

/**
 * Hook for getting the task list
 */
const useGetTaskList = (params: TaskListParams = {}) => {
  return useQuery({
    queryKey: ['ofm', 'tasks', params],
    queryFn: () => fetchTaskList(params),
    staleTime: 1000 * 60, // 1 minute
  });
};

export default useGetTaskList;
