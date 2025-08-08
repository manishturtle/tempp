/**
 * Authentication API service
 */
import axios, { AxiosInstance } from "axios";
import { COCKPIT_API_BASE_URL } from "@/utils/constants";

/**
 * API Service with token management
 */
const TenantService = {
  _api: null as unknown as AxiosInstance,

  /**
   * Initialize API instance with token from localStorage if available
   */
  _init() {
    if (!this._api) {
      // Get token from localStorage
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;

      this._api = axios.create({
        baseURL: COCKPIT_API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Add request interceptor to add token on each request
      this._api.interceptors.request.use(
        (config) => {
          // Get the latest token from localStorage (it might have changed)
          const currentToken =
            typeof window !== "undefined"
              ? localStorage.getItem("auth_token")
              : null;
          if (currentToken && config.headers) {
            config.headers.Authorization = `Bearer ${currentToken}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );
      this._api.interceptors.response.use(
        (response) => response,
        (error) => {
          if (
            error.response?.status === 403 &&
            error.response?.data?.detail === "Token has expired"
          ) {
            // Clear auth token from localStorage
            if (typeof window !== "undefined") {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
            }
          }
          return Promise.reject(error);
        }
      );
    }
    return this._api;
  },

  /**
   * Get active tenant slug
   */
  _getActiveTenantSlug(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("currentTenantSlug");
  },

  /**
   * Set auth token to be used in API requests
   */
  setToken(token: string | null): void {
    if (typeof window === "undefined") return;

    const tenantSlug = this._getActiveTenantSlug();
    if (tenantSlug) {
      if (token) {
        localStorage.setItem(`${tenantSlug}_access_token`, token);
      } else {
        localStorage.removeItem(`${tenantSlug}_access_token`);
      }
    } else {
      if (token) {
        localStorage.setItem("access_token", token);
      } else {
        localStorage.removeItem("access_token");
      }
    }
  },

  /**
   * Set refresh token in local storage
   */
  setRefreshToken(token: string | null): void {
    if (typeof window === "undefined") return;

    const tenantSlug = this._getActiveTenantSlug();
    if (tenantSlug) {
      if (token) {
        localStorage.setItem(`${tenantSlug}_refresh_token`, token);
      } else {
        localStorage.removeItem(`${tenantSlug}_refresh_token`);
      }
    } else {
      if (token) {
        localStorage.setItem("refresh_token", token);
      } else {
        localStorage.removeItem("refresh_token");
      }
    }
  },

  /**
   * Get current auth token
   */
  getToken(): string | null {
    if (typeof window === "undefined") {
      return null; // Return null during server-side rendering
    }

    // Always try to get tenant-specific token first
    const tenantSlug = this._getActiveTenantSlug();
    if (tenantSlug) {
      const tenantToken = localStorage.getItem(`${tenantSlug}_access_token`);
      if (tenantToken) return tenantToken;
    }

    // Fallback to global token
    return localStorage.getItem("access_token");
  },

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;

    const tenantSlug = this._getActiveTenantSlug();
    if (tenantSlug) {
      const tenantRefreshToken = localStorage.getItem(
        `${tenantSlug}_refresh_token`
      );
      if (tenantRefreshToken) return tenantRefreshToken;
    }

    return localStorage.getItem("refresh_token");
  },

  /**
   * Clear all auth tokens
   */
  clearTokens(): void {
    const tenantSlug = this._getActiveTenantSlug();
    if (tenantSlug) {
      localStorage.removeItem(`${tenantSlug}_access_token`);
      localStorage.removeItem(`${tenantSlug}_refresh_token`);
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  /**
   * Make GET request
   */
  get(url: string, config = {}) {
    return this._init().get(url, config);
  },

  /**
   * Make POST request
   */
  post(url: string, data = {}, config = {}) {
    return this._init().post(url, data, config);
  },

  /**
   * Make PUT request
   */
  put(url: string, data = {}, config = {}) {
    return this._init().put(url, data, config);
  },

  /**
   * Make PATCH request
   */
  patch(url: string, data = {}, config = {}) {
    return this._init().patch(url, data, config);
  },

  /**
   * Make DELETE request
   */
  delete(url: string, config = {}) {
    return this._init().delete(url, config);
  },
};

export default TenantService;
