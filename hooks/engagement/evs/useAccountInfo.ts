import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AccountInfo, AccountInfoError } from '../../../types/emailVerification';
import { emailVerificationService } from '../../../services/emailVerificationService';

/**
 * Custom hook to fetch account information including credit balance and API key details
 * @param tenantSlug - The tenant slug
 * @param options - Additional options for the query
 * @returns UseQueryResult with account information
 */
export const useGetAccountInfo = (
  tenantSlug: string | undefined, 
  options?: any
): UseQueryResult<AccountInfo, AccountInfoError> => {
  return useQuery<AccountInfo, AccountInfoError>({
    queryKey: ['accountInfo', tenantSlug],
    queryFn: async () => {
      if (!tenantSlug) throw new Error("Tenant slug is required to fetch account information.");
      return emailVerificationService.getAccountInfo(tenantSlug);
    },
    enabled: !!tenantSlug, // Only run query if tenantSlug is available
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    ...options,
  });
};
