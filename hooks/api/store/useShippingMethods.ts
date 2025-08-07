// src/app/hooks/api/store/useShippingMethods.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/storeapi';

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

// Service functions
const fetchShippingMethods = async (): Promise<ShippingMethod[]> => {
  const response = await api.get('/om/shipping-method/');
  return response.data;
};

const fetchTimeSlots = async (): Promise<TimeSlot[]> => {
  const response = await api.get('/om/timeslot/');
  return response.data;
};

const fetchStorePickupLocations = async (): Promise<StorePickupLocation[]> => {
  const response = await api.get('/om/storepickups/');
  return response.data;
};

// Hooks
export const useShippingMethods = () => {
  return useQuery<ShippingMethod[], Error>({
    queryKey: ['shipping-methods'],
    queryFn: fetchShippingMethods,
  });
};

export const useTimeSlots = () => {
  return useQuery<TimeSlot[], Error>({
    queryKey: ['time-slots'],
    queryFn: fetchTimeSlots,
  });
};

export const useStorePickupLocations = () => {
  return useQuery<StorePickupLocation[], Error>({
    queryKey: ['store-pickup-locations'],
    queryFn: fetchStorePickupLocations,
  });
};

// Example usage:
/*
import { useShippingMethods, useTimeSlots } from '@/app/hooks/api/store/useShippingMethods';

function CheckoutComponent() {
  const { data: shippingMethods } = useShippingMethods();
  const { data: timeSlots } = useTimeSlots();

  return (
    <div>
      <h2>Shipping Methods</h2>
      {shippingMethods?.map(method => (
        <div key={method.id}>{method.name}</div>
      ))}

      <h2>Available Time Slots</h2>
      {timeSlots?.map(slot => (
        <div key={slot.id}>{slot.name}: {slot.start_time} - {slot.end_time}</div>
      ))}
    </div>
  );
}
*/