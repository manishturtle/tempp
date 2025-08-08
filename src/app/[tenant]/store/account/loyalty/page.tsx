'use client';

/**
 * LoyaltyPage component displaying the user's loyalty points and history
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Stack, 
  Avatar,
  CircularProgress, 
  Alert, 
  Link as MuiLink,
  IconButton,
  TextField,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  InputAdornment,
  Pagination,
  Skeleton
} from '@mui/material';
import RedeemIcon from '@mui/icons-material/Redeem';
import BarChartIcon from '@mui/icons-material/BarChart';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTheme } from '@mui/material/styles';

// Import components and hooks
import Link from 'next/link';
import PointsHistoryFilters from '@/app/components/Store/loyalty/PointsHistoryFilters';
import LoyaltyTransactionItem from '@/app/components/Store/loyalty/LoyaltyTransactionItem';
import { LoyaltyTransaction as LoyaltyTransactionType } from '@/app/types/store/loyaltyTypes';

/**
 * Data structure for loyalty summary data
 */
interface LoyaltyBalanceInfo {
  currentPointsFormatted: string; // e.g., "12,450"
  expiringSoonText?: string; // e.g., "1,250 points expiring on 2025-08-15"
}

interface LoyaltySummaryData {
  balanceInfo: LoyaltyBalanceInfo;
}

/**
 * Types for loyalty transaction history data
 */
interface LoyaltyTransaction {
  id: string;
  date: string;
  type: 'earned' | 'redeemed' | 'adjustment' | 'expired';
  typeTextKey: string;
  details: string;
  pointsChange: number;
  pointsChangeFormatted: string;
  isPositive: boolean;
  expiryDate?: string;
  relatedEntity?: {
    type: 'order' | 'product' | 'service';
    id: string;
    displayText: string;
    url: string;
  };
}

interface LoyaltyHistoryPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface LoyaltyHistoryData {
  transactions: LoyaltyTransaction[];
  pagination: LoyaltyHistoryPagination;
}

/**
 * LoyaltyPage component displays the user's loyalty points balance and transaction history
 * 
 * @returns {React.ReactElement} The rendered component
 */
export default function LoyaltyPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // State for loading
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = React.useState<boolean>(false);
  const [isErrorTransactions, setIsErrorTransactions] = React.useState<boolean>(false);
  
  // State for filters and pagination
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [filters, setFilters] = React.useState({
    searchTerm: '',
    transactionType: 'all',
    dateRange: 'last30'
  });
  
  // Mock data - will be replaced with API call
  const loyaltySummaryData: LoyaltySummaryData = {
    balanceInfo: {
      currentPointsFormatted: "12,450",
      expiringSoonText: "1,250 points expiring on 2025-06-15"
    }
  };
  
  // Mock transaction history data
  const loyaltyHistoryData = React.useMemo<LoyaltyHistoryData>(() => ({
    transactions: [
      {
        id: 'tx1',
        date: '2025-05-01 14:32',
        type: 'earned',
        typeTextKey: 'loyalty.transactionTypes.earned',
        details: 'Order #ORD-2025-1142',
        pointsChange: 750,
        pointsChangeFormatted: '+750',
        isPositive: true,
        expiryDate: '2026-05-01',
        relatedEntity: {
          type: 'order',
          id: 'ORD-2025-1142',
          displayText: 'View Order',
          url: '/store/account/orders/ORD-2025-1142'
        }
      },
      {
        id: 'tx2',
        date: '2025-04-25 09:15',
        type: 'redeemed',
        typeTextKey: 'loyalty.transactionTypes.redeemed',
        details: 'Order #ORD-2025-1098',
        pointsChange: -1500,
        pointsChangeFormatted: '-1,500',
        isPositive: false,
        expiryDate: '',
        relatedEntity: {
          type: 'order',
          id: 'ORD-2025-1098',
          displayText: 'View Order',
          url: '/store/account/orders/ORD-2025-1098'
        }
      },
      {
        id: 'tx3',
        date: '2025-04-15 16:48',
        type: 'adjustment',
        typeTextKey: 'loyalty.transactionTypes.adjustment',
        details: 'Customer Service Credit',
        pointsChange: 500,
        pointsChangeFormatted: '+500',
        isPositive: true,
        expiryDate: '2026-04-15'
      },
      {
        id: 'tx4',
        date: '2025-04-10 11:20',
        type: 'earned',
        typeTextKey: 'loyalty.transactionTypes.earned',
        details: 'Order #ORD-2025-1056',
        pointsChange: 1200,
        pointsChangeFormatted: '+1,200',
        isPositive: true,
        expiryDate: '2026-04-10',
        relatedEntity: {
          type: 'order',
          id: 'ORD-2025-1056',
          displayText: 'View Order',
          url: '/store/account/orders/ORD-2025-1056'
        }
      },
      {
        id: 'tx5',
        date: '2025-03-28 13:05',
        type: 'expired',
        typeTextKey: 'loyalty.transactionTypes.expired',
        details: 'Points Expiration',
        pointsChange: -250,
        pointsChangeFormatted: '-250',
        isPositive: false,
        expiryDate: ''
      },
      {
        id: 'tx6',
        date: '2025-03-15 08:30',
        type: 'earned',
        typeTextKey: 'loyalty.transactionTypes.earned',
        details: 'Order #ORD-2025-987',
        pointsChange: 850,
        pointsChangeFormatted: '+850',
        isPositive: true,
        expiryDate: '2026-03-15',
        relatedEntity: {
          type: 'order',
          id: 'ORD-2025-987',
          displayText: 'View Order',
          url: '/store/account/orders/ORD-2025-987'
        }
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 4,
      totalItems: 24,
      itemsPerPage: 6
    }
  }), []);
  
  // Handler for Redeem Points button
  const handleRedeemPoints = (): void => {
    console.log('Redeem points clicked');
    // In a real implementation, this would navigate to a redemption page
    // router.push('/account/loyalty/redeem-flow');
  };
  
  // Handler for View Analytics button
  const handleViewAnalytics = (): void => {
    console.log('View analytics clicked');
    // In a real implementation, this would navigate to an analytics page
    // router.push('/account/loyalty/analytics');
  };
  
  // Handler for filter changes
  const handleFiltersChange = (newFilters: { 
    searchTerm?: string; 
    transactionType?: string; 
    dateRange?: string; 
  }): void => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1); // Reset to first page when filters change
    console.log('Filters changed:', updatedFilters);
    // In a real implementation, this would trigger an API call to fetch filtered data
  };
  
  // Handler for pagination
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number): void => {
    setCurrentPage(value);
    console.log('Page changed:', value);
    // In a real implementation, this would trigger an API call to fetch the next page of data
  };
  
  return (
    <Container maxWidth="xl">
      {/* Page Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: theme.spacing(3) 
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t('loyalty.title')}
        </Typography>
      </Box>
      
      {/* Points Balance Overview Section */}
      <Paper 
        elevation={2}
        sx={{ 
          p: theme.spacing(3), 
          mb: theme.spacing(3), 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: theme.spacing(2)
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('loyalty.currentBalanceLabel')}
          </Typography>
          {isLoading ? (
            <Skeleton variant="rectangular" width={200} height={60} sx={{ borderRadius: theme.shape.borderRadius }} />
          ) : (
            <Typography variant="h3" component="p" fontWeight="bold" color="primary.main" sx={{ mb: 0.5 }}>
              {loyaltySummaryData.balanceInfo.currentPointsFormatted}
            </Typography>
          )}
          {isLoading ? (
            <Skeleton variant="text" width={150} />
          ) : loyaltySummaryData.balanceInfo.expiringSoonText ? (
            <Typography variant="caption" color="warning.main" display="block">
              {loyaltySummaryData.balanceInfo.expiringSoonText}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button 
            variant="contained" 
            size="medium" 
            startIcon={<RedeemIcon />}
            onClick={handleRedeemPoints}
          >
            {t('loyalty.redeemButton')}
          </Button>
          <Button 
            variant="outlined" 
            size="medium" 
            startIcon={<BarChartIcon />}
            onClick={handleViewAnalytics}
          >
            {t('loyalty.analyticsButton')}
          </Button>
        </Stack>
      </Paper>
      
      {/* Points History Section */}
      <Box sx={{ mt: theme.spacing(4), mb: theme.spacing(4) }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          mb={theme.spacing(2)}
        >
          <Typography variant="h5" component="h2">
            {t('loyalty.history.title')}
          </Typography>
          <PointsHistoryFilters 
            initialFilters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </Stack>
        
        <TableContainer 
          component={Paper} 
          elevation={1}
          sx={(theme) => ({
            borderRadius: theme.shape.borderRadius,
            overflow: 'auto',
            transition: theme.transitions.create(['box-shadow']),
            '&:hover': {
              boxShadow: theme.shadows[2]
            }
          })}
        >
          <Table 
            sx={{ minWidth: 750 }}
            aria-label={t('loyalty.history.ariaLabelTable')}
          >
            <TableHead>
              <TableRow>
                <TableCell>{t('loyalty.history.header.date')}</TableCell>
                <TableCell>{t('loyalty.history.header.type')}</TableCell>
                <TableCell>{t('loyalty.history.header.details')}</TableCell>
                <TableCell align="right">{t('loyalty.history.header.pointsChange')}</TableCell>
                <TableCell>{t('loyalty.history.header.expiryDate')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingTransactions ? (
                // Loading state
                Array.from(new Array(5)).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton variant="text" width="80%" sx={{ borderRadius: theme.shape.borderRadius }} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width="80px" height="24px" sx={{ borderRadius: theme.shape.borderRadius }} /></TableCell>
                    <TableCell><Skeleton variant="text" width="90%" sx={{ borderRadius: theme.shape.borderRadius }} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width="80px" sx={{ borderRadius: theme.shape.borderRadius }} /></TableCell>
                    <TableCell><Skeleton variant="text" width="80%" sx={{ borderRadius: theme.shape.borderRadius }} /></TableCell>
                  </TableRow>
                ))
              ) : isErrorTransactions ? (
                // Error state
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert severity="error">
                      {t('loyalty.history.errorLoading')}
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : !loyaltyHistoryData || loyaltyHistoryData.transactions.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography textAlign="center" sx={{ py: 4 }}>
                      {t('loyalty.history.noTransactions')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                // Data state - using the LoyaltyTransactionItem component
                loyaltyHistoryData.transactions.map((transaction) => {
                  // Transform to match the LoyaltyTransaction type from our types file
                  const formattedTransaction: LoyaltyTransactionType = {
                    id: transaction.id,
                    date: transaction.date,
                    type: transaction.type,
                    typeTextKey: transaction.typeTextKey,
                    details: transaction.details,
                    relatedOrderUrl: transaction.relatedEntity?.url,
                    pointsChangeFormatted: transaction.pointsChangeFormatted,
                    isCredit: transaction.isPositive,
                    expiryDate: transaction.expiryDate
                  };
                  
                  return (
                    <LoyaltyTransactionItem
                      key={transaction.id}
                      transaction={formattedTransaction}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {!isLoadingTransactions && !isErrorTransactions && loyaltyHistoryData && loyaltyHistoryData.pagination && (
            <Stack 
              direction="row" 
              justifyContent="center" 
              alignItems="center" 
              spacing={2} 
              sx={{ py: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('loyalty.showingResults', { 
                  from: (loyaltyHistoryData.pagination.currentPage - 1) * loyaltyHistoryData.pagination.itemsPerPage + 1, 
                  to: Math.min(loyaltyHistoryData.pagination.currentPage * loyaltyHistoryData.pagination.itemsPerPage, loyaltyHistoryData.pagination.totalItems), 
                  total: loyaltyHistoryData.pagination.totalItems 
                })}
              </Typography>
              <Pagination 
                count={loyaltyHistoryData.pagination.totalPages} 
                page={currentPage} 
                onChange={handlePageChange}
                color="primary" 
                size="medium"
                showFirstButton
                showLastButton
                sx={(theme) => ({
                  '& .MuiPaginationItem-root': {
                    transition: theme.transitions.create(['background-color', 'color']),
                  }
                })}
              />
            </Stack>
          )}
        </TableContainer>
      </Box>
    </Container>
  );
}
