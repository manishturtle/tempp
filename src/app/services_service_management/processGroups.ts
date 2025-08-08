import { axiosInstance } from "./axiosInstance";

// Define interfaces for the process groups data structure
export interface ProcessGroup {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessGroupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProcessGroup[];
}

const base_url_to_use = "processes/process-group";

/**
 * Service for managing process groups
 */
export const processGroupsApi = {
  /**
   * Get all process groups (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with process groups data
   */
  getProcessGroups: async (
    page = 1, 
    pageSize = 10
  ): Promise<ProcessGroupResponse> => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
    };

    const response = await axiosInstance.get(base_url_to_use, { params });
    return response.data;
  },

  /**
   * Get all process groups (no pagination)
   * @returns Promise with all process groups data
   */
  getAllProcessGroups: async (): Promise<ProcessGroup[]> => {
    const response = await axiosInstance.get(`${base_url_to_use}/?all_records=true`);
    return response.data;
  },

  /**
   * Get a single process group by ID
   * @param id Process Group ID
   * @returns Promise with process group data
   */
  getProcessGroupById: async (id: number): Promise<ProcessGroup> => {
    const response = await axiosInstance.get(`${base_url_to_use}/${id}/`);
    return response.data;
  },

  /**
   * Create a new process group
   * @param data Process Group data
   * @returns Promise with created process group
   */
  createProcessGroup: async (data: Partial<ProcessGroup>): Promise<ProcessGroup> => {
    const response = await axiosInstance.post(`${base_url_to_use}/`, data);
    return response.data;
  },

  /**
   * Update a process group
   * @param id Process Group ID
   * @param data Updated process group data
   * @returns Promise with updated process group
   */
  updateProcessGroup: async (
    id: number,
    data: Partial<ProcessGroup>
  ): Promise<ProcessGroup> => {
    const response = await axiosInstance.patch(`${base_url_to_use}/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a process group
   * @param id Process Group ID
   * @returns Promise with delete confirmation
   */
  deleteProcessGroup: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/${id}/`);
  },
};

export default processGroupsApi;
