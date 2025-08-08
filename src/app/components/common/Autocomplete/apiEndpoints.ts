/**
 * Centralized API endpoints for entity autocomplete components
 * This file provides a single source of truth for API endpoints used in the admin UI
 */
import { apiEndpoints } from '@/lib/api';

/**
 * Get the current tenant slug from localStorage
 * @returns The current tenant slug or empty string if not found
 */
const getTenantSlug = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_current_tenant_slug') || '';
  }
  return '';
};

export const entityEndpoints = {
  // Catalogue endpoints
  divisions: '/products/catalogue/divisions/',  // No tenant slug needed
  categories: (params?: { division?: string | number, isActive?: boolean, paginate?: boolean }) => {
    let url = `/${getTenantSlug()}/products/catalogue/categories/`;
    const queryParams: string[] = [];
    
    // Add division parameter if provided
    if (params?.division) {
      queryParams.push(`division=${params.division}`);
    }
    
    // Add is_active parameter if provided
    if (params?.isActive !== undefined) {
      queryParams.push(`is_active=${params.isActive}`);
    }
    
    // Add paginate parameter if provided
    if (params?.paginate !== undefined) {
      queryParams.push(`paginate=${params.paginate}`);
    }
    
    // Add query parameters to URL if any exist
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    
    return url;
  },  // Enhanced categories endpoint with filtering support
  subcategories: '/products/catalogue/subcategories/',  // No tenant slug needed
  unitOfMeasures: apiEndpoints.catalogue.unitOfMeasures.list,
  productStatuses: apiEndpoints.catalogue.productStatuses.list,
  
  // Pricing endpoints
  taxRateProfiles: apiEndpoints.pricing.taxRateProfiles.list,
  currencies: '/shared/currencies/',  // Using the direct path since it's in the shared module
  
  // Shared endpoints
  countries: '/shared/countries/',
  
  // Customer endpoints
  customerGroups: 'customer-groups/',
  accounts: 'accounts/',
  contacts: 'contacts/',
  users: 'users/',
  
  // Custom Fields endpoints
  customFieldDefinitions: 'custom-field-definitions/',
  
  // Add more endpoints as needed
};

export default entityEndpoints;
