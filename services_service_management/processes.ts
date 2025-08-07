import { axiosInstance } from "./axiosInstance";

// Define interfaces for the processes data structure
export interface Process {
  id: number;
  name: string;
  description: string;
  status: string;
  process_groups?: number[];
  created_at: string;
  updated_at: string;
}

export interface ProcessResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Process[];
}

const base_url_to_use = "processes/process";

/**
 * Service for managing processes
 */
export const processesApi = {
  /**
   * Get all processes (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with processes data
   */
  getProcesses: async (
    page = 1, 
    pageSize = 10,
    status?: string
  ): Promise<ProcessResponse> => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
    };

    if (status && status !== 'all') {
      params.status = status;
    }

    const response = await axiosInstance.get(base_url_to_use, { params });
    return response.data;
  },

  /**
   * Get all processes (no pagination)
   * @returns Promise with all processes data
   */
  getAllProcesses: async (): Promise<Process[]> => {
    const response = await axiosInstance.get(`${base_url_to_use}/?all_records=true`);
    return response.data;
  },

  /**
   * Get a single process by ID
   * @param id Process ID
   * @returns Promise with process data
   */
  getProcessById: async (id: number): Promise<Process> => {
    const response = await axiosInstance.get(`${base_url_to_use}/${id}/`);
    return response.data;
  },

  /**
   * Create a new process
   * @param data Process data
   * @returns Promise with created process
   */
  createProcess: async (data: Partial<Process>): Promise<Process> => {
    const response = await axiosInstance.post(`${base_url_to_use}/`, data);
    return response.data;
  },

  /**
   * Update a process
   * @param id Process ID
   * @param data Updated process data
   * @returns Promise with updated process
   */
  updateProcess: async (
    id: number,
    data: Partial<Process>
  ): Promise<Process> => {
    const response = await axiosInstance.patch(`${base_url_to_use}/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a process
   * @param id Process ID
   * @returns Promise with delete confirmation
   */
  deleteProcess: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/${id}/`);
  },
};

export default processesApi;
