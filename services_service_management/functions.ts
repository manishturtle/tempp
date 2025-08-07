import { axiosInstance } from "./axiosInstance";

// Define interfaces for the functions data structure
export interface FunctionData {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface FunctionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FunctionData[];
}

const base_url_to_use = "functions/function";

/**
 * Service for managing functions
 */
export const functionsApi = {
  /**
   * Get all functions (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with functions data
   */
  getFunctions: async (
    page = 1,
    pageSize = 10,
    status?: string
  ): Promise<FunctionResponse> => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
    };

    if (status && status !== 'all') {
      params.status = status;
    }

    const response = await axiosInstance.get(`${base_url_to_use}/`, { params });
    return response.data;
  },

  /**
   * Get a single function by ID
   * @param id Function ID
   * @returns Promise with function data
   */
  getFunctionById: async (id: number): Promise<FunctionData> => {
    const response = await axiosInstance.get(`${base_url_to_use}/${id}/`);
    return response.data;
  },

  /**
   * Get all functions (no pagination)
   * @returns Promise with all functions data
   */
  getAllFunctions: async (): Promise<FunctionData[]> => {
    const response = await axiosInstance.get(`${base_url_to_use}/?all_records=true`);
    return response.data;
  },

  /**
   * Create a new function
   * @param data Function data
   * @returns Promise with created function
   */
  createFunction: async (data: Partial<FunctionData>): Promise<FunctionData> => {
    const response = await axiosInstance.post(`${base_url_to_use}/`, data);
    return response.data;
  },

  /**
   * Update a function
   * @param id Function ID
   * @param data Updated function data
   * @returns Promise with updated function
   */
  updateFunction: async (
    id: number,
    data: Partial<FunctionData>
  ): Promise<FunctionData> => {
    const response = await axiosInstance.patch(`${base_url_to_use}/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a function
   * @param id Function ID
   * @returns Promise with delete confirmation
   */
  deleteFunction: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/${id}/`);
  },
};

export default functionsApi;
