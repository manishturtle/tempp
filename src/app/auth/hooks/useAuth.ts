/**
 * Authentication related hooks and utilities
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TenantService from "@/app/auth/services/tenantService";
import AuthService from "@/app/auth/services/authService";
import {
  CheckEmailResponse,
  LoginCredentials,
  LoginResponse,
  SignupCredentials,
} from "@/app/types/auth";
import { useAuthStore } from "../store/authStore";

/**
 * Get tenant schema from localStorage with tenant prefix
 * @returns The tenant schema string
 */
const getTenantSchema = (): string => {
  if (typeof window === "undefined") {
    throw new Error("Cannot determine tenant schema on server side");
  }

  // First try to get tenant slug from URL or localStorage
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  let tenantSlug = pathSegments[0];

  if (!tenantSlug) {
    tenantSlug = localStorage.getItem("currentTenantSlug") || "";
  }

  if (tenantSlug) {
    // Try to get tenant info from localStorage with tenant prefix (case insensitive)
    const tenantKeys = Object.keys(localStorage);
    const tenantInfoKey = tenantKeys.find(
      (key) => key.toLowerCase() === `${tenantSlug.toLowerCase()}_tenantinfo`
    );

    if (tenantInfoKey) {
      try {
        const tenantInfoStr = localStorage.getItem(tenantInfoKey);
        if (tenantInfoStr) {
          const tenantInfo = JSON.parse(tenantInfoStr);
          if (tenantInfo?.tenant_schema) {
            return tenantInfo.tenant_schema;
          }
        }
      } catch (e) {
        console.error("Error parsing tenant info from localStorage:", e);
        // Continue to fallback methods
      }
    }
  }

  // Fallback to session storage (for backward compatibility)
  const sessionData = sessionStorage.getItem("tenantInfo");
  if (sessionData) {
    try {
      const tenantInfo = JSON.parse(sessionData);
      if (tenantInfo?.tenant_schema) {
        return tenantInfo.tenant_schema;
      }
    } catch (e) {
      console.error("Error parsing tenant info from session:", e);
    }
  }

  // Fallback to environment variable if available
  if (process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA) {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA;
  }

  // Last resort: Use the tenant slug as the schema name
  if (tenantSlug) {
    return tenantSlug;
  }

  // Absolute last resort: use a default schema
  return "public";
};

/**
 * Hook for user login functionality with tenant slug support
 * @returns Login mutation object
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { login: setAuthState } = useAuthStore();

  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials: LoginCredentials) => {
      // Get the tenant schema for the API endpoint
      const tenantSchema = getTenantSchema();

      // Use the dynamic tenant schema in the login endpoint
      const response = await TenantService.post(
        `${tenantSchema}/auth/login/`,
        credentials
      );

      // Store the tokens
      if (response.data.access) {
        TenantService.setToken(response.data.access);
      }

      if (response.data.refresh) {
        TenantService.setRefreshToken(response.data.refresh);
      }

      // Update auth store with user data
      setAuthState(
        response.data.access,
        response.data.refresh,
        response.data.user
      );

      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries that may depend on auth state
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

/**
 * Hook for user logout functionality
 * @returns Logout mutation object
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      // Get tenant schema for the API endpoint
      const tenantSchema = getTenantSchema();

      // Call logout endpoint with tenant schema
      try {
        await TenantService.post(`/auth/logout/${tenantSchema}/`);
      } catch (error) {
        // Continue with logout even if server request fails
        console.error("Logout error:", error);
      }

      // Clear tokens and auth state
      logout();
    },
    onSuccess: () => {
      // Reset auth-related queries
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.clear();
    },
  });
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating authentication status
 */
/**
 * Hook for user signup functionality with tenant slug support
 * @returns Signup mutation object
 */
export const useSignup = () => {
  return useMutation<LoginResponse, Error, SignupCredentials>({
    mutationFn: async (credentials: SignupCredentials) => {
      // Get the tenant schema for the API endpoint
      const tenantSchema = getTenantSchema();

      // Use the dynamic tenant schema in the signup endpoint
      const response = await TenantService.post(
        `${tenantSchema}/auth/signup/`,
        credentials
      );

      return response.data;
    },
  });
};

/**
 * Hook for creating account and contact after OTP verification
 * @returns Mutation for creating account and contact
 */
export const createAccountAndContact = () => {
  return useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      // Get the tenant schema for the API endpoint
      const tenantSchema = getTenantSchema();

      // Use the dynamic tenant schema in the signup endpoint
      const response = await AuthService.post(
        `/auth/new-signup/${tenantSchema}/`,
        data
      );

      return response.data;
    },
  });
};

/**
 * Hook to check if an email exists in the system
 * @returns Check email mutation object
 */
export const useCheckEmail = () => {
  return useMutation<CheckEmailResponse, Error, string>({
    mutationFn: async (email: string) => {
      // Get the tenant schema for the API endpoint
      const tenantSchema = getTenantSchema();

      const response = await TenantService.post(
        `${tenantSchema}/auth/check-email/`,
        { email }
      );

      return response.data;
    },
  });
};

/**
 * Hook to verify OTP code
 * @returns OTP verification mutation object
 */
export interface OtpVerificationRequest {
  email: string;
  otp: string;
}

// Define interface for OTP verification response with full token and user data
export interface OtpVerificationResponse {
  success: boolean;
  message: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    customer_group?: {
      id: string;
      name: string;
      type: string;
    };
  };
}

export const useVerifyOTP = () => {
  const authStore = useAuthStore();

  // Extract the tenant slug from URL path
  const getTenantSlug = () => {
    if (typeof window === "undefined") return "";
    const pathSegments = window.location.pathname.split("/");
    const tenantIndex = pathSegments.findIndex(
      (segment) =>
        segment === "[tenant]" ||
        (segment &&
          segment.length > 0 &&
          segment !== "store" &&
          segment !== "checkout")
    );
    return tenantIndex >= 0 ? pathSegments[tenantIndex] : "";
  };

  return useMutation<
    OtpVerificationResponse,
    Error,
    { email: string; otp: string }
  >({
    mutationFn: async ({ email, otp }) => {
      const tenantSlug = getTenantSlug();

      // Use POST method to call the OTP verification endpoint
      const response = await TenantService.post(`${tenantSlug}/auth/otp/`, {
        email,
        otp,
      });
      const data = response.data as OtpVerificationResponse;

      // If authentication tokens are returned, store them
      if (data.access_token) {
        TenantService.setToken(data.access_token);
      }

      if (data.refresh_token) {
        TenantService.setRefreshToken(data.refresh_token);
      }

      // Update auth store with user data if available
      if (data.access_token && data.refresh_token && data.user) {
        authStore.login(data.access_token, data.refresh_token, data.user);
      }

      return data;
    },
  });
};

/**
 * Hook to request a new OTP to be sent
 * @returns Resend OTP mutation object
 */
export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  success: boolean;
  email?: string;
  message?: string;
}

export const useResendOTP = () => {
  return useMutation<ResendOtpResponse, Error, ResendOtpRequest>({
    mutationFn: async (data: ResendOtpRequest) => {
      // Get tenant slug from path
      const pathSegments = window.location.pathname.split("/");
      const tenantIndex = pathSegments.findIndex(
        (segment) =>
          segment === "[tenant]" ||
          (segment &&
            segment.length > 0 &&
            segment !== "store" &&
            segment !== "checkout")
      );
      const tenantSlug = tenantIndex >= 0 ? pathSegments[tenantIndex] : "";

      // Call the OTP resend endpoint with PUT method
      const response = await TenantService.put(`${tenantSlug}/auth/otp/`, data);
      return response.data;
    },
  });
};

/**
 * Interface for reset password request
 */
export interface ResetPasswordRequest {
  email: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Hook to reset user password
 * @returns Reset password mutation object
 */
export const useResetPassword = () => {
  const authStore = useAuthStore();

  // Extract the tenant slug from URL path
  const getTenantSlug = () => {
    if (typeof window === "undefined") return "";
    const pathSegments = window.location.pathname.split("/");
    const tenantIndex = pathSegments.findIndex(
      (segment) =>
        segment === "[tenant]" ||
        (segment &&
          segment.length > 0 &&
          segment !== "store" &&
          segment !== "checkout")
    );
    return tenantIndex >= 0 ? pathSegments[tenantIndex] : "";
  };

  return useMutation<OtpVerificationResponse, Error, ResetPasswordRequest>({
    mutationFn: async ({ email, new_password, confirm_password }) => {
      const tenantSlug = getTenantSlug();

      const response = await TenantService.post(
        `${tenantSlug}/auth/reset-password/`,
        {
          email,
          new_password,
          confirm_password,
        }
      );

      const data = response.data as OtpVerificationResponse;

      // If authentication tokens are returned, store them
      if (data.access_token) {
        TenantService.setToken(data.access_token);
      }

      if (data.refresh_token) {
        TenantService.setRefreshToken(data.refresh_token);
      }

      // Update auth store with user data if available
      if (data.access_token && data.refresh_token && data.user) {
        authStore.login(data.access_token, data.refresh_token, data.user);
      }

      return data;
    },
  });
};

export const isAuthenticated = (): boolean => {
  return !!TenantService.getToken();
};
