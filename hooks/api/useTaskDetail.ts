import { useQuery } from '@tanstack/react-query';
import { getTaskDetail, TaskDetail } from '@/services/api/ofm/tasks';

/**
 * Hook for fetching task details
 */
export const useTaskDetail = (taskId: string | undefined) => {
  return useQuery<TaskDetail, Error>({
    queryKey: ['ofm', 'taskDetail', taskId],
    queryFn: () => getTaskDetail(taskId!),
    enabled: !!taskId,
    staleTime: 60 * 1000, // 1 minute
  });
};
