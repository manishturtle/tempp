import { getTenantApiBaseUrl } from '../utils/tenant-admin/tenantUtils';
import { COCKPIT_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

interface CompanyInfo {
  company_name: string;
  registered_address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string | number;
  };
  primary_contact_email: string;
  primary_contact_phone: string;
  tax_id?: string;
}

interface BrandingConfig {
  company_logo_light?: {
    url: string;
    filename: string;
  } | null;
  company_logo_dark?: {
    url: string;
    filename: string;
  } | null;
  favicon?: {
    url: string;
    filename: string;
  } | null;
  primary_brand_color?: string;
  secondary_brand_color?: string;
  default_font_style?: string;
  default_theme_mode?: 'light' | 'dark' | 'system';
  custom_css?: string;
}

interface LocalizationConfig {
  default_language: string;
  default_timezone?: string;
  date_format?: string;
  time_format?: string;
  currency?: string;
}

export interface TenantConfigData {
  company_info: Partial<CompanyInfo>;
  branding_config?: Partial<BrandingConfig>;
  localization_config?: Partial<LocalizationConfig>;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: string;
  max_users: number;
  description: string;
  session_type: string;
  billing_cycle?: string;
  storage_limit: number;
  support_level: string;
  api_call_limit: number;
  transaction_limit: number;
}

export interface FeatureSubfeature {
  id: number;
  key: string;
  name: string;
  settings?: Record<string, any>;
  description: string;
  enabled?: boolean;
}

export interface Feature {
  id: number;
  key: string;
  name: string;
  app_id: string | number;
  is_active: boolean;
  description: string;
  subfeatures?: FeatureSubfeature[];
  license_id: number;
  plan_name: string;
  license_status: string;
}

export interface ApplicationSubscription {
  license_id: number;
  plan_id: number;
  plan_name: string;
  plan_description: string;
  valid_from: string;
  valid_until: string | null;
  license_status: string;
  subscription_plan: SubscriptionPlan;
}

export interface TenantApplication {
  app_id: string | number;
  name: string;
  description: string;
  is_active: boolean;
  app_default_url: string;
  application_name?: string;
  created_at?: string;
  user_count: number;
  features: Feature[];
  subscription: ApplicationSubscription;
}

export interface TenantSubscription {
  tenant_id: number;
  tenant_name: string;
  tenant_status: string;
  default_url: string | null;
  paid_until: string | null;
  applications: TenantApplication[];
}

/**
 * Fetches tenant subscriptions
 * @param tenantSlug - The tenant slug/identifier
 * @returns Promise with tenant subscriptions data
 */
export const fetchTenantSubscriptions = async (tenantSlug: string): Promise<TenantSubscription> => {
  

  const response = await fetch(
    `${COCKPIT_API_BASE_URL}/platform-admin/tenant-subscription/${tenantSlug}/`,
    {
      method: 'GET',
      headers: {
        ...getAuthHeaders()
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch tenant subscriptions');
  }

  return response.json();
};

/**
 * Fetches tenant applications
 * @param tenantSlug - The tenant slug/identifier
 * @returns Promise with tenant applications data
 * @deprecated This function is deprecated. Use fetchTenantSubscriptions instead which now includes applications.
 */
export const fetchTenantApplications = async (tenantSlug: string): Promise<TenantApplication[]> => {

 
  // First try to get from the combined endpoint
  try {
    const subscriptionData = await fetchTenantSubscriptions(tenantSlug);
    if (subscriptionData.applications) {
      return subscriptionData.applications;
    }
  } catch (err) {
    console.warn('Failed to fetch applications from subscription endpoint, falling back to dedicated endpoint');
  }

  // Fallback to old endpoint
  const response = await fetch(
    `${COCKPIT_API_BASE_URL}/platform-admin/tenant-applications/${tenantSlug}/`,
    {
      method: 'GET',
      headers: {
        ...getAuthHeaders()
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch tenant applications');
  }

  return response.json();
};

export const getTenantConfig = async (): Promise<TenantConfigData> => {
  const url = `${getTenantApiBaseUrl()}/tenant-admin/tenant-config/`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch tenant configuration');
    }

    const responseData = await response.json();
    console.log('Tenant config fetched:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    throw error;
  }
};

export const saveTenantConfig = async (data: Partial<TenantConfigData>): Promise<void> => {
  const url = `${getTenantApiBaseUrl()}/tenant-admin/tenant-config/`;
  
  // Transform data to match API format
  const requestData: any = { ...data };
  
  // For consistency and to avoid errors, we now directly use the API format
  // rather than trying to transform form fields
  if (data.company_info) {
    requestData.company_info = {
      ...data.company_info
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add CSRF token if needed
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save tenant configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving tenant config:', error);
    throw error;
  }
};

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}
