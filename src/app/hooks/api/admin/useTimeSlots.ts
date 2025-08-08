import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { 
  TimeSlot, 
  TimeSlotListResponse, 
  TimeSlotFormData 
} from '@/app/types/admin/timeSlot';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Fetch all time slots
export const useTimeSlots = (params?: { 
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  paginate?: boolean;
}) => {
  return useQuery<TimeSlotListResponse>({
    queryKey: ['time-slots', params],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.timeSlots.list, { 
        params,
        headers: getAuthHeaders() 
      });
      return data;
    },
  });
};

// Fetch single time slot
export const useTimeSlot = (id: number) => {
  return useQuery<TimeSlot>({
    queryKey: ['time-slot', id],
    queryFn: async () => {
      const { data } = await api.get(apiEndpoints.timeSlots.detail(id), {
        headers: getAuthHeaders()
      });
      return data;
    },
    enabled: !!id,
  });
};

// Create new time slot
export const useCreateTimeSlot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (timeSlot: TimeSlotFormData) => 
      api.post(apiEndpoints.timeSlots.create, timeSlot, { 
        headers: getAuthHeaders() 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
    },
  });
};

// Update time slot
export const useUpdateTimeSlot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & TimeSlotFormData) =>
      api.put(apiEndpoints.timeSlots.update(id), data, { 
        headers: getAuthHeaders() 
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      queryClient.invalidateQueries({ queryKey: ['time-slot', id] });
    },
  });
};

// Delete time slot
export const useDeleteTimeSlot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(apiEndpoints.timeSlots.delete(id), { 
        headers: getAuthHeaders() 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
    },
  });
};