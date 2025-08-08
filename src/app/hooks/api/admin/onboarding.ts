import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api, { apiEndpoints } from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

export interface OnboardingTriggerPayload {
  industry: string;
  region: string;
}

export interface OnboardingResponse {
  status: 'success' | 'error';
  message: string;
  configuration: {
    id: number;
    industry: string;
    region: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

/**
 * Triggers the onboarding process for a tenant
 * @param payload The onboarding configuration data
 * @returns Promise with the onboarding response
 */
const triggerOnboarding = async (payload: OnboardingTriggerPayload): Promise<OnboardingResponse> => {
  const { data } = await api.post<OnboardingResponse>(
    '/onboarding/trigger/',
    payload,
    { headers: getAuthHeaders() }
  );
  return data;
};

/**
 * Hook for managing onboarding mutation state and actions
 * @returns Mutation result object with onboarding actions and state
 */
export const useOnboardingMutation = (): UseMutationResult<
  OnboardingResponse,
  AxiosError<ApiError>,
  OnboardingTriggerPayload
> => {
  return useMutation({
    mutationFn: triggerOnboarding,
    onError: (error: AxiosError<ApiError>) => {
      // Log the error for debugging but don't expose sensitive details
      console.error('Onboarding error:', {
        status: error.response?.status,
        code: error.response?.data?.code,
      });
    },
    retry: (failureCount, error) => {
      // Only retry on network errors, not on 4xx client errors
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Type guard to check if an error is an API error
 * @param error The error to check
 * @returns boolean indicating if the error is an API error
 */
export const isApiError = (error: unknown): error is AxiosError<ApiError> => {
  return (
    error instanceof AxiosError &&
    error.response?.data &&
    typeof error.response.data === 'object' &&
    'code' in error.response.data
  );
};
