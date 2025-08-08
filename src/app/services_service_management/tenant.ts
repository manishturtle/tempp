import { axiosInstance } from "./axiosInstance";

export interface TenantUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

const baseUrl = "tenant-users/all-users/";

/**
 *
 * Service for managing tenant
 */
export const tenantApi = {
  /**
   * Get all tenant users for the dropdown
   * @returns Promise with array of tenant users
   */
  getTenantUsers: async (): Promise<TenantUser[]> => {
    try {
      const response = await axiosInstance.get(baseUrl);
      return response.data;
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      throw error;
    }
  },
};

export default tenantApi;
