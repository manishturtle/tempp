'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Stack, 
  Paper,
  Grid,
  IconButton,
  useTheme,
  CircularProgress,
  Alert,
  Pagination,
  Button
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'react-i18next';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import OrderFilters, { FiltersState } from '@/app/components/Store/orders/OrderFilters';
import OrderHistoryItem from '@/app/components/Store/orders/OrderHistoryItem';
import useUserOrders from '@/app/hooks/api/store/useUserOrders';
import { OrderListParams } from '@/app/types/store/orderTypes';
import { isAuthenticated } from '@/app/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';

/**
 * Order History Page component
 * Displays a list of customer's past orders with filtering and pagination
 * 
 * @returns {React.ReactElement} Order history page component
 */
export default function OrderHistoryPage(): React.ReactElement {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  
  // State for pagination, filters, search, and view mode
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeFilters, setActiveFilters] = useState<FiltersState>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const authStatus = isAuthenticated();
    setIsUserAuthenticated(authStatus);
    
    // Redirect to login if not authenticated
    if (!authStatus) {
      router.push('/auth/login?redirect=/store/account/orders');
    }
  }, [router]);
  
  // Constants
  const ITEMS_PER_PAGE = 10;
  
  // Prepare query parameters for the API call
  const queryParams: OrderListParams = {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    status: activeFilters.status,
    sortBy: activeFilters.sortBy,
    sortOrder: activeFilters.sortOrder as 'asc' | 'desc' | undefined,
    searchTerm: searchTerm,
  };
  
  // Fetch orders using the custom hook
  const { 
    data: ordersData, 
    isLoading, 
    isError, 
    error 
  } = useUserOrders(queryParams);
  
  // Handler for applying filters
  const handleApplyFilters = (newFilters: FiltersState): void => {
    setActiveFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  // Handler for search term changes
  const handleSearch = (term: string): void => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when search term changes
  };
  
  // Handler for view mode changes
  const handleViewChange = (mode: 'list' | 'grid'): void => {
    setViewMode(mode);
  };
  
  // Handler for pagination changes
  const handlePageChange = (_event: React.ChangeEvent<unknown> | null, page: number): void => {
    setCurrentPage(page);
  };

  return (
    <Container maxWidth="xl">
      {/* Page Title */}
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          mb: theme.spacing(3),
          color: theme.palette.text.primary
        }}
      >
        {t('orderHistory.title', 'My Orders')}
      </Typography>

      {/* Order Filters Component */}
      <OrderFilters
        onApplyFilters={handleApplyFilters}
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        currentViewMode={viewMode}
      />

      {/* Orders Section */}
      {isLoading ? (
        // Loading state
        <Box sx={{ display: 'flex', justifyContent: 'center', py: theme.spacing(4) }}>
          <CircularProgress size={40} thickness={4} color="primary" />
        </Box>
      ) : isError ? (
        // Error state
        <Alert severity="error" sx={{ mt: theme.spacing(2) }}>
          {t('common.error.generic', 'An error occurred while fetching your orders. Please try again later.')}
          {error instanceof Error && <Box sx={{ mt: 1 }}>{error.message}</Box>}
        </Alert>
      ) : ordersData?.orders && ordersData.orders.length > 0 ? (
        // Orders in either list or grid view
        viewMode === 'list' ? (
          // List View
          <Stack spacing={theme.spacing(2)}>
            {ordersData.orders.map((order) => (
              <OrderHistoryItem 
                key={typeof order.id === 'number' ? order.id.toString() : order.id} 
                order={order} 
              />
            ))}
          </Stack>
        ) : (
          // Grid View
          <Grid container spacing={3}>
            {ordersData.orders.map((order) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={typeof order.id === 'number' ? order.id.toString() : order.id}>
                <OrderHistoryItem 
                  order={order} 
                  isGridView={true}
                />
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        // No orders found
        <Paper 
          elevation={0} 
          sx={{ 
            p: theme.spacing(4), 
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            textAlign: 'center',
            bgcolor: theme.palette.background.paper
          }}
        >
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {t('orderHistory.noOrdersFound', 'No orders found')}
          </Typography>
        </Paper>
      )}
      
      {/* Pagination */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mt: theme.spacing(4), 
        mb: theme.spacing(3),
        py: theme.spacing(1)
      }}>
        <Stack 
          direction="row" 
          spacing={1} 
          alignItems="center" 
          justifyContent="center"
        >
          {/* Previous Page Button */}
          <IconButton 
            disabled={currentPage <= 1} 
            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
          
          {/* Page Numbers */}
          {[...Array(Math.min(8, ordersData?.pagination?.totalPages || 1))].map((_, index) => {
            const pageNum = index + 1;
            return (
              <Button 
                key={pageNum}
                variant={pageNum === currentPage ? 'contained' : 'text'}
                color="primary"
                size="small"
                onClick={() => setCurrentPage(pageNum)}
                sx={{ 
                  minWidth: 36, 
                  height: 36,
                  borderRadius: '50%',
                  p: 0
                }}
              >
                {pageNum}
              </Button>
            );
          })}
          
          {/* Next Page Button */}
          <IconButton 
            disabled={currentPage >= (ordersData?.pagination?.totalPages || 1)} 
            onClick={() => currentPage < (ordersData?.pagination?.totalPages || 1) && setCurrentPage(currentPage + 1)}
            size="small"
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Box>

      
    </Container>
  );
}