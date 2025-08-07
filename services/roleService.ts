import { COCKPIT_API_BASE_URL } from "../../utils/constants";
import { getAuthHeaders } from "../hooks/api/auth";


export interface Role {
  id: number;
  name: string;
  description: string;
}

/**
 * API response format for roles
 */
export interface RolesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Role[];
}

/**
 * Fetch all roles for the tenant
 * @param tenantSlug The tenant slug
 * @returns Promise with roles data
 */
export const fetchRoles = async (tenantSlug: string): Promise<Role[]> => {
  try {
    const response = await fetch(
      `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/roles/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`);
    }

    // Parse the response as RolesResponse format
    const data: RolesResponse = await response.json();

    // Return the results array which contains the roles
    return data.results;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
};
