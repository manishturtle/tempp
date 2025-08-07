'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Container, 
  Typography, 
  Stack, 
  Paper, 
  Grid, 
  Button, 
  Avatar,
  Skeleton,
  Badge,
  Alert,
  Link as MuiLink,
  Divider,
  useTheme 
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
// Note: You'll need to create or import your actual AuthContext
// This is a placeholder that will need to be replaced with your actual auth context
const useAuthContext = () => ({ user: { isB2BAdmin: false } });
import AnalyticsCard from '@/app/components/common/AnalyticsCard';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import StarsOutlinedIcon from '@mui/icons-material/StarsOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import { useDashboardSummary } from '@/app/hooks/api/store/dashboardService';
import { QuickLinkItem } from '@/app/components/Store/dashboard/QuickLinkItem';
import { useUserOrders } from '@/app/hooks/api/store/useUserOrders';
import OrderHistoryItem from '@/app/components/Store/orders/OrderHistoryItem';

/**
 * Account Dashboard Page
 * 
 * Displays user account overview including summary metrics, quick links, and recent orders
 * Based on the design from the provided image reference
 * 
 * @returns {React.ReactElement} The Account Dashboard page
 */
/**
 * Interface for QuickLink items data structure
 */
interface QuickLink {
  /**
   * Unique key for the link
   */
  key: string;
  
  /**
   * Translation key for the link label
   */
  labelKey: string;
  
  /**
   * URL to navigate to
   */
  href: string;
  
  /**
   * Icon to display
   */
  icon: React.ReactElement;
  
  /**
   * Background color for the icon
   */
  iconBgColor?: string;
  
  /**
   * Optional function to check if the link should be displayed
   */
  conditionalCheck?: () => boolean;
}

export default function AccountDashboardPage(): React.ReactElement {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const { data: summaryData, isLoading, isError } = useDashboardSummary();
  const { 
    data: recentOrdersData, 
    isLoading: isLoadingRecentOrders, 
    isError: isRecentOrdersError 
  } = useUserOrders({ 
    page: 1, 
    limit: 3, 
    sortBy: 'date', 
    sortOrder: 'desc' 
  });
  const { user } = useAuthContext();
  
  // Hardcoded name as requested in the prompt
  const userName = 'John';
  
  // Define quick links data
  const quickLinksData: QuickLink[] = [
    { 
      key: 'profile', 
      labelKey: 'dashboard.quickLinks.viewProfile', 
      href: '/account/profile', 
      icon: <PersonOutlineIcon />, 
      iconBgColor: theme.palette.primary.light 
    },
    { 
      key: 'addresses', 
      labelKey: 'dashboard.quickLinks.manageAddresses', 
      href: '/account/addresses', 
      icon: <LocationOnOutlinedIcon />, 
      iconBgColor: theme.palette.success.light 
    },
    { 
      key: 'orders', 
      labelKey: 'dashboard.quickLinks.orderHistory', 
      href: '/account/orders', 
      icon: <ReceiptLongOutlinedIcon />, 
      iconBgColor: theme.palette.secondary.light 
    },
    { 
      key: 'wishlist', 
      labelKey: 'dashboard.quickLinks.viewWishlist', 
      href: '/account/wishlist', 
      icon: <FavoriteBorderOutlinedIcon />, 
      iconBgColor: theme.palette.error.light 
    },
    { 
      key: 'wallet', 
      labelKey: 'dashboard.quickLinks.viewWallet', 
      href: '/account/wallet', 
      icon: <AccountBalanceWalletOutlinedIcon />, 
      iconBgColor: theme.palette.warning.light 
    },
    { 
      key: 'manageUsers', 
      labelKey: 'dashboard.quickLinks.manageUsers', 
      href: '/account/users', 
      icon: <PeopleOutlineIcon />, 
      iconBgColor: theme.palette.info.light, 
      conditionalCheck: () => user?.isB2BAdmin || false 
    },
  ];

  return (
    <Container maxWidth="xl">
      {/* Welcome Message Section */}
      <Box mb={theme.spacing(4)}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          {t('dashboard.welcomeMessage', 'Welcome, {{userName}}!', { userName })}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {t('dashboard.welcomeSubtitle', 'Here\'s an overview of your account.')}
        </Typography>
      </Box>

      {/* Summary Cards Section */}
      <Grid container spacing={3} mb={theme.spacing(4)}>
        {/* {isLoading ? (
          // Loading skeleton placeholders
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Paper sx={{ p: theme.spacing(3), height: '100%', borderRadius: theme.shape.borderRadius }}>
                <Skeleton variant="rectangular" height={theme.spacing(3.75)} width="60%" sx={{ mb: theme.spacing(2) }} />
                <Skeleton variant="rectangular" height={theme.spacing(6.25)} width="80%" sx={{ mb: theme.spacing(1) }} />
                <Skeleton variant="rectangular" height={theme.spacing(2.5)} width="40%" />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper sx={{ p: theme.spacing(3), height: '100%', borderRadius: theme.shape.borderRadius }}>
                <Skeleton variant="rectangular" height={theme.spacing(3.75)} width="60%" sx={{ mb: theme.spacing(2) }} />
                <Skeleton variant="rectangular" height={theme.spacing(6.25)} width="80%" sx={{ mb: theme.spacing(1) }} />
                <Skeleton variant="rectangular" height={theme.spacing(2.5)} width="40%" />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper sx={{ p: theme.spacing(3), height: '100%', borderRadius: theme.shape.borderRadius }}>
                <Skeleton variant="rectangular" height={theme.spacing(3.75)} width="60%" sx={{ mb: theme.spacing(2) }} />
                <Skeleton variant="rectangular" height={theme.spacing(6.25)} width="80%" sx={{ mb: theme.spacing(1) }} />
                <Skeleton variant="rectangular" height={theme.spacing(2.5)} width="40%" />
              </Paper>
            </Grid>
          </>
        ) : isError ? (
          // Error alert
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {t('dashboard.summary.errorLoading', 'Error loading dashboard data. Please try again later.')}
            </Alert>
          </Grid>
        ) : summaryData ? (
          // Dashboard summary cards
          <>
            {/* Wallet Balance Card */}
            {/* <Grid item xs={12} sm={6} md={4}>
              <AnalyticsCard
                title={t('dashboard.summary.walletTitle', 'Wallet Balance')}
                value={summaryData.wallet.balanceFormatted}
                percentChange={summaryData.wallet.changePercent ? parseFloat(summaryData.wallet.changePercent) : undefined}
                icon={<AccountBalanceWalletOutlinedIcon />}
                color="primary.main"
                bgColor="primary.light"
                onClick={() => console.log('Add funds clicked')}
              />
            </Grid> */}

            {/* Loyalty Points Card */}
            {/* <Grid item xs={12} sm={6} md={4}>
              <AnalyticsCard
                title={t('dashboard.summary.loyaltyTitle', 'Loyalty Points')}
                value={summaryData.loyalty.pointsFormatted}
                icon={<StarsOutlinedIcon />}
                color="warning.main"
                bgColor="warning.light"
                onClick={() => console.log('Redeem points clicked')}
              />
            </Grid> */}

            {/* Total Orders Card */}
            {/* <Grid item xs={12} sm={6} md={4}>
              <AnalyticsCard
                title={t('dashboard.summary.ordersTitle', 'Total Orders')}
                value={`${summaryData.orders.totalCount} ${t('dashboard.summary.ordersUnit', 'orders')}`}
                icon={<ShoppingBagOutlinedIcon />}
                color="secondary.main"
                bgColor="secondary.light"
                onClick={() => console.log('View orders clicked')}
                subtitle={summaryData.orders.inProgressCount ? 
                  `${summaryData.orders.inProgressCount} ${t('dashboard.summary.inProgress', 'in progress')}` : 
                  undefined}
              />
            </Grid> */}
          {/* </> */}
        {/* ) : ( */}
          {/* // Fallback hardcoded values if no data and no error/loading */}
          <>
            {/* Wallet Balance Card */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AnalyticsCard
                title={t('dashboard.summary.walletTitle', 'Wallet Balance')}
                value="$245.50"
                percentChange={15}
                icon={<AccountBalanceWalletOutlinedIcon />}
                color="primary.main"
                bgColor="primary.light"
                onClick={() => console.log('Add funds clicked')}
              />
            </Grid>

            {/* Loyalty Points Card */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AnalyticsCard
                title={t('dashboard.summary.loyaltyTitle', 'Loyalty Points')}
                value="1,250"
                icon={<StarsOutlinedIcon />}
                color="warning.main"
                bgColor="warning.light"
                onClick={() => console.log('Redeem points clicked')}
              />
            </Grid>

            {/* Total Orders Card */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AnalyticsCard
                title={t('dashboard.summary.ordersTitle', 'Total Orders')}
                value={`24 ${t('dashboard.summary.ordersUnit', 'orders')}`}
                icon={<ShoppingBagOutlinedIcon />}
                color="secondary.main"
                bgColor="secondary.light"
                onClick={() => console.log('View orders clicked')}
                subtitle={`2 ${t('dashboard.summary.inProgress', 'in progress')}`}
              />
            </Grid>
          </>
        {/* )} */}
      </Grid>

      {/* Quick Links Section */}
      <Box mb={theme.spacing(5)}>
        <Typography variant="h5" component="h2" fontWeight="bold" mb={theme.spacing(2)}>
          {t('dashboard.quickLinksTitle', 'Quick Links')}
        </Typography>
        <Box>
          <Grid container spacing={2.5}>
            {quickLinksData.map((link) => {
              // Check if the link should be displayed based on conditionalCheck
              if (link.conditionalCheck && !link.conditionalCheck()) {
                return null;
              }
              
              return (
                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={link.key}>
                  <QuickLinkItem 
                    icon={link.icon}
                    labelKey={link.labelKey}
                    href={link.href}
                    iconBgColor={link.iconBgColor}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

      {/* Recent Orders Section */}
      <Box mb={theme.spacing(4)}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={theme.spacing(2)}>
          <Typography variant="h5" component="h2" fontWeight="bold">
            {t('dashboard.recentOrders.title', 'Recent Orders')}
          </Typography>
          <Link href="/store/account/orders" passHref>
            <MuiLink 
              variant="body2" 
              color="primary" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                '&:hover': { textDecoration: 'none' }
              }}
            >
              {t('dashboard.recentOrders.viewAll', 'View All Orders')}
              <ArrowForwardIcon fontSize="small" sx={{ ml: theme.spacing(0.5) }} />
            </MuiLink>
          </Link>
        </Stack>
        
       
          {isLoadingRecentOrders ? (
            // Loading state
            <Box sx={{ p: theme.spacing(2) }}>
              {[1, 2, 3].map((index) => (
                <Box key={index} sx={{ mb: index < 3 ? theme.spacing(2) : 0 }}>
                  <Skeleton variant="rectangular" height={theme.spacing(10)} width="100%" />
                </Box>
              ))}
            </Box>
          ) : isRecentOrdersError ? (
            // Error state
            <Box p={theme.spacing(3)}>
              <Alert severity="error">
                {t('dashboard.recentOrders.errorLoading', 'Unable to load recent orders. Please try again later.')}
              </Alert>
            </Box>
          ) : recentOrdersData?.orders && recentOrdersData.orders.length > 0 ? (
            // Orders available
            <Box>
              {recentOrdersData.orders.map((order, index) => (
                <React.Fragment key={order.id}>
                  <OrderHistoryItem 
                    order={order} 
                    isGridView={false} 
                  />
                  {index < recentOrdersData.orders.length - 1 && (
                    <Divider />
                  )}
                </React.Fragment>
              ))}
            </Box>
          ) : (
            // No orders
            <Box p={theme.spacing(3)} textAlign="center">
              <Typography variant="body1" color="text.secondary">
                {t('dashboard.recentOrders.noRecentOrders', 'No recent orders found.')}
              </Typography>
            </Box>
          )}
       
      </Box>
    </Container>
  );
}
