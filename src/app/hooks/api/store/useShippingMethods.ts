// src/app/hooks/api/store/useShippingMethods.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';
import { useParams } from 'next/navigation';

// Types
export interface ShippingMethod {
  id: number;
  name: string;
  min_delivery_days: number;
  max_delivery_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  delivery_range: string;
}

export interface TimeSlot {
  id: number;
  name: string;
  start_time: string;  // Format: "HH:MM:SS"
  end_time: string;    // Format: "HH:MM:SS"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorePickupLocation {
  id: number;
  name: string;
  contact_person: string;
  contact_number: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  google_place_id: string | null;
  operating_hours: {
    [key: string]: {
      is_open: boolean;
      open?: string;  // Format: "HH:MM"
      close?: string; // Format: "HH:MM"
    };
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Segment details type from localStorage
interface SegmentDetails {
  id: number;
  customer_group_id: number;
  customer_group_name: string;
  selling_channel_id: number;
  selling_channel_name: string;
  selling_channel_code: string;
  segment_name: string;
  status: string;
}

// Location details type from localStorage
interface LocationDetails {
  country: string;
  state: string;
  pincode: string;
}

// Utility function to get segment details from localStorage
const getSegmentDetails = (tenantSlug: string): SegmentDetails | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const segmentKey = `${tenantSlug}_segmentdetails`;
    const segmentData = localStorage.getItem(segmentKey);
    return segmentData ? JSON.parse(segmentData) : null;
  } catch (error) {
    console.error('Error reading segment details from localStorage:', error);
    return null;
  }
};

// Utility function to get customer group selling channel ID from segment
const getCustomerGroupSellingChannelId = (tenantSlug: string): number | undefined => {
  const segmentDetails = getSegmentDetails(tenantSlug);
  return segmentDetails?.id;
};

// Utility function to get location details from localStorage
const getLocationDetails = (tenantSlug: string): LocationDetails | null => {
  if (typeof window === 'undefined') return null;

  try {
    const locationKey = `${tenantSlug}_location`;
    const locationData = localStorage.getItem(locationKey);
    return locationData ? JSON.parse(locationData) : null;
  } catch (error) {
    console.error('Error reading location details from localStorage:', error);
    return null;
  }
};

// Utility function to get pincode from location details
const getPincode = (tenantSlug: string): string | undefined => {
  const locationDetails = getLocationDetails(tenantSlug);
  return locationDetails?.pincode;
};

// Service functions
/**
 * Fetch shipping methods for a specific customer group selling channel.
 * @param customerGroupSellingChannelsId - Comma-separated string or number[] of customer group IDs
 * @returns Promise<ShippingMethod[]>
 */
const fetchShippingMethods = async (
  customerGroupSellingChannelsId?: number | number[],
  pincode?: string
): Promise<ShippingMethod[]> => {
  const params = new URLSearchParams();

  if (customerGroupSellingChannelsId !== undefined) {
    const ids = Array.isArray(customerGroupSellingChannelsId)
      ? customerGroupSellingChannelsId.join(',')
      : customerGroupSellingChannelsId.toString();
    params.append('customer_group_selling_channels_id', ids);
  }

  if (pincode) {
    params.append('pincode', pincode);
  }

  const queryString = params.toString();
  const url = `/om/shipping-method/${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
};

const fetchTimeSlots = async (): Promise<TimeSlot[]> => {
  const response = await api.get('/om/timeslot/');
  return response.data;
};

/**
 * Fetch store pickup locations for a specific customer group selling channel.
 * @param customerGroupSellingChannelsId - Comma-separated string or number[] of customer group IDs
 * @returns Promise<StorePickupLocation[]>
 */
const fetchStorePickupLocations = async (customerGroupSellingChannelsId?: number | number[]): Promise<StorePickupLocation[]> => {
  let url = '/om/storepickups/';
  if (customerGroupSellingChannelsId !== undefined) {
    const ids = Array.isArray(customerGroupSellingChannelsId)
      ? customerGroupSellingChannelsId.join(',')
      : customerGroupSellingChannelsId;
    url += `?customer_group_selling_channels_id=${ids}`;
  }
  const response = await api.get(url);
  return response.data;
};

// Hooks
/**
 * React Query hook to fetch shipping methods for a customer group selling channel.
 * Automatically reads from localStorage for segment and location details if no IDs are provided.
 * @param customerGroupSellingChannelsId - Optional customer group selling channel ID(s)
 * @param pincode - Optional pincode to override localStorage
 */
export const useShippingMethods = (
  customerGroupSellingChannelsId?: number | number[],
  pincode?: string
) => {
  const params = useParams();
  const tenantSlug = params?.tenant as string;

  // Use provided ID or fallback to localStorage segment details
  const effectiveId =
    customerGroupSellingChannelsId ??
    (tenantSlug ? getCustomerGroupSellingChannelId(tenantSlug) : undefined);

  // Use provided pincode or fallback to localStorage location details
  const effectivePincode = pincode ?? (tenantSlug ? getPincode(tenantSlug) : undefined);

  return useQuery<ShippingMethod[], Error>({
    queryKey: ['shipping-methods', effectiveId, effectivePincode, tenantSlug],
    queryFn: () => fetchShippingMethods(effectiveId, effectivePincode),
    enabled: !!tenantSlug, // Only run query if we have a tenant slug
  });
};

export const useTimeSlots = () => {
  return useQuery<TimeSlot[], Error>({
    queryKey: ['time-slots'],
    queryFn: fetchTimeSlots,
  });
};

/**
 * React Query hook to fetch store pickup locations for a customer group selling channel.
 * Automatically reads from localStorage segment details if no ID is provided.
 * @param customerGroupSellingChannelsId - Optional customer group selling channel ID(s)
 */
export const useStorePickupLocations = (customerGroupSellingChannelsId?: number | number[]) => {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  
  // Use provided ID or fallback to localStorage segment details
  const effectiveId = customerGroupSellingChannelsId ?? 
    (tenantSlug ? getCustomerGroupSellingChannelId(tenantSlug) : undefined);
  
  return useQuery<StorePickupLocation[], Error>({
    queryKey: ['store-pickup-locations', effectiveId, tenantSlug],
    queryFn: () => fetchStorePickupLocations(effectiveId),
    enabled: !!tenantSlug, // Only run query if we have a tenant slug
  });
};

// Usage examples:

// 1. Automatic usage (reads from localStorage segment details)
/*
function CheckoutComponent() {
  const { data: shippingMethods } = useShippingMethods(); // Automatically uses segment ID from localStorage
  const { data: pickupLocations } = useStorePickupLocations(); // Automatically uses segment ID from localStorage
  const { data: timeSlots } = useTimeSlots();

  return (
    <div>
      <h2>Shipping Methods</h2>
      {shippingMethods?.map(method => (
        <div key={method.id}>{method.name}</div>
      ))}

      <h2>Store Pickup Locations</h2>
      {pickupLocations?.map(location => (
        <div key={location.id}>{location.name}</div>
      ))}

      <h2>Available Time Slots</h2>
      {timeSlots?.map(slot => (
        <div key={slot.id}>{slot.name}: {slot.start_time} - {slot.end_time}</div>
      ))}
    </div>
  );
}

// 2. Manual override (if you need to specify a different ID)
function AdminComponent() {
  const { data: shippingMethods } = useShippingMethods(25); // Override with specific ID
  const { data: pickupLocations } = useStorePickupLocations([21, 22]); // Multiple IDs
  
  // ... rest of component
}
*/