import { axiosInstance } from "./axiosInstance";

// Define interfaces for the service users data structure
export interface ServiceUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone: string;
  user_id?: number | null;
  user_type?: number[]; // Changed to number[] to match drawer component
  created_at?: string;
  updated_at?: string;
  linked_account?: number;
  org_id?: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const baseUrl = "service-users/users/";

export const serviceUsersApi = {
  /**
   * Get paginated service users
   * @param page Page number
   * @param pageSize Number of items per page
   * @param search Optional search query
   * @returns Promise with paginated service users
   */
  getServiceUsers: async (
    page = 1,
    pageSize = 10,
    search = ""
  ): Promise<PaginatedResponse<ServiceUser>> => {
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      
      if (search) {
        params.search = search;
      }
      
      const response = await axiosInstance.get(baseUrl, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching service users:", error);
      throw error;
    }
  },

  /**
   * Get all service users (non-paginated)
   * @returns Promise with array of service users
   */
  getAllServiceUsers: async (): Promise<ServiceUser[]> => {
    try {
      const response = await axiosInstance.get(`${baseUrl}?all_records=true`);
      return response.data;
    } catch (error) {
      console.error("Error fetching all service users:", error);
      throw error;
    }
  },

  /**
   * Get a single service user by ID
   * @param id Service user ID
   * @returns Promise with service user data
   */
  getServiceUserById: async (id: number): Promise<ServiceUser> => {
    try {
      const response = await axiosInstance.get(`${baseUrl}${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching service user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new service user
   * @param data Service user data
   * @returns Promise with created service user
   */
  createServiceUser: async (
    data: Partial<ServiceUser>
  ): Promise<ServiceUser> => {
    try {
      // Ensure user_type is formatted as expected by the backend
      const preparedData = {
        ...data,
        // Make sure user_type is an array, or undefined if not provided
        user_type: data.user_type || undefined
      };
      
      const response = await axiosInstance.post(baseUrl, preparedData);
      return response.data;
    } catch (error) {
      console.error("Error creating service user:", error);
      throw error;
    }
  },

  /**
   * Update a service user
   * @param id Service user ID
   * @param data Updated service user data
   * @returns Promise with updated service user
   */
  updateServiceUser: async (
    id: number,
    data: Partial<ServiceUser>
  ): Promise<ServiceUser> => {
    try {
      // Ensure user_type is formatted as expected by the backend
      const preparedData = {
        ...data,
        // Make sure user_type is an array, or undefined if not provided
        user_type: data.user_type || undefined
      };
      
      const response = await axiosInstance.put(`${baseUrl}${id}/`, preparedData);
      return response.data;
    } catch (error) {
      console.error(`Error updating service user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a service user
   * @param id Service user ID
   * @returns Promise with delete confirmation
   */
  deleteServiceUser: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`${baseUrl}${id}/`);
    } catch (error) {
      console.error(`Error deleting service user ${id}:`, error);
      throw error;
    }
  },
};

export default serviceUsersApi;