import axios from 'axios';

// Helper function to get CSRF token from cookies
const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrftoken=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Helper function to get tenant slug from URL
const getTenantSlug = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || 'default';
  }
  
  // Get tenant slug from URL (first segment after domain)
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const tenantSlug = pathSegments[0] || localStorage.getItem('currentTenantSlug') || 'default';
  
  return tenantSlug;
};

// Helper function to get tenant schema from localStorage with tenant prefix
const getTenantSchema = (): string => {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA || 'default';
  }
  
  const tenantSlug = getTenantSlug();
  
  try {
    // Try to get tenant info from localStorage with tenant prefix
    const tenantInfoStr = localStorage.getItem(`${tenantSlug}_tenantInfo`);
    if (tenantInfoStr) {
      const tenantInfo = JSON.parse(tenantInfoStr);
      if (tenantInfo.tenant_schema) {
        return tenantInfo.tenant_schema;
      }
    }
    
    console.warn('Tenant schema not found in localStorage, using tenant slug as fallback');
    return tenantSlug;
    
  } catch (error) {
    console.error('Error retrieving tenant schema:', error);
    return tenantSlug; // Fallback to tenant slug if there's an error
  }
};

// Create base URL without tenant schema
const getBaseApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8045/api/v1';
};

const api = axios.create({
  withCredentials: true, // Enable sending cookies with cross-origin requests
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Helps with CSRF validation
  },
});

// Request interceptor to set the base URL with current tenant schema for each request
api.interceptors.request.use((config) => {
  // Only modify the config if URL is not absolute
  if (!config.url?.startsWith('http')) {
    const baseUrl = getBaseApiUrl();
    const tenantSchema = getTenantSchema();
    config.baseURL = `${baseUrl}/${tenantSchema}/`;
  }
  return config;
});

// Add a function to set the auth token (to be called from components)
export const setAuthToken = (token: string | null) => {
  if (token) {
    // api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Auth token set (currently disabled):', token);
  } else {
    // delete api.defaults.headers.common['Authorization'];
    console.log('Auth token removed (currently disabled)');
  }
};

// Request interceptor to add CSRF token to all requests
api.interceptors.request.use(
  (config) => {
    // Add CSRF token to all non-GET requests
    if (config.method !== 'get') {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      // You might want to redirect to login or refresh token here
      console.error('Unauthorized access (auth currently disabled):', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Export common API endpoints
export interface ApiEndpoints {
  auth: {
    login: string;
    logout: string;
    me: string;
  };
  configuration: {
    admin: () => string;
  };
  users: {
    list: string;
    detail: (id: string) => string;
  };
  products: {
    list: () => string;
    detail: (id: string | number) => string;
    categories: string;
    variants: {
      list: (productId: number) => string;
      detail: (productId: number, variantId: number) => string;
      images: {
        list: (productId: number, variantId: number) => string;
        detail: (productId: number, variantId: number, imageId: number) => string;
      };
    };
    images: {
      list: (productId: number) => string;
      detail: (productId: number, imageId: number) => string;
    };
    kitComponents: {
      list: (productId: number) => string;
      detail: (productId: number, componentId: number) => string;
    };
  };
  catalogue: {
    divisions: {
      list: string;
      detail: (id: number) => string;
    };
    categories: {
      list: string;
      detail: (id: number) => string;
    };
    subcategories: {
      list: string;
      detail: (id: number) => string;
    };
    unitOfMeasures: {
      list: string;
      detail: (id: number) => string;
    };
    productStatuses: {
      list: string;
      detail: (id: number) => string;
    };
  };
  inventory: {
    list: string;
    detail: (id: number) => string;
    summary: string;
    locations: {
      list: string;
      detail: (id: number) => string;
    };
    adjustmentReasons: {
      list: string;
      detail: (id: number) => string;
    };
    adjustments: {
      list: string;
      detail: (id: number) => string;
    };
    serialized: {
      list: string;
      detail: (id: number) => string;
    };
    lots: {
      list: string;
      detail: (id: number) => string;
    };
  };
  pricing: {
    customerGroups: {
      list: string;
      detail: (id: number) => string;
    };
    sellingChannels: {
      list: string;
      detail: (id: number) => string;
    };
    taxRegions: {
      list: string;
      detail: (id: number) => string;
    };
    taxRates: {
      list: string;
      detail: (id: number) => string;
    };
    taxRateProfiles: {
      list: string;
      detail: (id: number) => string;
    };
    countries: {
      list: string;
    };
  };
  attributes: {
    attributeGroups: {
      list: string;
      detail: (id: number) => string;
    };
    attributes: {
      list: string;
      detail: (id: number) => string;
    };
    attributeOptions: {
      list: string;
      detail: (id: number) => string;
      byAttribute: (attributeId: number) => string;
    };
  };
  settings: {
    client: (clientId: number) => string;
  };
}

export const apiEndpoints: ApiEndpoints = {
  auth: {
    login: '/auth/login/',
    logout: '/auth/logout/',
    me: '/auth/me/',
  },
  configuration: {
    admin: () => '/om/admin/configuration',
  },
  users: {
    list: '/users/',
    detail: (id: string) => `/users/${id}/`,
  },
  products: {
    list: () => '/products/products/',
    detail: (id: string | number) => `/products/products/${id}/`,
    categories: '/product-categories/',
    variants: {
      list: (productId: number) => `/products/products/${productId}/variants/`,
      detail: (productId: number, variantId: number) => `/products/products/${productId}/variants/${variantId}/`,
      images: {
        list: (productId: number, variantId: number) => `/products/products/${productId}/variants/${variantId}/images/`,
        detail: (productId: number, variantId: number, imageId: number) => `/products/products/${productId}/variants/${variantId}/images/${imageId}/`,
      },
    },
    images: {
      list: (productId: number) => `/products/products/${productId}/images/`,
      detail: (productId: number, imageId: number) => `/products/products/${productId}/images/${imageId}/`,
    },
    kitComponents: {
      list: (productId: number) => `/products/products/${productId}/kit-components/`,
      detail: (productId: number, componentId: number) => `/products/products/${productId}/kit-components/${componentId}/`,
    },
  },
  catalogue: {
    divisions: {
      list: '/products/catalogue/divisions/',
      detail: (id: number) => `/products/catalogue/divisions/${id}/`,
    },
    categories: {
      list: '/products/catalogue/categories/',
      detail: (id: number) => `/products/catalogue/categories/${id}/`,
    },
    subcategories: {
      list: '/products/catalogue/subcategories/',
      detail: (id: number) => `/products/catalogue/subcategories/${id}/`,
    },
    unitOfMeasures: {
      list: '/products/catalogue/units-of-measure/',
      detail: (id: number) => `/products/catalogue/units-of-measure/${id}/`,
    },
    productStatuses: {
      list: '/products/catalogue/product-statuses/',
      detail: (id: number) => `/products/catalogue/product-statuses/${id}/`,
    },
  },
  inventory: {
    list: '/inventory/inventory/',
    detail: (id: number) => `/inventory/inventory/${id}/`,
    summary: '/inventory/summary/',
    locations: {
      list: '/inventory/fulfillment-locations/',
      detail: (id: number) => `/inventory/fulfillment-locations/${id}/`,
    },
    adjustmentReasons: {
      list: '/inventory/adjustment-reasons/',
      detail: (id: number) => `/inventory/adjustment-reasons/${id}/`,
    },
    adjustments: {
      list: '/inventory/adjustments/',
      detail: (id: number) => `/inventory/adjustments/${id}/`,
    },
    serialized: {
      list: '/inventory/serialized/',
      detail: (id: number) => `/inventory/serialized/${id}/`,
    },
    lots: {
      list: '/inventory/lots/',
      detail: (id: number) => `/inventory/lots/${id}/`,
    },
  },
  pricing: {
    customerGroups: {
      list: '/pricing/customer-groups/',
      detail: (id: number) => `/pricing/customer-groups/${id}/`,
    },
    sellingChannels: {
      list: '/pricing/selling-channels/',
      detail: (id: number) => `/pricing/selling-channels/${id}/`,
    },
    taxRegions: {
      list: '/pricing/tax-regions/',
      detail: (id: number) => `/pricing/tax-regions/${id}/`,
    },
    taxRates: {
      list: '/pricing/tax-rates/',
      detail: (id: number) => `/pricing/tax-rates/${id}/`,
    },
    taxRateProfiles: {
      list: '/pricing/tax-rate-profiles/',
      detail: (id: number) => `/pricing/tax-rate-profiles/${id}/`,
    },
    countries: {
      list: '/pricing/countries/',
    },
  },
  attributes: {
    attributeGroups: {
      list: '/products/attributes/groups/',
      detail: (id: number) => `/products/attributes/groups/${id}/`,
    },
    attributes: {
      list: '/products/attributes/attributes/',
      detail: (id: number) => `/products/attributes/attributes/${id}/`,
    },
    attributeOptions: {
      list: '/products/attributes/options/',
      detail: (id: number) => `/products/attributes/options/${id}/`,
      byAttribute: (attributeId: number) => `/products/attributes/${attributeId}/options/`,
    },
  },
  settings: {
    client: (clientId: number) => `/tenants/settings/${clientId}/`,
  },
};

export default api;
