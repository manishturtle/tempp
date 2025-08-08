import api from "@/lib/api";
import { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/** GuestConfig type (GET response) */
export interface GuestConfig {
  id: number;
  selling_channel_id: number;
  customer_group_id: number;
  segment_id: number;
  [key: string]: any; // for any extra fields
}

/** Bulk create/update input type */
export interface GuestConfigInput {
  id?: number; // only for update
  selling_channel_id: number;
  customer_group_id: number;
  segment_id: number;
}

/** GET all guest configs */
export function getGuestConfigs(): Promise<GuestConfig[]> {
  return api.get(apiEndpoints.guestConfig.list, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/** BULK CREATE guest configs */
export function bulkCreateGuestConfigs(data: GuestConfigInput[]): Promise<GuestConfig[]> {
  return api.post(apiEndpoints.guestConfig.bulkCreate, data, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/** BULK UPDATE guest configs */
export function bulkUpdateGuestConfigs(data: GuestConfigInput[]): Promise<GuestConfig[]> {
  return api.patch(apiEndpoints.guestConfig.bulkUpdate, data, {
    headers: getAuthHeaders(),
  }).then(res => res.data);
}

/** React Query hook: GET all guest configs */
export function useGuestConfigs() {
  return useQuery({
    queryKey: ["guestConfigs"],
    queryFn: getGuestConfigs,
  });
}

/** React Query hook: BULK CREATE guest configs */
export function useBulkCreateGuestConfigs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkCreateGuestConfigs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guestConfigs"] });
    },
  });
}

/** React Query hook: BULK UPDATE guest configs */
export function useBulkUpdateGuestConfigs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateGuestConfigs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guestConfigs"] });
    },
  });
}
