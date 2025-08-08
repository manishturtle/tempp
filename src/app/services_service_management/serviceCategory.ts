import { axiosInstance } from "./axiosInstance";
import { FunctionData } from "./functions";

// Define interfaces for the service category data structure
export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  status: string;
  function: FunctionData;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceCategory[];
}

const base_url_to_use = "services/service-categories";

/**
 * Service for managing service categories
 */
export const serviceCategoryApi = {
  /**
   * Get all service categories (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with service categories data
   */
  getServiceCategories: async (
    page = 1,
    pageSize = 10,
    status?: string
  ): Promise<ServiceCategoryResponse> => {
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
   * Get a single service category by ID
   * @param id Service category ID
   * @returns Promise with service category data
   */
  getServiceCategoryById: async (id: number): Promise<ServiceCategory> => {
    const response = await axiosInstance.get(`${base_url_to_use}/${id}/`);
    return response.data;
  },

  /**
   * Get all service categories (no pagination)
   * @returns Promise with all service categories data
   */
  getAllServiceCategories: async (functionId?: number): Promise<ServiceCategory[]> => {
    const params: Record<string, any> = {
      all_records: true
    };
    
    if (functionId) {
      params.function = functionId;
    }
    
    const response = await axiosInstance.get(`${base_url_to_use}/`, { params });
    return response.data;
  },

  /**
   * Create a new service category
   * @param data Service category data
   * @returns Promise with created service category
   */
  createServiceCategory: async (data: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const response = await axiosInstance.post(`${base_url_to_use}/`, data);
    return response.data;
  },

  /**
   * Update a service category
   * @param id Service category ID
   * @param data Updated service category data
   * @returns Promise with updated service category
   */
  updateServiceCategory: async (
    id: number,
    data: Partial<ServiceCategory>
  ): Promise<ServiceCategory> => {
    const response = await axiosInstance.patch(`${base_url_to_use}/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a service category
   * @param id Service category ID
   * @returns Promise with delete confirmation
   */
  deleteServiceCategory: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/${id}/`);
  },
};

export default serviceCategoryApi;
