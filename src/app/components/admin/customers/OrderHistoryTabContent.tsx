"use client";

import { FC, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Link, 
  Chip, 
  IconButton, 
  Paper,
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';

/**
 * Order summary data interface
 */
interface OrderSummaryData {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  items: number;
  total: number;
  currencyCode: string;
  ecomOrderDetailUrl?: string;
}

/**
 * API response interface for order history
 */
interface OrderHistoryResponse {
  results: OrderSummaryData[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * Props for OrderHistoryTabContent component
 */
interface OrderHistoryTabContentProps {
  accountId: string;
}

/**
 * Format currency amount with currency code
 */
const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Order History tab content component for displaying orders associated with an account
 */
const OrderHistoryTabContent: FC<OrderHistoryTabContentProps> = ({ 
  accountId 
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch order history data
  const { data, isLoading, isError } = useQuery<OrderHistoryResponse>({
    queryKey: ['accountOrderHistory', accountId, page, pageSize],
    queryFn: async () => {
      try {
        // TODO: Connect to actual E-commerce Order History API endpoint
        const response = await api.get(`/ecom-api/v1/orders/?customer_account_id=${accountId}&page=${page}&page_size=${pageSize}`, {
          headers: getAuthHeaders()
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching order history:', error);
        
        // For development/demo purposes, return mock data
        // This should be removed when the actual API is available
        return {
          results: [
            {
              id: '1',
              orderNumber: '#ORD-2025-1234',
              orderDate: '2025-04-18T10:30:00Z',
              status: 'Delivered',
              items: 5,
              total: 12499.99,
              currencyCode: 'USD',
              ecomOrderDetailUrl: '/orders/ORD-2025-1234'
            },
            {
              id: '2',
              orderNumber: '#ORD-2025-1233',
              orderDate: '2025-04-15T14:20:00Z',
              status: 'In Transit',
              items: 3,
              total: 8750.00,
              currencyCode: 'USD',
              ecomOrderDetailUrl: '/orders/ORD-2025-1233'
            },
            {
              id: '3',
              orderNumber: '#ORD-2025-1232',
              orderDate: '2025-04-10T09:15:00Z',
              status: 'Delivered',
              items: 2,
              total: 5299.99,
              currencyCode: 'USD',
              ecomOrderDetailUrl: '/orders/ORD-2025-1232'
            }
          ],
          count: 3,
          next: null,
          previous: null
        };
      }
    },
    enabled: !!accountId
  });

  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (data && page < Math.ceil(data.count / pageSize)) {
      setPage(page + 1);
    }
  };
  
  // Calculate total pages
  const totalPages = data ? Math.ceil(data.count / pageSize) : 0;

  // Get status chip color based on status
  const getStatusChipColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'in transit':
        return 'warning';
      case 'processing':
        return 'info';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Format date to locale string
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={500}>
          {t('accountDetailPage.orderHistoryTab.title') || 'Recent Orders'}
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<FilterListIcon />}
          sx={{ borderRadius: '4px' }}
        >
          {t('common.filter') || 'Filter'}
        </Button>
      </Box>

      {/* Orders table */}
      <Paper variant="outlined" sx={{ borderRadius: '8px', overflow: 'hidden', mb: 3 }}>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                  {t('orderHistory.columns.orderNumber') || 'ORDER NUMBER'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                  {t('orderHistory.columns.orderDate') || 'ORDER DATE'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                  {t('orderHistory.columns.status') || 'STATUS'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                  {t('orderHistory.columns.items') || 'ITEMS'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                  {t('orderHistory.columns.total') || 'TOTAL'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', width: '80px' }}>
                  {t('orderHistory.columns.actions') || 'ACTIONS'}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center' }}>
                    {t('common.loading') || 'Loading...'}
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: 'red' }}>
                    {t('common.errorLoading') || 'Error loading orders'}
                  </td>
                </tr>
              ) : data?.results.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center' }}>
                    {t('accountDetailPage.orderHistoryTab.noOrders') || 'No orders found'}
                  </td>
                </tr>
              ) : (
                data?.results.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>
                      <Link href={order.ecomOrderDetailUrl || '#'} target="_blank" color="primary" underline="hover">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {formatDate(order.orderDate)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Chip 
                        label={order.status} 
                        size="small" 
                        color={getStatusChipColor(order.status)}
                        sx={{ 
                          borderRadius: '4px',
                          height: '24px',
                          fontSize: '0.75rem'
                        }} 
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      {order.items} {order.items === 1 ? 'item' : 'items'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(order.total, order.currencyCode)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <IconButton size="small" aria-label={t('common.actions.more') || 'More actions'}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Pagination */}
      {!isLoading && !isError && data && data.results.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('pagination.showing', { 
              count: data.results.length, 
              total: data.count 
            }) || `Showing ${data.results.length} of ${data.count} orders`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="text"
              disabled={page === 1}
              onClick={handlePreviousPage}
              size="small"
            >
              {t('pagination.previous') || 'Previous'}
            </Button>
            
            {/* Page numbers */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {page > 1 && (
                <Button 
                  variant="text" 
                  onClick={() => setPage(1)}
                  size="small"
                  sx={{ minWidth: '32px', px: 1 }}
                >
                  1
                </Button>
              )}
              
              {page > 2 && (
                <Button 
                  variant="text" 
                  onClick={() => setPage(page - 1)}
                  size="small"
                  sx={{ minWidth: '32px', px: 1 }}
                >
                  {page - 1}
                </Button>
              )}
              
              <Button 
                variant="contained" 
                size="small"
                sx={{ minWidth: '32px', px: 1 }}
              >
                {page}
              </Button>
              
              {data && page < totalPages && (
                <Button 
                  variant="text" 
                  onClick={() => setPage(page + 1)}
                  size="small"
                  sx={{ minWidth: '32px', px: 1 }}
                >
                  {page + 1}
                </Button>
              )}
              
              {data && totalPages > 2 && page < totalPages - 1 && (
                <Button 
                  variant="text" 
                  onClick={() => setPage(totalPages)}
                  size="small"
                  sx={{ minWidth: '32px', px: 1 }}
                >
                  {totalPages}
                </Button>
              )}
            </Box>
            
            <Button
              variant="text"
              disabled={page >= totalPages}
              onClick={handleNextPage}
              size="small"
            >
              {t('pagination.next') || 'Next'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OrderHistoryTabContent;
