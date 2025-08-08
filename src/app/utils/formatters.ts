'use client';

import { ShippingAddressFormData, BillingAddressFormData } from '@/app/types/store/checkout';
import { OrderAddress } from '@/app/types/store/order';

/**
 * Format an address as a human-readable string
 * @param address - The address to format
 * @returns Formatted address string
 */
export function formatAddress(address: ShippingAddressFormData | BillingAddressFormData | OrderAddress): string {
  const parts = [
    address.full_name,
    address.address_line1,
    address.address_line2,
    `${address.city}, ${address.state} ${address.postal_code}`,
    address.country,
    address.phone_number
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Format currency amount with Indian Rupee symbol
 * @param value - The amount to format
 * @returns Formatted currency string with ₹ symbol
 */
export function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
}

/**
 * Format a date string to a human-readable format
 * @param dateString - The date string to format (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}
