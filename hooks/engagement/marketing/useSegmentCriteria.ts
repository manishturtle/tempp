'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../utils/apiClient';
import { MARKETING_API } from '../../../constants/apiConstants';

/**
 * Interface for segment criteria
 */
export interface SegmentCriteria {
  id?: number;
  list_id: number;
  field_name: string;
  operator: string;
  value: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * Interface for segment criteria response
 */
export interface SegmentCriteriaResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SegmentCriteria[];
}

/**
 * Hook to fetch segment criteria for a specific list
 */
export const useSegmentCriteria = (tenantSlug: string, listId?: number) => {
  return useQuery({
    queryKey: ['segmentCriteria', tenantSlug, listId],
    queryFn: async () => {
      try {
        const url = listId 
          ? `${MARKETING_API.SEGMENT_CRITERIA(tenantSlug)}?list_id=${listId}`
          : MARKETING_API.SEGMENT_CRITERIA(tenantSlug);
          
        const response = await apiClient.get<SegmentCriteriaResponse>(url);
        return response.data.results || [];
      } catch (error) {
        console.error('Error fetching segment criteria:', error);
        throw error;
      }
    },
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single segment criterion by ID
 */
export const useSegmentCriterionById = (tenantSlug: string, criterionId?: number) => {
  return useQuery({
    queryKey: ['segmentCriterion', tenantSlug, criterionId],
    queryFn: async () => {
      if (!criterionId) return null;
      
      try {
        const response = await apiClient.get<SegmentCriteria>(MARKETING_API.SEGMENT_CRITERION_BY_ID(tenantSlug, criterionId));
        return response.data;
      } catch (error) {
        console.error(`Error fetching segment criterion ${criterionId}:`, error);
        throw error;
      }
    },
    enabled: !!tenantSlug && !!criterionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new segment criterion
 */
export const useCreateSegmentCriterion = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (criterionData: Omit<SegmentCriteria, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
      const response = await apiClient.post<SegmentCriteria>(
        `/api/${tenantSlug}/marketing/segment-criteria/`,
        criterionData
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['segmentCriteria', tenantSlug, variables.list_id] });
    },
  });
};

/**
 * Hook to update an existing segment criterion
 */
export const useUpdateSegmentCriterion = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...criterionData 
    }: SegmentCriteria) => {
      if (!id) throw new Error('Criterion ID is required for update');
      
      const response = await apiClient.put<SegmentCriteria>(
        `/api/${tenantSlug}/marketing/segment-criteria/${id}/`,
        criterionData
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['segmentCriterion', tenantSlug, data.id] });
      queryClient.invalidateQueries({ queryKey: ['segmentCriteria', tenantSlug, data.list_id] });
    },
  });
};

/**
 * Hook to delete a segment criterion
 */
export const useDeleteSegmentCriterion = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, list_id }: { id: number, list_id: number }) => {
      await apiClient.delete(`/api/${tenantSlug}/marketing/segment-criteria/${id}/`);
      return { id, list_id };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['segmentCriteria', tenantSlug, data.list_id] });
    },
  });
};
