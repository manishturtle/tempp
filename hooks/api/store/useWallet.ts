/**
 * Wallet API hooks and services
 * 
 * This file contains both the service functions for wallet data fetching
 * and the React Query hooks that use them.
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import AuthService from '@/app/auth/services/authService';
import { WalletTransaction } from '@/app/types/store/walletTypes';

/**
 * Wallet balance information interface
 */
export interface WalletBalanceInfo {
  /**
   * Current wallet balance formatted with currency symbol
   */
  currentBalanceFormatted: string;
  
  /**
   * Raw current balance value
   */
  currentBalance: number;
  
  /**
   * Last updated timestamp
   */
  lastUpdated: string;
}

/**
 * Wallet statistics interface
 */
export interface WalletStats {
  /**
   * This month's spent amount formatted with currency symbol
   */
  thisMonthSpentFormatted: string;
  
  /**
   * Trend percentage compared to last month
   */
  thisMonthTrend?: string;
  
  /**
   * Total spent amount formatted with currency symbol
   */
  totalSpentFormatted: string;
  
  /**
   * Translation key for the total spent label
   */
  totalSpentLabelKey: string;
  
  /**
   * Number of pending orders
   */
  pendingOrdersCount: number;
  
  /**
   * Link to view pending orders
   */
  pendingOrdersLink?: string;
}

/**
 * Combined wallet summary data
 */
export interface WalletSummaryData {
  /**
   * Wallet balance information
   */
  balanceInfo: WalletBalanceInfo;
  
  /**
   * Wallet statistics
   */
  stats: WalletStats;
}

/**
 * Parameters for wallet transaction list
 */
export interface WalletTransactionListParams {
  /**
   * Page number (1-based)
   */
  page?: number;
  
  /**
   * Number of items per page
   */
  limit?: number;
  
  /**
   * Filter by transaction type
   */
  transactionType?: string;
  
  /**
   * Filter by date range
   */
  dateRange?: string;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /**
   * Current page number
   */
  currentPage: number;
  
  /**
   * Total number of pages
   */
  totalPages: number;
  
  /**
   * Total number of items
   */
  totalItems: number;
  
  /**
   * Number of items per page
   */
  itemsPerPage: number;
}

/**
 * Paginated wallet transactions response
 */
export interface PaginatedWalletTransactionsResponse {
  /**
   * List of wallet transactions
   */
  transactions: WalletTransaction[];
  
  /**
   * Pagination information
   */
  pagination: PaginationInfo;
}

// API service functions

/**
 * Fetches wallet summary data
 * 
 * @returns Promise with wallet summary data
 */
export const fetchWalletSummary = async (): Promise<WalletSummaryData> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const response = await api.get(
      '/wallet/summary',
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching wallet summary:', error);
    throw error;
  }
};

/**
 * Fetches wallet transactions with pagination and filtering
 * 
 * @param params - Transaction list parameters
 * @returns Promise with paginated wallet transactions
 */
export const fetchWalletTransactions = async (
  params: WalletTransactionListParams
): Promise<PaginatedWalletTransactionsResponse> => {
  try {
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const token = AuthService.getToken();
    
    const response = await api.get(
      '/wallet/transactions',
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    throw error;
  }
};

// React Query hooks

/**
 * Hook for fetching wallet summary data
 * 
 * @returns Query result with wallet summary data
 */
export const useWalletSummary = () => {
  return useQuery<WalletSummaryData, Error>({
    queryKey: ['walletSummary'],
    queryFn: fetchWalletSummary
  });
};

/**
 * Hook for fetching wallet transactions with pagination and filtering
 * 
 * @param params - Transaction list parameters
 * @returns Query result with paginated wallet transactions
 */
export const useWalletTransactions = (params: WalletTransactionListParams) => {
  return useQuery<PaginatedWalletTransactionsResponse, Error>({
    queryKey: ['walletTransactions', params],
    queryFn: () => fetchWalletTransactions(params),
    placeholderData: (previousData) => previousData // This replaces keepPreviousData in newer versions
  });
};
