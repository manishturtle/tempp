'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Stack, 
  CircularProgress, 
  Alert, 
  Link as MuiLink,
  IconButton,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Skeleton
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { useAuthStore } from '@/app/auth/store/authStore';
import AnalyticsCard from '@/app/components/common/AnalyticsCard';
import TransactionHistoryFilters from '@/app/components/Store/wallet/TransactionHistoryFilters';
import WalletTransactionItem from '@/app/components/Store/wallet/WalletTransactionItem';
import { WalletTransaction } from '@/app/types/store/walletTypes';
import { useWalletSummary, useWalletTransactions, WalletTransactionListParams } from '@/app/hooks/api/store/useWallet';

/**
 * WalletPage component displays the user's wallet information including balance,
 * statistics, and transaction history.
 *
 * @returns {React.ReactElement} The rendered Wallet page
 */
export default function WalletPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  // State for transaction filters and pagination
  const [currentTransactionPage, setCurrentTransactionPage] = useState<number>(1);
  const [transactionFilters, setTransactionFilters] = useState<WalletTransactionListParams>({
    page: 1,
    limit: 7,
    transactionType: 'all',
    dateRange: 'last30'
  });
  
  // Fetch wallet summary data
  const { 
    data: walletSummaryData, 
    isLoading: isLoadingSummary, 
    isError: isErrorSummary 
  } = useWalletSummary();
  
  // Fetch wallet transactions data
  const {
    data: walletTransactionsData,
    isLoading: isLoadingTransactions,
    isError: isErrorTransactions
  } = useWalletTransactions({
    ...transactionFilters,
    page: currentTransactionPage
  });
  
  // Handle recharge wallet action
  const handleRechargeWallet = (): void => {
    // Navigate to a dedicated recharge page
    router.push('/store/account/wallet/recharge');
    console.log('Initiate wallet recharge flow...');
    // Note: The actual recharge flow (form for amount, payment method selection, submission)
    // would be implemented on the recharge page
  };
  
  // Handle filter changes
  const handleFiltersChange = (newFilters: { transactionType: string; dateRange: string }): void => {
    setTransactionFilters(prevFilters => ({
      ...prevFilters,
      transactionType: newFilters.transactionType,
      dateRange: newFilters.dateRange
    }));
    setCurrentTransactionPage(1); // Reset to first page when filters change
  };
  
  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number): void => {
    setCurrentTransactionPage(value);
  };

  // Helper functions for formatting data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy - HH:mm');
  };

  const formatCurrency = (value: number): string => {
    return `$${Math.abs(value).toFixed(2)}`;
  };



  return (
    <Container maxWidth="xl" >
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1">
            {t('wallet.title')}
          </Typography>
        </Box>

      {/* Balance Overview Section */}
      <Paper 
        elevation={1} 
        sx={(theme) => ({ 
          p: theme.spacing(3), 
          mb: theme.spacing(4), 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: theme.spacing(2),
          transition: theme.transitions.create(['box-shadow']),
          '&:hover': {
            boxShadow: theme.shadows[2]
          }
        })}
      >
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('wallet.currentBalanceLabel')}
          </Typography>
          {isLoadingSummary ? (
            <Skeleton variant="rectangular" width={200} height={60} sx={{ borderRadius: (theme) => theme.shape.borderRadius }} />
          ) : isErrorSummary ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {t('common.error.loadingData')}
            </Alert>
          ) : (
            <Typography variant="h3" component="p" fontWeight="bold" sx={{ mb: 0.5 }}>
              {walletSummaryData?.balanceInfo.currentBalanceFormatted || '$0.00'}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {t('wallet.lastUpdatedLabel')}: {isLoadingSummary ? (
              <Skeleton variant="text" width="150px" />
            ) : isErrorSummary ? (
              '-'
            ) : (
              walletSummaryData?.balanceInfo.lastUpdated ? 
                `${format(new Date(walletSummaryData.balanceInfo.lastUpdated), 'MMM d, yyyy')} at ${format(new Date(walletSummaryData.balanceInfo.lastUpdated), 'h:mm a')}` : 
                '-'
            )}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleRechargeWallet}
        >
          {t('wallet.rechargeButton')}
        </Button>
      </Paper>

      {/* Summary Stats Section */}
      <Grid container spacing={3} sx={(theme) => ({ 
        mb: theme.spacing(4),
        backgroundColor: theme.palette.background.default,
        borderRadius: theme.shape.borderRadius,
      })}>
        <Grid item xs={12} sm={6} md={4}>
          <AnalyticsCard
            title={t('wallet.stats.thisMonthLabel')}
            value={walletSummaryData?.stats.thisMonthSpentFormatted || '$0.00'}
            percentChange={walletSummaryData?.stats.thisMonthTrend ? 
              parseInt(walletSummaryData.stats.thisMonthTrend.replace(/[^0-9-]/g, '')) : 
              undefined
            }
            icon={<AccountBalanceWalletIcon />}
            color="success.main"
            isLoading={isLoadingSummary}
            subtitle={t('wallet.stats.fromLastMonth')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AnalyticsCard
            title={t('wallet.stats.totalSpentLabel')}
            value={walletSummaryData?.stats.totalSpentFormatted || '$0.00'}
            icon={<ShoppingCartIcon />}
            color="info.main"
            isLoading={isLoadingSummary}
            subtitle={t(walletSummaryData?.stats.totalSpentLabelKey || 'wallet.stats.lifetimeSpending')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AnalyticsCard
            title={t('wallet.stats.pendingOrdersLabel')}
            value={walletSummaryData?.stats.pendingOrdersCount || 0}
            icon={<ReceiptIcon />}
            color="warning.main"
            isLoading={isLoadingSummary}
            onClick={() => walletSummaryData?.stats.pendingOrdersLink ? 
              (window.location.href = walletSummaryData.stats.pendingOrdersLink) : undefined}
            subtitle={t('wallet.stats.viewOrdersLink')}
          />
        </Grid>
      </Grid>

      {/* Transaction History Section */}
      <Box sx={(theme) => ({ mt: theme.spacing(4) })}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          mb={theme.spacing(2)}
          spacing={{ xs: theme.spacing(1), sm: 0 }}
        >
          <Typography variant="h5" component="h2">
            {t('wallet.history.title')}
          </Typography>
          <TransactionHistoryFilters 
            onFiltersChange={handleFiltersChange}
            initialFilters={{
              transactionType: transactionFilters.transactionType || 'all',
              dateRange: transactionFilters.dateRange || 'last30'
            }}
          />
        </Stack>
        
        <TableContainer 
          component={Paper} 
          elevation={1}
          sx={(theme) => ({ 
            transition: theme.transitions.create(['box-shadow']),
            '&:hover': {
              boxShadow: theme.shadows[2]
            },
            borderRadius: theme.shape.borderRadius,
            overflow: 'auto' // Enable horizontal scrolling
          })}
        >
          <Table 
            sx={(theme) => ({ 
              minWidth: { xs: '100%', sm: 650 },
              '& .MuiTableRow-root': {
                transition: theme.transitions.create(['background-color']),
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }
            })} 
            aria-label={t('wallet.history.ariaLabelTable')}
          >
            <TableHead>
              <TableRow>
                <TableCell>{t('wallet.history.header.date')}</TableCell>
                <TableCell>{t('wallet.history.header.type')}</TableCell>
                <TableCell>{t('wallet.history.header.details')}</TableCell>
                <TableCell align="right">{t('wallet.history.header.amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingTransactions ? (
                // Loading state
                Array.from(new Array(5)).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton variant="text" width="80%" sx={{ borderRadius: (theme) => theme.shape.borderRadius }} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width="80px" height="24px" sx={{ borderRadius: (theme) => theme.shape.borderRadius }} /></TableCell>
                    <TableCell><Skeleton variant="text" width="90%" sx={{ borderRadius: (theme) => theme.shape.borderRadius }} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width="80px" sx={{ borderRadius: (theme) => theme.shape.borderRadius }} /></TableCell>
                  </TableRow>
                ))
              ) : isErrorTransactions ? (
                // Error state
                <TableRow>
                  <TableCell colSpan={4}>
                    <Alert severity="error">
                      {t('wallet.history.errorLoading')}
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : !walletTransactionsData || !walletTransactionsData.transactions ? (
                // No data state
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography textAlign="center" p={2}>
                      {t('wallet.history.noTransactions')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : walletTransactionsData.transactions.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography textAlign="center" p={2}>
                      {t('wallet.history.noTransactions')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                // Data state
                walletTransactionsData.transactions.map((transaction) => (
                  <WalletTransactionItem 
                    key={transaction.id} 
                    transaction={transaction} 
                  />
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {!isLoadingTransactions && !isErrorTransactions && walletTransactionsData && walletTransactionsData.pagination && (
            <Stack 
              direction="row" 
              justifyContent="center" 
              alignItems="center" 
              spacing={2} 
              sx={(theme) => ({ py: theme.spacing(2) })}
            >
              <Typography variant="body2" color="text.secondary">
                {t('wallet.history.page')} {walletTransactionsData.pagination.currentPage} {t('wallet.history.of')} {walletTransactionsData.pagination.totalPages}
              </Typography>
              <Pagination 
                count={walletTransactionsData.pagination.totalPages} 
                page={currentTransactionPage} 
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
