/**
 * Authentication related types
 */

/**
 * Login request credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup request credentials
 */
export interface SignupCredentials {
  account_type: 'INDIVIDUAL' | 'BUSINESS';
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
  phone?: string;
  // Business-specific fields
  business_name?: string;
  legal_name?: string;
  company_size?: string;
  website?: string;
  industry?: string;
  tax_id?: string;
  mobile?: string;
  // Additional data
  contacts?: Array<{
    first_name: string;
    last_name: string;
    email: string;
    job_title?: string;
    phone?: string;
  }>;
  addresses?: Array<{
    address_type: string;
    street_1: string;
    street_2?: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
    full_name?: string;
    phone_number?: string;
  }>;
}

/**
 * Login response from API
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  access?: string;  // Alternative field name for access token
  refresh?: string; // Alternative field name for refresh token
}

/**
 * Email check response from API
 */
export interface CheckEmailResponse {
  email: string;
  exists: boolean;
  tenant_slug: string;
  tenant_id: number;
  message: string;
  is_active?: boolean;
  is_verified?: boolean;
  has_password?: boolean;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}
