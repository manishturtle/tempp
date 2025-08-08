'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Link, 
  Chip, 
  Button, 
  Divider, 
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import NextLink from 'next/link';

import { useGuestOrderDetails } from '@/app/hooks/api/store/useGuestOrderDetails';
import { OrderStatusProgress } from '@/app/components/Store/order/OrderStatusProgress';
import { OrderSummaryItem } from '@/app/components/Store/order/OrderSummaryItem';
import { AddressCard } from '@/app/components/Store/order/AddressCard';
import { formatCurrency } from '@/app/utils/formatters';
import { OrderStatus } from '@/app/types/store/order';

/**
 * Guest Order Status Page
 * Allows guests to track their order status using a secure token
 */
export default function GuestOrderStatusPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { guestToken } = useParams<{ guestToken: string }>();
  
  // Fetch order details using guest token
  const { 
    data: orderData, 
    isLoading, 
    isError 
  } = useGuestOrderDetails(guestToken);
  
  // Format a date string
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    
    return format(new Date(dateString), 'MMMM d, yyyy') + 
      (dateString.includes('T') ? (' ' + format(new Date(dateString), 'h:mm a')) : '');
  };
  
  // Get the status display text
  const getStatusDisplayText = (status: OrderStatus): string => {
    switch (status) {
      case 'PLACED':
        return t('store.tracking.orderPlaced');
      case 'PROCESSING':
        return t('store.tracking.processing');
      case 'SHIPPED':
        return t('store.tracking.shipped');
      case 'DELIVERED':
        return t('store.tracking.delivered');
      case 'CANCELLED':
        return t('store.tracking.cancelled');
      case 'RETURNED':
        return t('store.tracking.returned');
      default:
        return status;
    }
  };
  
  // Get chip color based on status
  const getStatusChipColor = (status: OrderStatus) => {
    switch (status) {
      case 'PLACED':
        return { color: 'default' as const };
      case 'PROCESSING':
        return { color: 'primary' as const };
      case 'SHIPPED':
        return { color: 'info' as const };
      case 'DELIVERED':
        return { color: 'success' as const };
      case 'CANCELLED':
        return { color: 'error' as const };
      case 'RETURNED':
        return { color: 'warning' as const };
      default:
        return { color: 'default' as const };
    }
  };
  
  // If there's an error loading the order
  if (isError) {
    return (
      <Container maxWidth="md" sx={{ py: theme.spacing(8) }}>
        <Box sx={{ textAlign: 'center', mb: theme.spacing(4) }}>
          <Typography variant="h4" gutterBottom>
            {t('store.tracking.invalidToken')}
          </Typography>
          <Typography variant="body1" sx={{ mb: theme.spacing(4) }}>
            {t('store.tracking.errorMessage')}
          </Typography>
          <Button 
            component={NextLink} 
            href="/"
            variant="contained"
          >
            {t('store.tracking.goToStore')}
          </Button>
        </Box>
      </Container>
    );
  }
  
  // Loading skeleton
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: theme.spacing(4) }}>
        <Box sx={{ mb: theme.spacing(4) }}>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" height={24} />
        </Box>
        <Skeleton variant="rectangular" height={100} sx={{ mb: theme.spacing(4) }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: theme.spacing(4) }}>
      {/* Order title and status */}
      <Box sx={{ mb: theme.spacing(4) }}>
        <Typography variant="h4" gutterBottom>
          {t('store.tracking.title', { orderNumber: orderData?.order_number })}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: theme.spacing(2)
        }}>
          <Typography variant="body1" color="text.secondary">
            {t('store.tracking.placed', { date: formatDate(orderData?.created_at) })}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: theme.spacing(1) }}>
              {t('store.tracking.currentStatus', { status: getStatusDisplayText(orderData!.status) })}
            </Typography>
            <Chip 
              label={getStatusDisplayText(orderData!.status)} 
              size="small"
              {...getStatusChipColor(orderData!.status)}
            />
          </Box>
        </Box>
      </Box>
      
      {/* Order status progress */}
      <Paper 
        variant="outlined" 
        sx={{ 
          mb: theme.spacing(4), 
          p: theme.spacing(3) 
        }}
      >
        <OrderStatusProgress 
          status={orderData!.status}
          createdAt={orderData?.created_at}
          processedAt={orderData?.processed_at}
          shippedAt={orderData?.shipped_at}
          deliveredAt={orderData?.delivered_at}
          estimatedDeliveryDate={orderData?.estimated_delivery_date}
        />
        
        {orderData?.estimated_delivery_date && (
          <Typography variant="body1" align="center" sx={{ mt: theme.spacing(2) }}>
            {t('store.tracking.estimatedDelivery', { date: formatDate(orderData.estimated_delivery_date) })}
          </Typography>
        )}
      </Paper>
      
      {/* Order details grid */}
      <Grid container spacing={3} sx={{ mb: theme.spacing(4) }}>
        {/* Shipping Address */}
        <Grid item xs={12} sm={6} md={3}>
          <AddressCard 
            address={orderData!.shipping_address} 
            title={t('store.confirmation.shippingAddressTitle')}
          />
        </Grid>
        
        {/* Billing Address */}
        <Grid item xs={12} sm={6} md={3}>
          <AddressCard 
            address={orderData!.billing_address} 
            title={t('store.confirmation.billingAddressTitle')}
          />
        </Grid>
        
        {/* Shipping Method */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('store.confirmation.shippingMethodTitle')}
            </Typography>
            <Paper
              variant="outlined"
              sx={{ 
                p: theme.spacing(2),
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <LocalShippingIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="body1">
                  {orderData!.shipping_method.name}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {orderData!.shipping_method.estimated_delivery_time}
              </Typography>
            </Paper>
          </Box>
        </Grid>
        
        {/* Payment Method */}
        <Grid item xs={12} sm={6} md={3}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('store.confirmation.paymentMethodTitle')}
            </Typography>
            <Paper
              variant="outlined"
              sx={{ 
                p: theme.spacing(2),
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <CreditCardIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="body1">
                  {orderData!.payment_method.name}
                </Typography>
              </Box>
              {orderData!.payment_method.type === 'card' && orderData!.payment_method.last_four && (
                <Typography variant="body2" color="text.secondary">
                  {t('store.checkout.cardEnding', { last4: orderData!.payment_method.last_four })}
                </Typography>
              )}
            </Paper>
          </Box>
        </Grid>
      </Grid>
      
      {/* Order items and summary */}
      <Paper 
        variant="outlined" 
        sx={{ 
          mb: theme.spacing(4), 
          p: theme.spacing(3)
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t('store.tracking.orderItems')}
        </Typography>
        <Divider sx={{ mb: theme.spacing(3) }} />
        
        {/* Order Items */}
        <Box sx={{ mb: theme.spacing(4) }}>
          {/* Header row */}
          <Grid container spacing={2} sx={{ 
            mb: theme.spacing(2),
            fontWeight: 'bold',
            color: theme.palette.text.secondary
          }}>
            <Grid item xs={2} sm={1}></Grid>
            <Grid item xs={7} sm={8}>
              <Typography variant="body2" fontWeight="medium">
                {t('field.product')}
              </Typography>
            </Grid>
            <Grid item xs={1} textAlign="center">
              <Typography variant="body2" fontWeight="medium">
                {t('field.quantity')}
              </Typography>
            </Grid>
            <Grid item xs={2} textAlign="right">
              <Typography variant="body2" fontWeight="medium">
                {t('field.price')}
              </Typography>
            </Grid>
          </Grid>
          
          {orderData!.items.map((item) => (
            <OrderSummaryItem 
              key={item.id} 
              item={item} 
              currency={orderData!.summary.currency} 
            />
          ))}
        </Box>
        
        <Divider sx={{ my: theme.spacing(3) }} />
        
        {/* Order Totals */}
        <Box sx={{ ml: 'auto', width: { xs: '100%', sm: '300px' } }}>
          {/* Subtotal */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            mb: theme.spacing(1)
          }}>
            <Typography variant="body1">
              {t('store.confirmation.subtotal')}
            </Typography>
            <Typography variant="body1">
              {formatCurrency(orderData!.summary.subtotal, orderData!.summary.currency)}
            </Typography>
          </Box>
          
          {/* Shipping */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            mb: theme.spacing(1)
          }}>
            <Typography variant="body1">
              {t('store.confirmation.shipping')}
            </Typography>
            <Typography variant="body1">
              {formatCurrency(orderData!.summary.shipping_cost, orderData!.summary.currency)}
            </Typography>
          </Box>
          
          {/* Tax */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            mb: theme.spacing(1)
          }}>
            <Typography variant="body1">
              {t('store.confirmation.tax')}
            </Typography>
            <Typography variant="body1">
              {formatCurrency(orderData!.summary.tax, orderData!.summary.currency)}
            </Typography>
          </Box>
          
          {/* Discount (if any) */}
          {orderData!.summary.discount > 0 && (
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              mb: theme.spacing(1)
            }}>
              <Typography variant="body1" color="success.main">
                {t('store.confirmation.discount')}
              </Typography>
              <Typography variant="body1" color="success.main">
                -{formatCurrency(orderData!.summary.discount, orderData!.summary.currency)}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: theme.spacing(2) }} />
          
          {/* Grand Total */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            mb: theme.spacing(1),
            fontWeight: 'bold'
          }}>
            <Typography variant="h6">
              {t('store.confirmation.total')}
            </Typography>
            <Typography variant="h6">
              {formatCurrency(orderData!.summary.grand_total, orderData!.summary.currency)}
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Shipment information (conditional) */}
      {orderData!.shipment_tracking && ['SHIPPED', 'DELIVERED'].includes(orderData!.status) && (
        <Paper 
          variant="outlined" 
          sx={{ 
            mb: theme.spacing(4), 
            p: theme.spacing(3)
          }}
        >
          <Typography variant="h6" gutterBottom>
            {t('store.tracking.shipmentTitle')}
          </Typography>
          <Divider sx={{ mb: theme.spacing(3) }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TableContainer>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {t('store.tracking.carrier')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none' }}>
                        <Typography variant="body2">
                          {orderData!.shipment_tracking.carrier}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {t('store.tracking.trackingNumber')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none' }}>
                        {orderData!.shipment_tracking.tracking_url ? (
                          <Link 
                            href={orderData!.shipment_tracking.tracking_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            {orderData!.shipment_tracking.tracking_number}
                          </Link>
                        ) : (
                          <Typography variant="body2">
                            {orderData!.shipment_tracking.tracking_number}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {t('store.tracking.shipDate')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none' }}>
                        <Typography variant="body2">
                          {formatDate(orderData!.shipment_tracking.shipped_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              {orderData!.shipment_tracking.tracking_url && (
                <Button 
                  variant="outlined" 
                  href={orderData!.shipment_tracking.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: theme.spacing(2) }}
                >
                  {t('store.tracking.trackingLink')}
                </Button>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                {t('store.tracking.itemsInShipment')}
              </Typography>
              
              {orderData!.shipment_tracking.items.map((item) => (
                <Box 
                  key={item.id} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: theme.spacing(1)
                  }}
                >
                  <InventoryIcon 
                    fontSize="small" 
                    sx={{ 
                      mr: theme.spacing(1),
                      color: theme.palette.text.secondary
                    }} 
                  />
                  <Typography variant="body2">
                    {item.product_name} {item.variant_name ? `(${item.variant_name})` : ''} - 
                    Qty: {item.quantity}
                  </Typography>
                </Box>
              ))}
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Returns section (conditional) */}
      {orderData!.return_eligibility && (
        <Paper 
          variant="outlined" 
          sx={{ 
            mb: theme.spacing(4), 
            p: theme.spacing(3)
          }}
        >
          <Typography variant="h6" gutterBottom>
            {t('store.tracking.returnTitle')}
          </Typography>
          <Divider sx={{ mb: theme.spacing(3) }} />
          
          {orderData!.return_eligibility.is_eligible ? (
            <>
              <Box sx={{ mb: theme.spacing(3) }}>
                <Typography variant="body1" gutterBottom>
                  {t('store.tracking.returnEligible', { 
                    date: formatDate(orderData!.return_eligibility.eligibility_end_date)
                  })}
                </Typography>
                {orderData!.return_eligibility.days_remaining !== undefined && (
                  <Typography variant="body2" color="text.secondary">
                    {t('store.tracking.returnDaysRemaining', { 
                      days: orderData!.return_eligibility.days_remaining
                    })}
                  </Typography>
                )}
              </Box>
              
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<MonetizationOnIcon />}
              >
                {t('store.tracking.requestReturn')}
              </Button>
            </>
          ) : (
            <Alert severity="info">
              {t('store.tracking.returnNotEligible')}
              {orderData!.return_eligibility.reason && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {orderData!.return_eligibility.reason}
                </Typography>
              )}
            </Alert>
          )}
        </Paper>
      )}
    </Container>
  );
}
