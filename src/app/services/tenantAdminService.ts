/**
 * Tenant Admin Service
 * Handles all API calls for the tenant admin section
 */

import { TENANT_ADMIN_API } from './apiConstant';
import { getAuthHeaders } from "../hooks/api/auth";
/**
 * Fetch tenant users
 * @param tenantSlug The tenant's unique slug
 * @returns Promise with tenant users data
 */
export const fetchTenantUsers = async (tenantSlug: string) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(TENANT_ADMIN_API.USERS(tenantSlug), {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant users: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    throw error;
  }
};

/**
 * Fetch a single tenant user by ID
 * @param tenantSlug The tenant's unique slug
 * @param userId User ID
 * @returns Promise with user data
 */
export const fetchTenantUserById = async (tenantSlug: string, userId: string) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(`${TENANT_ADMIN_API.USERS(tenantSlug)}${userId}/`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant user: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching tenant user ${userId}:`, error);
    throw error;
  }
};

/**
 * Create a new tenant user
 * @param tenantSlug The tenant's unique slug
 * @param userData User data to create
 * @returns Promise with created user data
 */
export const createTenantUser = async (tenantSlug: string, userData: any) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(TENANT_ADMIN_API.USERS(tenantSlug), {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create tenant user: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating tenant user:', error);
    throw error;
  }
};

/**
 * Update an existing tenant user
 * @param tenantSlug The tenant's unique slug
 * @param userId User ID
 * @param userData Updated user data
 * @returns Promise with updated user data
 */
export const updateTenantUser = async (tenantSlug: string, userId: string, userData: any) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(`${TENANT_ADMIN_API.USERS(tenantSlug)}${userId}/`, {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update tenant user: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating tenant user ${userId}:`, error);
    throw error;
  }
};

/**
 * Fetch tenant dashboard data
 * @param tenantSlug The tenant's unique slug
 * @returns Promise with dashboard data
 */
export const fetchTenantDashboard = async (tenantSlug: string) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(TENANT_ADMIN_API.DASHBOARD(tenantSlug), {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant dashboard: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tenant dashboard:', error);
    throw error;
  }
};

/**
 * Fetch tenant settings
 * @param tenantSlug The tenant's unique slug
 * @returns Promise with tenant settings data
 */
export const fetchTenantSettings = async (tenantSlug: string) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(TENANT_ADMIN_API.SETTINGS(tenantSlug), {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant settings: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    throw error;
  }
};

/**
 * Update tenant settings
 * @param tenantSlug The tenant's unique slug
 * @param settingsData Updated settings data
 * @returns Promise with updated settings data
 */
export const updateTenantSettings = async (tenantSlug: string, settingsData: any) => {
  try {
    const authHeader = getAuthHeaders();
    const response = await fetch(TENANT_ADMIN_API.SETTINGS(tenantSlug), {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settingsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update tenant settings: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    throw error;
  }
};
