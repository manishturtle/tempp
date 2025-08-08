/**
 * Service API Client
 *
 * This module provides an axios instance for making requests to the service API
 */

import axios from "axios";

const getTenantSlug = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("admin_current_tenant_slug") || "";
  }
  return "";
};

// Helper function to get the tenant-specific admin token
const getTenantAdminToken = (): string | null => {
  if (typeof window !== "undefined") {
    const slug = getTenantSlug();
    if (slug) {
      return localStorage.getItem(`${slug}_admin_token`);
    }
  }
  return null;
};

// Helper function to get CSRF token from cookies
const getCsrfToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrftoken=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

// Create axios instance
const serviceApi = axios.create({
  baseURL: "http://localhost:8001/api",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", // Helps with CSRF validation
  },
});

// Add a request interceptor to dynamically set the auth token
serviceApi.interceptors.request.use((config) => {
  const token = getTenantAdminToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Add a function to set the auth token (to be called from components)
export const setServiceAuthToken = (token: string | null) => {
  if (token) {
    serviceApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete serviceApi.defaults.headers.common['Authorization'];
  }
};

// Request interceptor to add CSRF token to all requests
serviceApi.interceptors.request.use(
  (config) => {
    // Add CSRF token to all non-GET requests
    if (config.method !== "get") {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Define API endpoints for services
export const serviceApiEndpoints = {
  serviceSubCategories: {
    list: () => `${getTenantSlug()}/services/service-sub-categories/?all_records=true`,
    detail: (id: string | number) => `${getTenantSlug()}/services/service-sub-categories/${id}/`,
  },
  tasks: {
    update: (id: string | number) => `${getTenantSlug()}/service-tickets/tasks/${id}/`,
  },
  subtasks: {
    update: (id: string | number) => `${getTenantSlug()}/service-tickets/subtasks/${id}/`,
  }
};

export default serviceApi;
