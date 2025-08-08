import AuthService from '@/app/auth/services/authService';
import api from '@/lib/api';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

/**
 * Dashboard summary data interface
 */
export interface DashboardSummaryData {
  /**
   * Wallet information
   */
  wallet: {
    /**
     * Formatted wallet balance with currency symbol
     */
    balanceFormatted: string;
    /**
     * Percentage change in wallet balance (optional)
     */
    changePercent?: string;
  };
  /**
   * Loyalty points information
   */
  loyalty: {
    /**
     * Formatted loyalty points
     */
    pointsFormatted: string;
  };
  /**
   * Order information
   */
  orders: {
    /**
     * Total number of orders
     */
    totalCount: number;
    /**
     * Number of orders in progress (optional)
     */
    inProgressCount?: number;
  };
}

/**
 * API response interface matching the actual backend response
 */
interface ApiDashboardResponse {
  wallet: {
    balance: number;
    currency: string;
    change_percent: number | null;
  };
  loyalty: {
    points: number;
  };
  orders: {
    total_count: number;
    in_progress_count: number | null;
  };
}

/**
 * Transforms the raw API response into the frontend data structure
 * 
 * @param data - Raw API response
 * @returns Transformed dashboard summary data
 */
const transformDashboardData = (data: ApiDashboardResponse): DashboardSummaryData => {
  return {
    wallet: {
      balanceFormatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.wallet.currency || 'USD'
      }).format(data.wallet.balance),
      changePercent: data.wallet.change_percent !== null ? 
        (data.wallet.change_percent > 0 ? `+${data.wallet.change_percent}` : `${data.wallet.change_percent}`) : 
        undefined
    },
    loyalty: {
      pointsFormatted: data.loyalty.points.toLocaleString()
    },
    orders: {
      totalCount: data.orders.total_count,
      inProgressCount: data.orders.in_progress_count || undefined
    }
  };
};

/**
 * Fetches dashboard summary data from the backend
 * 
 * @returns Promise with dashboard summary data
 */
export const fetchDashboardSummaries = async (): Promise<DashboardSummaryData> => {
  try {
    const token = AuthService.getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // The endpoint follows the pattern for protected routes 
    // that require authentication with the account_id from JWT token
    const response = await api.get('/dashboard/summary', { headers });
    return transformDashboardData(response.data);
  } catch (error) {
    console.error('Error fetching dashboard summaries:', error);
    throw error;
  }
};

/**
 * Hook to fetch and manage dashboard summary data
 * 
 * @returns Query object with dashboard summary data
 */
export function useDashboardSummary() {
  return useQuery<DashboardSummaryData, Error>({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardSummaries,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: isAuthenticated()
  });
}
