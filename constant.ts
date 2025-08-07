export const API_BASE_URL = 'https://becockpit.turtleit.in/api/';

export const PAYMENT_SERVICES_BASE_URL = 'http://localhost:8001/api/aad33';

export const AI_BASE_URL = 'https://bedevai.turtleit.in/api/turtlesoftware/';

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const AI_ENDPOINTS = {
  WEBHOOK_MANAGEMENT: 'webhook-management/create-and-receive-webhook/',
} as const;

export const LOCATION_ENDPOINTS = {
  COUNTRIES: 'location/v1/countries/',
  STATES: 'location/v1/states/',
  CITIES: 'location/v1/cities/',
} as const;

export const AI_CONFIG = {
  ACCESS_KEY: 'XWhPbTTmTgjijcmG',
  ENCRYPTION_KEY: 'bZ_hh454rNcr9ZhMTMhDCtcCq1kA3q7OoO0yTZVM75Y='
} as const;

export type LocationEndpoints = keyof typeof LOCATION_ENDPOINTS;