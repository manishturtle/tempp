import { axiosInstance } from "./axiosInstance";
import { ServiceCategory } from "./serviceCategory";

// Define interfaces for the service subcategory data structure
export interface ServiceSubcategory {
  id: number;
  name: string;
  description: string;
  status: string;
  service_category: ServiceCategory;
  created_at: string;
  updated_at: string;
  sop_details: {
    id: number;
    sop_group: {
      id: number;
      process: {
        id: number;
        name: string;
        description: string;
        status: string;
        audience: string;
        created_at: string;
        updated_at: string;
      };
      base_name: string;
      created_at: string;
      updated_at: string;
    };
    sop_name: string;
    version_number: number;
    description: string;
    effective_date: string | null;
    status: string;
    allow_step_reordering: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface ServiceSubcategoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceSubcategory[];
}

const base_url_to_use = "services/service-sub-categories";

/**
 * Service for managing service subcategories
 */
export const serviceSubcategoryApi = {
  /**
   * Get all service subcategories (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with service subcategories data
   */
  getServiceSubcategories: async (
    page = 1,
    pageSize = 10,
    status?: string
  ): Promise<ServiceSubcategoryResponse> => {
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
   * Get a single service subcategory by ID
   * @param id Service subcategory ID
   * @returns Promise with service subcategory data
   */
  getServiceSubcategoryById: async (id: number): Promise<ServiceSubcategory> => {
    const response = await axiosInstance.get(`${base_url_to_use}/${id}/`);
    return response.data;
  },

  /**
   * Get all service subcategories (no pagination)
   * @returns Promise with all service subcategories data
   */
  getAllServiceSubcategories: async (serviceCategoryId?: number): Promise<ServiceSubcategory[]> => {
    const params: Record<string, any> = {
      all_records: true
    };
    
    if (serviceCategoryId) {
      params.service_category = serviceCategoryId;
    }
    
    const response = await axiosInstance.get(`${base_url_to_use}/`, { params });
    return response.data;
  },

  /**
   * Create a new service subcategory
   * @param data Service subcategory data
   * @returns Promise with created service subcategory
   */
  createServiceSubcategory: async (data: Partial<ServiceSubcategory>): Promise<ServiceSubcategory> => {
    const response = await axiosInstance.post(`${base_url_to_use}/`, data);
    return response.data;
  },

  /**
   * Update a service subcategory
   * @param id Service subcategory ID
   * @param data Updated service subcategory data
   * @returns Promise with updated service subcategory
   */
  updateServiceSubcategory: async (
    id: number,
    data: Partial<ServiceSubcategory>
  ): Promise<ServiceSubcategory> => {
    const response = await axiosInstance.patch(`${base_url_to_use}/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a service subcategory
   * @param id Service subcategory ID
   * @returns Promise with delete confirmation
   */
  deleteServiceSubcategory: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/${id}/`);
  },
};

export default serviceSubcategoryApi;
