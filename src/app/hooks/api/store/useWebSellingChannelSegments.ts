/**
 * Hook for fetching web selling channel segments
 */
import { useQuery } from "@tanstack/react-query";
import storeApi from "@/lib/storeapi";

/**
 * Types for selling channel segments
 */
export interface SellingChannelSegment {
  id: number;
  customer_group_id: number;
  customer_group_name: string;
  customer_group_display_name: string;
  customer_group_description: string;
  selling_channel_id: number;
  selling_channel_name: string;
  selling_channel_code: string;
  status: string;
  segment_name: string;
}

export interface WebSellingChannelSegmentsResponse {
  INDIVIDUAL: SellingChannelSegment[];
  BUSINESS: SellingChannelSegment[];
  [key: string]: SellingChannelSegment[]; // For any other customer groups that might be added in the future
}

/**
 * Hook to fetch web selling channel segments
 * @returns Query result with web selling channel segments data
 */
export const useWebSellingChannelSegments = () => {
  return useQuery<WebSellingChannelSegmentsResponse, Error>({
    queryKey: ["webSellingChannelSegments"],
    queryFn: async () => {
      try {
        // The storeApi automatically handles the tenant slug in the interceptor
        const response = await storeApi.get("/web-selling-channel-segments/");
        return response.data;
      } catch (error) {
        console.error("Error fetching web selling channel segments:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default useWebSellingChannelSegments;
