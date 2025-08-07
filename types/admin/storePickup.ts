/**
 * Operating hours for a single day
 */
export interface StoreOperatingHoursDay {
  is_open: boolean;
  open?: string;  // Format: "HH:MM"
  close?: string; // Format: "HH:MM"
}

/**
 * Operating hours for the store
 */
export interface StoreOperatingHours {
  monday: StoreOperatingHoursDay;
  tuesday: StoreOperatingHoursDay;
  wednesday: StoreOperatingHoursDay;
  thursday: StoreOperatingHoursDay;
  friday: StoreOperatingHoursDay;
  saturday: StoreOperatingHoursDay;
  sunday: StoreOperatingHoursDay;
}

/**
 * Store pickup location
 */
export interface StorePickup {
  id: number;
  name: string;
  contact_person: string;
  contact_number: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  google_place_id?: string | null;
  operating_hours: StoreOperatingHours;
  is_active: boolean;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  created_by: number;
  updated_by: number | null;
}

/**
 * Store pickup counts
 */
export interface StorePickupCounts {
  active: number;
  inactive: number;
  total: number;
}

/**
 * Response for list of store pickups
 */
export interface StorePickupListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StorePickup[];
  counts: StorePickupCounts;
}

/**
 * Payload for creating/updating a store pickup
 */
export interface StorePickupPayload {
  name: string;
  contact_person: string;
  contact_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  google_place_id?: string;
  operating_hours: StoreOperatingHours;
  is_active: boolean;
}

/**
 * Response for a single store pickup
 */
export interface StorePickupResponse {
  data: StorePickup;
}

/**
 * Error response from store pickup API
 */
export interface StorePickupError {
  detail?: string;
  [key: string]: any; // For field-specific errors
}

// Default empty operating hours
export const DEFAULT_OPERATING_HOURS: StoreOperatingHours = {
  monday: { is_open: true, open: '09:00', close: '18:00' },
  tuesday: { is_open: true, open: '09:00', close: '18:00' },
  wednesday: { is_open: true, open: '09:00', close: '18:00' },
  thursday: { is_open: true, open: '09:00', close: '18:00' },
  friday: { is_open: true, open: '09:00', close: '18:00' },
  saturday: { is_open: false },
  sunday: { is_open: false }
};

// Default empty store pickup
export const EMPTY_STORE_PICKUP: Omit<StorePickup, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> = {
  name: '',
  contact_person: '',
  contact_number: '',
  address_line1: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  operating_hours: DEFAULT_OPERATING_HOURS,
  is_active: true
};
