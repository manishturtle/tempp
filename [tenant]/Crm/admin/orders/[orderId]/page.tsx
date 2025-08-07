'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Stack,
  Paper,
  Skeleton,
  CircularProgress,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Import hooks and types
import { useAdminOrderDetail } from '@/app/hooks/api/admin/useAdminOrders';
import { AdminOrder } from '@/app/types/admin/orders';

// Import tab components
import OrderOverviewTab from './OrderOverviewTab';
import OrderHistoryTab from './OrderHistoryTab';

/**
 * Interface for tab panel props
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * TabPanel component to handle tab content display
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`order-tabpanel-${index}`}
      aria-labelledby={`order-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Helper function for tab accessibility props
 */
function a11yProps(index: number) {
  return {
    id: `order-tab-${index}`,
    'aria-controls': `order-tabpanel-${index}`,
  };
}

/**
 * Admin Order Detail Page component
 * Displays detailed information about a specific order
 */
export default function AdminOrderDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  
  // Extract tenant slug and order ID from URL parameters
  const tenantSlug = typeof params?.tenant === 'string' ? params.tenant : '';
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);
  
  // Fetch order details using the custom hook
  const { data: orderDetails, isLoading, isError, error } = useAdminOrderDetail(orderId);
  
  // Format date for display
  const formattedOrderDate = orderDetails?.created_at 
    ? new Date(orderDetails.created_at).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Get status chip color based on order status
  const getStatusChipColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'COMPLETED': 'success',
      'PENDING_PAYMENT': 'warning',
      'PROCESSING': 'info',
      'SHIPPED': 'info',
      'DELIVERED': 'success',
      'CANCELLED': 'error',
      'REFUNDED': 'default'
    };
    
    return statusMap[status] || 'default';
  };
  
  // Get payment status chip color
  const getPaymentStatusChipColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      'PAID': 'success',
      'PENDING': 'warning',
      'FAILED': 'error',
      'REFUNDED': 'info'
    };
    
    return statusMap[status] || 'default';
  };

  return (
    < >
      {/* Back Link */}
      <Box mb={2}>
        <Link href={`/${tenantSlug}/Crm/admin/orders`} passHref>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            sx={{ ml: -1 }} // Offset the button padding
          >
            {t('admin.orders.detail.backToOrders', 'Back to Orders')}
          </Button>
        </Link>
      </Box>

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error?.message || t('common.error', 'An error occurred while fetching order details')}
        </Alert>
      )}
      
      {/* Order Title Bar */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        flexWrap="wrap" 
        gap={2} 
        mb={2}
      >
        {/* Left Side - Title & Statuses */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5" component="h1">
            {isLoading ? (
              <Skeleton width={150} />
            ) : (
              <>Order {orderDetails?.order_id || ''}</>  
            )}
          </Typography>
          
          {isLoading ? (
            <Skeleton width={80} height={32} />
          ) : orderDetails?.status && (
            <Chip 
              label={t(`order.status.${orderDetails.status.toLowerCase()}`, 
                orderDetails.status.replace('_', ' ')
              )} 
              color={getStatusChipColor(orderDetails.status)}
              size="small"
              variant="outlined"
            />
          )}
          
          {isLoading ? (
            <Skeleton width={80} height={32} />
          ) : orderDetails?.payment_status && (
            <Chip 
              label={t(`payment.status.${orderDetails.payment_status.toLowerCase()}`, 
                orderDetails.payment_status.replace('_', ' ')
              )}
              color={getPaymentStatusChipColor(orderDetails.payment_status)}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        
        {/* Right Side - Actions */}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            size="small"
          >
            {t('common.print', 'Print')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            size="small"
          >
            {t('common.resendConfirmation', 'Resend Confirmation')}
          </Button>
          <Button
            variant="contained"
            endIcon={<MoreVertIcon />}
            size="small"
          >
            {t('common.moreActions', 'More Actions')}
          </Button>
        </Stack>
      </Box>
      
      {/* Creation Date */}
      <Typography variant="caption" color="text.secondary" display="block" mb={3}>
        {isLoading ? (
          <Skeleton width={200} />
        ) : formattedOrderDate ? (
          t('common.createdOn', 'Created on {{date}}', { date: formattedOrderDate })
        ) : null}
      </Typography>
      
      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Tab Navigation */}
      {!isLoading && orderDetails && (
        <Box sx={{ width: '100%' }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="order detail tabs"
            >
              <Tab 
                label={t('admin.orders.detail.tabs.overview', 'Overview')} 
                id="order-tab-0"
                aria-controls="order-tabpanel-0"
              />
              <Tab 
                label={t('admin.orders.detail.tabs.history', 'History & Audit Trail')} 
                id="order-tab-1"
                aria-controls="order-tabpanel-1"
              />
            </Tabs>
          </Box>
          
          {/* Tab Panels */}
          <Box hidden={activeTab !== 0} role="tabpanel" id="order-tabpanel-0" aria-labelledby="order-tab-0">
            {activeTab === 0 && orderDetails && (
              <OrderOverviewTab 
                orderId={orderId} 
                order={{
                  ...orderDetails,
                  order_id: orderDetails.id, // Map id to order_id
                  account_id: orderDetails.account_id || 0, // Ensure non-null
                  contact_id: orderDetails.contact_id || 0, // Ensure non-null
                  customer_details: orderDetails.customer_details || {
                    name: '',
                    email: '',
                    phone: '',
                    account_status: '',
                    contact_id: 0
                  } // Ensure non-null with required fields
                }} 
                isLoading={isLoading} 
              />
            )}
          </Box>
          
          <Box hidden={activeTab !== 1} role="tabpanel" id="order-tabpanel-1" aria-labelledby="order-tab-1">
            {activeTab === 1 && <OrderHistoryTab orderId={orderId} isLoading={isLoading} />}
          </Box>
        </Box>
      )}
    </>
  );
}
