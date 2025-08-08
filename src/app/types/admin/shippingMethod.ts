export interface ShippingZoneRestriction {
  zone: number;
  restriction_mode: "INCLUDE" | "EXCLUDE";
}

export interface ShippingMethod {
    id: number;
    name: string;
    min_delivery_days: number;
    max_delivery_days: number;
    is_active: boolean;
    created_at: string;  // ISO 8601 format
    updated_at: string;  // ISO 8601 format
    created_by?: number;
    updated_by?: number;
    // Computed field from the API
    delivery_range?: string;  // Format: "3-7 days"
    zone_restrictions?: ShippingZoneRestriction[];
  }
  
  export interface ShippingMethodFormData {
    name: string;
    min_delivery_days: number;
    max_delivery_days: number;
    is_active: boolean;
  }
  
  export interface ShippingMethodListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    counts: {
      active: number;
      inactive: number;
      total: number;
    };
    results: ShippingMethod[];
  }
  
  // Default empty shipping method
  export const EMPTY_SHIPPING_METHOD: Omit<ShippingMethod, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'delivery_range'> = {
    name: '',
    min_delivery_days: 3,
    max_delivery_days: 7,
    is_active: true
  };