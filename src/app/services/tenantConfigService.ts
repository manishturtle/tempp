import axios from 'axios';
import { getTenantApiBaseUrl } from '../utils/tenant-admin/tenantUtils';

// Helper function to get auth headers
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken(),
  // Add any other required headers here (e.g., Authorization)
});


// Interfaces for the API response
export interface Address {
  street_address: string;
  street_address2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface CompanyInfo {
  name: string;
  legal_name?: string;
  tax_id?: string;
  registration_number?: string;
  vat_number?: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  description?: string;
  industry?: string;
  founded_year?: number;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h' | '24-hour';
  first_day_of_week: 'sunday' | 'monday';
  currency: string;
  locale: string;
  registered_address: Address;
  billing_address?: Address;
  shipping_address?: Address;
}

export interface Logo {
  url: string;
  filename?: string;
}

export interface BrandingConfig {
  theme_mode: 'light' | 'dark' | 'system';
  primary_color: string;
  secondary_color: string;
  company_logo_light?: Logo;
  company_logo_dark?: Logo;
  favicon?: Logo;
  default_font_style: string;
  custom_css?: string;
}

export interface LocalizationConfig {
  default_language: string;
  supported_languages: string[];
  default_timezone: string;
  date_format: string;
  time_format: '12h' | '24h' | '24-hour';
  first_day_of_week: 'sunday' | 'monday';
  number_format: string;
  currency: string;
  measurement_system: 'metric' | 'imperial';
}

export interface TenantConfig {
  company_info: CompanyInfo;
  branding_config: BrandingConfig;
  localization_config: LocalizationConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend form data interfaces
export interface GeneralFormData {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  taxId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h' | '24-hour';
  firstDayOfWeek: 'sunday' | 'monday';
  currency: string;
  language: string;
}

export interface BrandingFormData {
  default_theme_mode: 'light' | 'dark' | 'system';
  primary_brand_color: string;
  secondary_brand_color: string;
  default_font_style: string;
  company_logo_light?: string;
  company_logo_dark?: string;
  favicon?: string;
  custom_css?: string;
}

// Helper function to get CSRF token from cookies
const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || '';
};

// Base API configuration
const api = axios.create({
  baseURL: getTenantApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken(),
  },
  withCredentials: true,
});

// Add a request interceptor to include the CSRF token
api.interceptors.request.use(config => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

// Map API response to frontend form data
export const mapFromApiFormat = (data: any): GeneralFormData & BrandingFormData => {
  if (!data) {
    throw new Error('No data provided');
  }

  console.log('Mapping API data to form format:', data);
  
  // Extract company info from the root level as per API response
  const companyInfo = data.company_info || {};
  const address = companyInfo.registered_address || {};
  const brandingConfig = data.branding_config || {};
  const localizationConfig = data.localization_config || {};
  
  // Get country value - handle both string and object formats
  const countryValue = address.country;
  const countryId = typeof countryValue === 'object' ? 
    (countryValue.id || '') : 
    (countryValue?.toString() || '');
  
  // Map the data to match the form structure
  const formData: any = {
    // General Settings
    companyName: companyInfo.company_name || '',
    contactEmail: companyInfo.primary_contact_email || '',
    contactPhone: companyInfo.primary_contact_phone || '',
    taxId: companyInfo.tax_id || '',
    addressLine1: address.address_line_1 || '',
    addressLine2: address.address_line_2 || '',
    city: address.city?.toString() || '',
    state: address.state?.toString() || '',
    postalCode: address.postal_code || '',
    country: countryId, // Use the processed country ID
    
    // Localization
    timezone: localizationConfig.default_timezone || 'UTC',
    dateFormat: localizationConfig.date_format || 'MM/dd/yyyy',
    timeFormat: localizationConfig.time_format === '24h' ? '24h' : '12h',
    firstDayOfWeek: localizationConfig.first_day_of_week || 'monday',
    currency: (localizationConfig.currency || 'USD').toUpperCase(),
    language: localizationConfig.default_language || 'en',
    
    // Branding
    default_theme_mode: brandingConfig.default_theme_mode || 'light',
    primary_brand_color: brandingConfig.primary_brand_color || '#000080',
    secondary_brand_color: brandingConfig.secondary_brand_color || '#D3D3D3',
    default_font_style: brandingConfig.default_font_style || 'Roboto',
    company_logo_light: brandingConfig.company_logo_light?.url || '',
    company_logo_dark: brandingConfig.company_logo_dark?.url || '',
    favicon: brandingConfig.favicon?.url || '',
    custom_css: brandingConfig.custom_css || ''
  };
  
  // Add country code if available in the address object
  if (typeof address.country === 'object' && address.country?.code) {
    formData.countryCode = address.country.code;
  }

  console.log('Mapped form data:', formData);
  return formData;
};

// Map frontend form data to API format
export const mapToApiFormat = (data: Partial<GeneralFormData & BrandingFormData>): any => {
  if (!data) {
    throw new Error('No data provided');
  }

  console.log('Mapping form data to API format:', data);
  
  const result = {
    company_info: {
      company_name: data.companyName || '',
      primary_contact_email: data.contactEmail || '',
      primary_contact_phone: data.contactPhone || '',
      tax_id: data.taxId || '',
      registered_address: {
        address_line_1: data.addressLine1 || '',
        address_line_2: data.addressLine2 || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postalCode || '',
        country: data.country || ''
      }
    },
    branding_config: {
      default_theme_mode: data.default_theme_mode || 'light',
      primary_brand_color: data.primary_brand_color || '#000080',
      secondary_brand_color: data.secondary_brand_color || '#D3D3D3',
      default_font_style: data.default_font_style || 'Roboto',
      company_logo_light: data.company_logo_light ? {
        url: data.company_logo_light,
        filename: data.company_logo_light.includes('base64') ? 'logo-light.png' : data.company_logo_light.split('/').pop() || 'logo-light.png'
      } : undefined,
      company_logo_dark: data.company_logo_dark ? {
        url: data.company_logo_dark,
        filename: data.company_logo_dark.includes('base64') ? 'logo-dark.png' : data.company_logo_dark.split('/').pop() || 'logo-dark.png'
      } : undefined,
      favicon: data.favicon ? {
        url: data.favicon,
        filename: 'favicon.ico'
      } : undefined,
      custom_css: data.custom_css || ''
    },
    localization_config: {
      default_language: data.language || 'en',
      default_timezone: data.timezone || 'UTC',
      date_format: data.dateFormat || 'MM/dd/yyyy',
      time_format: data.timeFormat || '12h',
      first_day_of_week: data.firstDayOfWeek || 'monday',
      currency: (data.currency || 'USD').toLowerCase(),
      number_format: '1,234.56', // Default number format
      measurement_system: 'metric', // Default measurement system
      supported_languages: [data.language || 'en']
    }
  };

  console.log('Mapped API data:', result);
  return result;
};

// Fetch tenant configuration
export const getTenantConfig = async (): Promise<TenantConfig> => {
  try {
    const response = await api.get<TenantConfig>('/tenant-admin/tenant-config/');
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    // Return default config if API fails
    return {
      company_info: {
        name: '',
        contact_email: '',
        contact_phone: '',
        currency: 'USD',
        registered_address: {
          company_name: '',
          primary_email: '',
          primary_phone: '',
          address_line_1: '',
          address_line_2: '',
          tax_id: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
        },
      },
      branding_config: {
        company_logo_dark: {
          url: '',
          name: '',
        },
        company_logo_light: {
            url: '',
            id: '',
            
        },
        favicon: {
          url: '',
          id: '',
        },
          primary_color: '',
          secondary_color: '',
          default_font_style: '',
          font_style: '',
          theme_mode: 'system',
      },
      localization_config: {
        default_language: '',
        timezone: '',
        date_format: '',
        time_format: '',
        currency: '',
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};


// Save tenant configuration
export const saveTenantConfig = async (data: Partial<TenantConfig>): Promise<void> => {
  try {
    console.log('Saving tenant config with data:', data);
    const response = await api.post('/tenant-admin/tenant-config/', data, {
      headers: getAuthHeaders()
    });
    console.log('Save successful:', response.data);
  } catch (error) {
    console.error('Error saving tenant config:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error response:', error.response?.data);
    }
    throw error;
  }
};
export default {
  getTenantConfig,
  saveTenantConfig,
  mapFromApiFormat,
  mapToApiFormat
};
