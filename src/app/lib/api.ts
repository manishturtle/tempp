import axios from 'axios';

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Get CSRF token from cookie
const getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};

// Create axios instance with default config
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true
});

// Add request interceptor to include CSRF token
api.interceptors.request.use((config) => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
);

// API endpoints configuration
export const apiEndpoints = {
    products: {
        list: '/products/products/',
        detail: (id: number) => `/products/products/${id}/`,
        variants: (productId: number) => `/products/products/${productId}/variants/`,
        variantDetail: (productId: number, variantId: number) => `/products/products/${productId}/variants/${variantId}/`,
        kitComponents: (productId: number) => `/products/products/${productId}/kit-components/`,
        kitComponentDetail: (productId: number, componentId: number) => `/products/products/${productId}/kit-components/${componentId}/`,
        images: (productId: number) => `/products/products/${productId}/images/`,
        imageDetail: (productId: number, imageId: number) => `/products/products/${productId}/images/${imageId}/`
    },
    attributes: {
        groups: {
            list: '/products/attributes/groups/',
            detail: (id: number) => `/products/attributes/groups/${id}/`
        },
        attributes: {
            list: '/products/attributes/attributes/',
            detail: (id: number) => `/products/attributes/attributes/${id}/`
        },
        options: {
            list: '/products/attributes/options/',
            detail: (id: number) => `/products/attributes/options/${id}/`,
            byAttribute: (attributeId: number) => `/products/attributes/${attributeId}/options/`
        }
    },
    pricing: {
        customerGroups: {
            list: '/pricing/customer-groups/',
            detail: (id: number) => `/pricing/customer-groups/${id}/`
        },
        sellingChannels: {
            list: '/pricing/selling-channels/',
            detail: (id: number) => `/pricing/selling-channels/${id}/`
        },
        taxRegions: {
            list: '/pricing/tax-regions/',
            detail: (id: number) => `/pricing/tax-regions/${id}/`
        },
        taxRates: {
            list: '/pricing/tax-rates/',
            detail: (id: number) => `/pricing/tax-rates/${id}/`
        },
        taxRateProfiles: {
            list: '/pricing/tax-rate-profiles/',
            detail: (id: number) => `/pricing/tax-rate-profiles/${id}/`
        }
    }
};
