import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Base API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bestore.turtleit.in/api/v1';

// Types for API responses
export interface Status {
  id: number;
  status_name: string;
  status_code: string;
  is_active: boolean;
}

export interface UnitOfMeasure {
  id: number;
  uom_name: string;
  uom_code: string;
  is_active: boolean;
}

export interface TaxProfile {
  id: number;
  profile_name: string;
  profile_code: string;
  rate: number;
  is_active: boolean;
}

export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Parameters interfaces
interface BaseParams {
  page?: number;
  page_size?: number;
  is_active?: boolean;
}

// Fetch statuses
export const useFetchStatuses = (params: BaseParams = {}) => {
  return useQuery<ApiResponse<Status>>({
    queryKey: ['statuses', params],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/config/statuses/`, { params });
      return data;
    }
  });
};

// Fetch units of measure
export const useFetchUoms = (params: BaseParams = {}) => {
  return useQuery<ApiResponse<UnitOfMeasure>>({
    queryKey: ['uoms', params],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/config/uoms/`, { params });
      return data;
    }
  });
};

// Fetch tax profiles
export const useFetchTaxProfiles = (params: BaseParams = {}) => {
  return useQuery<ApiResponse<TaxProfile>>({
    queryKey: ['taxProfiles', params],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/config/tax-profiles/`, { params });
      return data;
    }
  });
};
