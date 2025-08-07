import { useQuery } from '@tanstack/react-query';
import axios, { AxiosResponse } from 'axios';
import { API_BASE_URL, LOCATION_ENDPOINTS, LocationEndpoints } from '@/app/constant';

export interface Country {
  id: number;
  name: string;
  code: string;
  // Add other country fields as needed
}

export interface State {
  id: number;
  name: string;
  countryId: number;
  code: string;
  // Add other state fields as needed
}

export interface City {
  id: number;
  name: string;
  stateId: number;
  // Add other city fields as needed
}

const fetchCountries = async (): Promise<Country[]> => {
  const { data }: AxiosResponse<Country[]> = await axios.get(
    `${API_BASE_URL}${LOCATION_ENDPOINTS.COUNTRIES}`
  );
  return data;
};

const fetchStates = async (countryId: number): Promise<State[]> => {
  if (!countryId) return [];
  
  const { data }: AxiosResponse<State[]> = await axios.get(
    `${API_BASE_URL}${LOCATION_ENDPOINTS.STATES}?countryId=${countryId}`
  );
  return data;
};

const fetchCities = async (stateId: number): Promise<City[]> => {
  if (!stateId) return [];
  
  const { data }: AxiosResponse<City[]> = await axios.get(
    `${API_BASE_URL}${LOCATION_ENDPOINTS.CITIES}?stateId=${stateId}`
  );
  return data;
};

export const useLocation = () => {
  const useCountries = () => 
    useQuery<Country[], Error>({
      queryKey: ['countries'],
      queryFn: fetchCountries,
    });

  const useStates = (countryId: number) => 
    useQuery<State[], Error>({
      queryKey: ['states', countryId],
      queryFn: () => fetchStates(countryId),
      enabled: !!countryId,
    });

  const useCities = (stateId: number) => 
    useQuery<City[], Error>({
      queryKey: ['cities', stateId],
      queryFn: () => fetchCities(stateId),
      enabled: !!stateId,
    });

  return {
    useCountries,
    useStates,
    useCities,
  };
};
