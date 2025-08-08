import axios from "axios";
import { COCKPIT_API_BASE_URL } from "@/utils/constants";

/**
 * Get the current tenant slug from localStorage
 * @returns The current tenant slug or empty string if not found
 */
const getTenantSlug = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("admin_current_tenant_slug") || "";
  }
  return "";
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
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8045/api/v1/",
  withCredentials: true, // Enable sending cookies with cross-origin requests
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", // Helps with CSRF validation
  },
});

export const tenantApi = axios.create({
  baseURL: `${COCKPIT_API_BASE_URL}/`,
  withCredentials: true, // Enable sending cookies with cross-origin requests
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", // Helps with CSRF validation
  },
});

// Add a function to set the auth token (to be called from components)
export const setAuthToken = (token: string | null) => {
  if (token) {
    // api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log("Auth token set (currently disabled)09:", token);
  } else {
    // delete api.defaults.headers.common['Authorization'];
    console.log("Auth token removed (currently disabled)");
  }
};

// Request interceptor to add CSRF token to all requests
api.interceptors.request.use(
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
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      // You might want to redirect to login or refresh token here
      console.error(
        "Unauthorized access (auth currently disabled):",
        error.response.data
      );
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
  admin: {
    orders: {
      list: () => string;
      detail: (id: string) => string;
      create: () => string;
      update: (id: string) => string;
    };
    invoices: {
      list: () => string;
      detail: (id: string) => string;
      create: () => string;
      update: (id: string) => string;
      getUnpaidInvoices: () => string;
      getSegment: () => string;
      getInvoiceConfigs: () => string;
    };
    receipts: {
      list: () => string;
      detail: (id: number) => string;
      create: () => string;
      correct: (id: number) => string;
      delete: (id: number) => string;
    };
  };
  paymentMethods: {
    list: (params?: { is_active?: boolean; payment_type?: string }) => string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
    statistics: string;
  };
  shippingZones: {
    list: (params?: { is_active?: boolean; search?: string }) => string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
    pincodes: (zoneId: number) => string;
    statistics: string;
  };
  pincodes: {
    list: (params?: {
      is_active?: boolean;
      search?: string;
      zone_id?: number;
    }) => string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
    validate: string;
  };
  configuration: {
    admin: () => string;
  };
  users: {
    list: string;
    detail: (id: string) => string;
  };
  siteConfig: {
    header: string;
    adminHeader: string;
  };
  pages: {
    pages: string;
    pageDetail: (slug: string) => string;
    adminPages: string;
    adminContentBlocks: string;
    reorderContentBlocks: string;
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
        detail: (
          productId: number,
          variantId: number,
          imageId: number
        ) => string;
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
      activeHierarchy: () => string;
    };
    categories: {
      list: () => string;
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
    exclusionsChannels: {
      get: (params: {
        category_id?: number;
        subcategory_id?: number;
        product_id?: number;
      }) => string;
    };
  };
  storePickup: {
    list: string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  customerGroupSellingChannels: {
    list: string;
  };
  guestConfig: {
    list: string;
    bulkCreate: string;
    bulkUpdate: string;
  };
  timeSlots: {
    list: string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  shippingMethods: {
    list: string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  checkoutConfigs: {
    list: string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  uiTemplateSettings: {
    list: string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  featureToggleSettings: {
    list: string;
    detail: (id: number) => string;
    create: string;
    update: (id: number) => string;
    delete: (id: number) => string;
  };
  sellingChannels: {
    active: string;
  };
  inventory: {
    list: () => string;
    detail: (id: number) => string;
    summary: () => string;
    locations: {
      list: () => string;
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
  opportunities: {
    roles: {
      list: (params?: {
        page?: number;
        page_size?: number;
        status?: boolean;
        ordering?: string;
        search?: string;
        all_records?: boolean;
      }) => string;
      detail: (id: string | number) => string;
    };
    types: {
      list: (params?: {
        page?: number;
        page_size?: number;
        status?: boolean;
        ordering?: string;
        search?: string;
        all_records?: boolean;
      }) => string;
      detail: (id: string | number) => string;
    };
    leadSources: {
      list: (params?: {
        page?: number;
        page_size?: number;
        status?: boolean;
        ordering?: string;
        search?: string;
        all_records?: boolean;
      }) => string;
      detail: (id: string | number) => string;
    };
    opportunities: {
      list: (params?: {
        page?: number;
        page_size?: number;
        stage_id?: string | number;
        owner?: number;
        account_id?: string | number;
        is_active?: boolean;
        ordering?: string;
        search?: string;
        all_records?: boolean;
      }) => string;
      detail: (id: string | number) => string;
      create: () => string;
      update: (id: string | number) => string;
      delete: (id: string | number) => string;
    };
    statuses: {
      list: (params?: {
        page?: number;
        page_size?: number;
        status?: boolean;
        ordering?: string;
        search?: string;
        all_records?: boolean;
      }) => string;
      detail: (id: string | number) => string;
    };
  };
  lookupData: {
    accounts: () => string;
    contacts: (accountId: string | number) => string;
    staffUsers: () => string;
    contactAddresses: (contactId: string | number) => string;
    sellingChannels: () => string;
    taxRates: () => string;
    paymentMethods: () => string;
  };
  addresses: {
    list: () => string;
    create: () => string;
    update: (id: number) => string;
  };
  settings: {
    client: (clientId: number) => string;
  };
}

export const apiEndpoints: ApiEndpoints = {
  auth: {
    login: "/auth/login/",
    logout: "/auth/logout/",
    me: "/auth/me/",
  },
  configuration: {
    admin: () => `/${getTenantSlug()}/om/admin/configuration/`,
  },
  admin: {
    orders: {
      list: () => `/${getTenantSlug()}/om/admin/orders/`,
      detail: (id: string) => `/${getTenantSlug()}/om/admin/orders/${id}/`,
      create: () => `/${getTenantSlug()}/om/admin/orders/`,
      update: (id: string) => `/${getTenantSlug()}/om/admin/orders/${id}/`,
    },
    invoices: {
      list: () => `/${getTenantSlug()}/admin/invoices/`,
      detail: (id: string) => `/${getTenantSlug()}/admin/invoices/${id}/`,
      create: () => `/${getTenantSlug()}/admin/invoices/`,
      update: (id: string) => `/${getTenantSlug()}/admin/invoices/${id}/`,
      getUnpaidInvoices: () =>
        `/${getTenantSlug()}/admin/invoices/get-unpaid-invoices/`,
      getSegment: () =>
        `/${getTenantSlug()}/customer-group-selling-channel-segment/`,
      getInvoiceConfigs: () => `/${getTenantSlug()}/invoice-config/`,
    },
    receipts: {
      list: () => `/${getTenantSlug()}/admin/receipts/`,
      detail: (id: number) => `/${getTenantSlug()}/admin/receipts/${id}/`,
      create: () => `/${getTenantSlug()}/admin/receipts/`,
      correct: (id: number) => `/${getTenantSlug()}/admin/receipts/${id}/correct/`,
      delete: (id: number) => `/${getTenantSlug()}/admin/receipts/${id}/`,
    },
  },
  paymentMethods: {
    list: (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.is_active !== undefined) {
        queryParams.append("is_active", params.is_active.toString());
      }
      if (params.payment_type) {
        queryParams.append("payment_type", params.payment_type);
      }
      const queryString = queryParams.toString();
      return `/payment-methods/${queryString ? `?${queryString}` : ""}`;
    },
    detail: (id: number) => `/payment-methods/${id}/`,
    create: "/payment-methods/",
    update: (id: number) => `/payment-methods/${id}/`,
    delete: (id: number) => `/payment-methods/${id}/`,
    statistics: "/payment-methods/statistics/",
  },
  shippingZones: {
    list: (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.is_active !== undefined) {
        queryParams.append("is_active", params.is_active.toString());
      }
      if (params.search) {
        queryParams.append("search", params.search);
      }
      const queryString = queryParams.toString();
      return `/shipping/zones/${queryString ? `?${queryString}` : ""}`;
    },
    detail: (id: number) => `/shipping/zones/${id}/`,
    create: "/shipping/zones/",
    update: (id: number) => `/shipping/zones/${id}/`,
    delete: (id: number) => `/shipping/zones/${id}/`,
    pincodes: (zoneId: number) => `/shipping/zones/${zoneId}/pincodes/`,
    statistics: "/shipping/zones/statistics/",
  },
  pincodes: {
    list: (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.is_active !== undefined) {
        queryParams.append("is_active", params.is_active.toString());
      }
      if (params.search) {
        queryParams.append("search", params.search);
      }
      if (params.zone_id) {
        queryParams.append("zone_id", params.zone_id.toString());
      }
      const queryString = queryParams.toString();
      return `/shipping/pincodes/${queryString ? `?${queryString}` : ""}`;
    },
    detail: (id: number) => `/shipping/pincodes/${id}/`,
    create: "/shipping/pincodes/",
    update: (id: number) => `/shipping/pincodes/${id}/`,
    delete: (id: number) => `/shipping/pincodes/${id}/`,
    validate: "/shipping/pincodes/validate/",
  },
  opportunities: {
    roles: {
      list: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size)
          queryParams.append("page_size", params.page_size.toString());
        if (params.status !== undefined)
          queryParams.append("status", params.status.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);
        if (params.search) queryParams.append("search", params.search);
        if (params.all_records) queryParams.append("all_records", "true");

        const queryString = queryParams.toString()
          ? `?${queryParams.toString()}`
          : "";
        return `/${getTenantSlug()}/opportunities/opportunity-roles/${queryString}`;
      },
      detail: (id) =>
        `/${getTenantSlug()}/opportunities/opportunity-roles/${id}/`,
    },
    types: {
      list: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size)
          queryParams.append("page_size", params.page_size.toString());
        if (params.status !== undefined)
          queryParams.append("status", params.status.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);
        if (params.search) queryParams.append("search", params.search);
        if (params.all_records) queryParams.append("all_records", "true");

        const queryString = queryParams.toString()
          ? `?${queryParams.toString()}`
          : "";
        return `/${getTenantSlug()}/opportunities/opportunity-types/${queryString}`;
      },
      detail: (id) =>
        `/${getTenantSlug()}/opportunities/opportunity-types/${id}/`,
    },
    leadSources: {
      list: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size)
          queryParams.append("page_size", params.page_size.toString());
        if (params.status !== undefined)
          queryParams.append("status", params.status.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);
        if (params.search) queryParams.append("search", params.search);
        if (params.all_records) queryParams.append("all_records", "true");

        const queryString = queryParams.toString()
          ? `?${queryParams.toString()}`
          : "";
        return `/${getTenantSlug()}/opportunities/opportunity-lead-sources/${queryString}`;
      },
      detail: (id) =>
        `/${getTenantSlug()}/opportunities/opportunity-lead-sources/${id}/`,
    },
    opportunities: {
      list: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size)
          queryParams.append("page_size", params.page_size.toString());
        if (params.stage_id)
          queryParams.append("stage_id", params.stage_id.toString());
        if (params.owner !== undefined)
          queryParams.append("owner", params.owner.toString());
        if (params.account_id)
          queryParams.append("account_id", params.account_id.toString());
        if (params.is_active !== undefined)
          queryParams.append("is_active", params.is_active.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);
        if (params.search) queryParams.append("search", params.search);
        if (params.all_records) queryParams.append("all_records", "true");

        const queryString = queryParams.toString()
          ? `?${queryParams.toString()}`
          : "";
        return `/${getTenantSlug()}/opportunities/opportunities/${queryString}`;
      },
      detail: (id) => `/${getTenantSlug()}/opportunities/opportunities/${id}/`,
      create: () => `/${getTenantSlug()}/opportunities/opportunities/`,
      update: (id) => `/${getTenantSlug()}/opportunities/opportunities/${id}/`,
      delete: (id) => `/${getTenantSlug()}/opportunities/opportunities/${id}/`,
    },
    statuses: {
      list: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.page_size)
          queryParams.append("page_size", params.page_size.toString());
        if (params.status !== undefined)
          queryParams.append("status", params.status.toString());
        if (params.ordering) queryParams.append("ordering", params.ordering);
        if (params.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString()
          ? `?${queryParams.toString()}`
          : "";
        return `/${getTenantSlug()}/opportunities/opportunity-statuses/${queryString}`;
      },
      detail: (id: string | number) =>
        `/${getTenantSlug()}/opportunities/opportunity-statuses/${id}/`,
    },
  },
  lookupData: {
    accounts: () => `/${getTenantSlug()}/lookup-data/accounts/`,
    contacts: (accountId: string | number) =>
      `/${getTenantSlug()}/lookup-data/contacts/?account_id=${accountId}`,
    staffUsers: () => `/${getTenantSlug()}/lookup-data/staff-users/`,
    contactAddresses: (contactId: string | number) =>
      `/${getTenantSlug()}/lookup-data/contact-addresses/?contact_id=${contactId}`,
    sellingChannels: () => `/${getTenantSlug()}/lookup-data/selling-channels/`,
    taxRates: () => `/${getTenantSlug()}/lookup-data/tax-rates/`,
    paymentMethods: () => `/${getTenantSlug()}/lookup-data/payment-methods/`,
  },
  addresses: {
    list: () => `/${getTenantSlug()}/addresses/`,
    create: () => `/${getTenantSlug()}/addresses/`,
    update: (id: number) => `/${getTenantSlug()}/addresses/${id}/`,
  },
  siteConfig: {
    header: "/site-config/header/",
    adminHeader: "/site-config/admin/header/",
  },
  pages: {
    pages: "/pages/pages/",
    pageDetail: (slug: string) => `/pages/pages/${slug}/`,
    adminPages: "/pages/admin/pages/",
    adminContentBlocks: "/pages/admin/content-blocks/",
    reorderContentBlocks: "/pages/admin/content-blocks/reorder/",
  },
  users: {
    list: "/users/",
    detail: (id: string) => `/users/${id}/`,
  },
  products: {
    list: () => `/${getTenantSlug()}/products/products/`,
    detail: (id: string | number) =>
      `/${getTenantSlug()}/products/products/${id}/`,
    categories: "/product-categories/",
    variants: {
      list: (productId: number) =>
        `/${getTenantSlug()}/products/products/${productId}/variants/`,
      detail: (productId: number, variantId: number) =>
        `/${getTenantSlug()}/products/products/${productId}/variants/${variantId}/`,
      images: {
        list: (productId: number, variantId: number) =>
          `/${getTenantSlug()}/products/products/${productId}/variants/${variantId}/images/`,
        detail: (productId: number, variantId: number, imageId: number) =>
          `/${getTenantSlug()}/products/products/${productId}/variants/${variantId}/images/${imageId}/`,
      },
    },
    images: {
      list: (productId: number) =>
        `/${getTenantSlug()}/products/products/${productId}/images/`,
      detail: (productId: number, imageId: number) =>
        `/${getTenantSlug()}/products/products/${productId}/images/${imageId}/`,
    },
    kitComponents: {
      list: (productId: number) =>
        `/${getTenantSlug()}/products/products/${productId}/kit-components/`,
      detail: (productId: number, componentId: number) =>
        `/${getTenantSlug()}/products/products/${productId}/kit-components/${componentId}/`,
    },
  },
  catalogue: {
    divisions: {
      list: "/products/catalogue/divisions/",
      detail: (id: number) => `/products/catalogue/divisions/${id}/`,
      activeHierarchy: () =>
        `/${getTenantSlug()}/products/catalogue/active-division-hierarchy/`,
    },
    categories: {
      list: () => `/${getTenantSlug()}/products/catalogue/categories/`,
      detail: (id: number) =>
        `/${getTenantSlug()}/products/catalogue/categories/${id}/`,
    },
    subcategories: {
      list: "/products/catalogue/subcategories/",
      detail: (id: number) => `/products/catalogue/subcategories/${id}/`,
    },
    unitOfMeasures: {
      list: "/products/catalogue/units-of-measure/",
      detail: (id: number) => `/products/catalogue/units-of-measure/${id}/`,
    },
    productStatuses: {
      list: "/products/catalogue/product-statuses/",
      detail: (id: number) => `/products/catalogue/product-statuses/${id}/`,
    },
    exclusionsChannels: {
      get: (params: {
        category_id?: number;
        subcategory_id?: number;
        product_id?: number;
      }) =>
        `/exclusions-channels/?${new URLSearchParams(
          params as any
        ).toString()}`,
    },
  },
  storePickup: {
    list: "/store-pickup/",
    detail: (id: number) => `/store-pickup/${id}/`,
    create: "/store-pickup/",
    update: (id: number) => `/store-pickup/${id}/`,
    delete: (id: number) => `/store-pickup/${id}/`,
  },
  timeSlots: {
    list: "/timeslots/",
    detail: (id: number) => `/timeslots/${id}/`,
    create: "/timeslots/",
    update: (id: number) => `/timeslots/${id}/`,
    delete: (id: number) => `/timeslots/${id}/`,
  },
  shippingMethods: {
    list: "/shipping-methods/",
    detail: (id: number) => `/shipping-methods/${id}/`,
    create: "/shipping-methods/",
    update: (id: number) => `/shipping-methods/${id}/`,
    delete: (id: number) => `/shipping-methods/${id}/`,
  },
  customerGroupSellingChannels: {
    list: "/customer-group-selling-channels/",
  },
  guestConfig: {
    list: "/guest-config/",
    bulkCreate: "/guest-config/",
    bulkUpdate: "/guest-config/bulk-update/",
  },
  checkoutConfigs: {
    list: "/checkout-configs/",
    detail: (id: number) => `/checkout-configs/${id}/`,
    create: "/checkout-configs/",
    update: (id: number) => `/checkout-configs/${id}/`,
    delete: (id: number) => `/checkout-configs/${id}/`,
  },
  uiTemplateSettings: {
    list: "/ui-template-settings/",
    detail: (id: number) => `/ui-template-settings/${id}/`,
    create: "/ui-template-settings/",
    update: (id: number) => `/ui-template-settings/${id}/`,
    delete: (id: number) => `/ui-template-settings/${id}/`,
  },
  featureToggleSettings: {
    list: "/feature-toggle-settings/",
    detail: (id: number) => `/feature-toggle-settings/${id}/`,
    create: "/feature-toggle-settings/",
    update: (id: number) => `/feature-toggle-settings/${id}/`,
    delete: (id: number) => `/feature-toggle-settings/${id}/`,
  },
  sellingChannels: {
    active: "/customer-groups/active-with-channels/",
  },
  inventory: {
    list: () => `/${getTenantSlug()}/inventory/inventory/`,
    detail: (id: number) => `/${getTenantSlug()}/inventory/inventory/${id}/`,
    summary: () => `/${getTenantSlug()}/inventory/summary/`,
    locations: {
      list: () => "/inventory/fulfillment-locations/",
      detail: (id: number) => `/inventory/fulfillment-locations/${id}/`,
    },
    adjustmentReasons: {
      list: "inventory/adjustment-reasons/",
      detail: (id: number) => `inventory/adjustment-reasons/${id}/`,
    },
    adjustments: {
      list: "/inventory/adjustments/",
      detail: (id: number) => `/inventory/adjustments/${id}/`,
    },
    serialized: {
      list: "/inventory/serialized/",
      detail: (id: number) => `/inventory/serialized/${id}/`,
    },
    lots: {
      list: "/inventory/lots/",
      detail: (id: number) => `/inventory/lots/${id}/`,
    },
  },
  pricing: {
    customerGroups: {
      list: "/pricing/customer-groups/",
      detail: (id: number) => `/pricing/customer-groups/${id}/`,
    },
    sellingChannels: {
      list: "/pricing/selling-channels/",
      detail: (id: number) => `/pricing/selling-channels/${id}/`,
    },
    taxRegions: {
      list: "/pricing/tax-regions/",
      detail: (id: number) => `/pricing/tax-regions/${id}/`,
    },
    taxRates: {
      list: "/pricing/tax-rates/",
      detail: (id: number) => `/pricing/tax-rates/${id}/`,
    },
    taxRateProfiles: {
      list: "/pricing/tax-rate-profiles/",
      detail: (id: number) => `/pricing/tax-rate-profiles/${id}/`,
    },
    countries: {
      list: "/pricing/countries/",
    },
  },
  attributes: {
    attributeGroups: {
      list: "/products/attributes/groups/",
      detail: (id: number) => `/products/attributes/groups/${id}/`,
    },
    attributes: {
      list: "/products/attributes/attributes/",
      detail: (id: number) => `/products/attributes/attributes/${id}/`,
    },
    attributeOptions: {
      list: "/products/attributes/options/",
      detail: (id: number) => `/products/attributes/options/${id}/`,
      byAttribute: (attributeId: number) =>
        `/products/attributes/${attributeId}/options/`,
    },
  },
  settings: {
    client: (clientId: number) => `/tenants/settings/${clientId}/`,
  },
};

export default api;
