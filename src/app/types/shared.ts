/**
 * Shared types for use across the application
 */

// Base model with audit fields
export interface BaseModel {
  created_at?: string;
  updated_at?: string;
  created_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// Country model
export interface Country extends BaseModel {
  iso_code: string;
  iso_code_3?: string;
  name: string;
  is_active: boolean;
  flag_url?: string;
  phone_code?: string;
}

// Currency model
export interface Currency extends BaseModel {
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
  exchange_rate_to_usd: number;
}
