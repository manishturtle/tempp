/**
 * API Constants
 * This file contains all API related constants used throughout the application
 */
import { COCKPIT_API_BASE_URL } from "../../utils/constants";


// Tenant Admin API endpoints
export const TENANT_ADMIN_API = {
  USERS: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/users/`,
  SETTINGS: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/settings/`,
  DASHBOARD: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/dashboard/`,
};

// User API endpoints
export const USER_API = {
  PROFILE: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/user/profile/`,
  DASHBOARD: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/user/dashboard/`,
  APPROVE: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/auth/user-approval/`,
};

// Authentication API endpoints
export const AUTH_API = {
  LOGIN: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/auth/login/`,
  LOGOUT: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/auth/logout/`,
  CHECK_USER: (tenantSlug: string) =>
    `${COCKPIT_API_BASE_URL}/${tenantSlug}/auth/check-user/`,
};
