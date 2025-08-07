/**
 * Loyalty API services and hooks for the eCommerce application
 * 
 * This file contains both service functions and React Query hooks for
 * fetching loyalty-related data from the API.
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import AuthService from '@/app/auth/services/authService';
import { LoyaltyTransaction } from '@/app/types/store/loyaltyTypes';

// API endpoints
const LOYALTY_API = {
  SUMMARY: '/om/account/loyalty/summary',
  TRANSACTIONS: '/om/account/loyalty/transactions',
};

/**
 * Types for loyalty summary data
 */
export interface LoyaltyBalanceInfo {
  /**
   * Formatted string with current points balance
   */
  currentPointsFormatted: string;

  /**
   * Text describing soon-to-expire points, if any
   */
  expiringSoonText?: string;
}

export interface LoyaltySummaryData {
  /**
   * Information about the user's loyalty points balance
   */
  balanceInfo: LoyaltyBalanceInfo;
}

/**
 * Parameters for fetching loyalty transactions
 */
export interface LoyaltyTransactionListParams {
  /**
   * Page number for pagination
   */
  page?: number;

  /**
   * Number of transactions per page
   */
  limit?: number;

  /**
   * Search term for filtering transactions
   */
  searchTerm?: string;

  /**
   * Transaction type filter (earned, redeemed, expired, adjustment)
   */
  transactionType?: string;

  /**
   * Date range filter (last30, last90, last180, last365, all_time)
   */
  dateRange?: string;
}

/**
 * Pagination data for transaction list
 */
export interface LoyaltyHistoryPagination {
  /**
   * Current page number
   */
  currentPage: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Total number of items across all pages
   */
  totalItems: number;

  /**
   * Number of items per page
   */
  itemsPerPage: number;
}

/**
 * Response structure for paginated transactions
 */
export interface PaginatedLoyaltyTransactionsResponse {
  /**
   * Array of loyalty transactions
   */
  transactions: LoyaltyTransaction[];

  /**
   * Pagination metadata
   */
  pagination: LoyaltyHistoryPagination;
}

/**
 * Service function to fetch loyalty summary data
 * 
 * @returns {Promise<LoyaltySummaryData>} Promise resolving to loyalty summary data
 */
export const fetchLoyaltySummary = async (): Promise<LoyaltySummaryData> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const { data } = await api.get<LoyaltySummaryData>(LOYALTY_API.SUMMARY, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching loyalty summary:', error);
    throw error;
  }
};

/**
 * Service function to fetch loyalty transactions with filters and pagination
 * 
 * @param {LoyaltyTransactionListParams} params - Parameters for filtering and pagination
 * @returns {Promise<PaginatedLoyaltyTransactionsResponse>} Promise resolving to paginated transaction data
 */
export const fetchLoyaltyTransactions = async (
  params: LoyaltyTransactionListParams = {}
): Promise<PaginatedLoyaltyTransactionsResponse> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const { data } = await api.get<PaginatedLoyaltyTransactionsResponse>(
      LOYALTY_API.TRANSACTIONS,
      { 
        params,
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return data;
  } catch (error) {
    console.error('Error fetching loyalty transactions:', error);
    throw error;
  }
};

/**
 * Hook for fetching loyalty summary data
 * 
 * @returns {Object} Query result with loyalty summary data
 */
export const useLoyaltySummary = () => {
  return useQuery({
    queryKey: ['loyaltySummary'],
    queryFn: fetchLoyaltySummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    enabled: isAuthenticated(),
  });
};

/**
 * Hook for fetching loyalty transactions with filters and pagination
 * 
 * @param {LoyaltyTransactionListParams} params - Parameters for filtering and pagination
 * @returns {Object} Query result with paginated transaction data
 */
export const useLoyaltyTransactions = (params: LoyaltyTransactionListParams = {}) => {
  return useQuery({
    queryKey: ['loyaltyTransactions', params],
    queryFn: () => fetchLoyaltyTransactions(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Modern replacement for keepPreviousData
    enabled: isAuthenticated(),
  });
};

/**
 * Example usage in a component:
 * 
 * const { data: summary, isLoading: isLoadingSummary } = useLoyaltySummary();
 * const [params, setParams] = useState<LoyaltyTransactionListParams>({ page: 1, limit: 10 });
 * const { data: transactions, isLoading: isLoadingTransactions } = useLoyaltyTransactions(params);
 */
