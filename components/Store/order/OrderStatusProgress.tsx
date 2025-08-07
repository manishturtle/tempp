'use client';

import { FC } from 'react';
import { Box, Typography, LinearProgress, Stepper, Step, StepLabel, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { OrderStatus } from '@/app/types/store/order';
import { useTranslation } from 'react-i18next';

interface OrderStatusProgressProps {
  status: OrderStatus;
  createdAt?: string;
  processedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryDate?: string;
}

/**
 * Component for displaying order status progress
 */
export const OrderStatusProgress: FC<OrderStatusProgressProps> = ({
  status,
  createdAt,
  processedAt,
  shippedAt,
  deliveredAt,
  estimatedDeliveryDate,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Define the order statuses in sequence
  const orderStatuses: OrderStatus[] = ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  
  // Determine the active step based on current status
  const getActiveStep = (): number => {
    if (status === 'CANCELLED') return -1;
    if (status === 'RETURNED') return orderStatuses.length; // After delivery
    
    const statusIndex = orderStatuses.indexOf(status);
    return statusIndex >= 0 ? statusIndex : 0;
  };
  
  const activeStep = getActiveStep();
  
  // Calculate progress percentage for the LinearProgress
  const calculateProgress = (): number => {
    if (status === 'CANCELLED') return 0;
    if (status === 'RETURNED') return 100;
    
    const totalSteps = orderStatuses.length - 1; // -1 because we count gaps between steps
    const normalizedStep = Math.min(Math.max(activeStep, 0), totalSteps);
    return (normalizedStep / totalSteps) * 100;
  };
  
  // Format dates for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Get display label for each status
  const getStatusLabel = (status: OrderStatus): string => {
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
  
  // Get date for each status step
  const getDateForStatus = (stepStatus: OrderStatus): string => {
    switch (stepStatus) {
      case 'PLACED':
        return formatDate(createdAt);
      case 'PROCESSING':
        return formatDate(processedAt);
      case 'SHIPPED':
        return formatDate(shippedAt);
      case 'DELIVERED':
        return formatDate(deliveredAt);
      default:
        return '';
    }
  };
  
  // Handle cancelled or returned orders
  if (status === 'CANCELLED' || status === 'RETURNED') {
    return (
      <Box sx={{ mb: theme.spacing(4) }}>
        <Typography variant="h6" gutterBottom>
          {t('store.tracking.statusTitle')}
        </Typography>
        <Box sx={{ 
          p: theme.spacing(2), 
          bgcolor: status === 'CANCELLED' ? theme.palette.error.light : theme.palette.info.light,
          borderRadius: theme.shape.borderRadius,
          color: status === 'CANCELLED' ? theme.palette.error.contrastText : theme.palette.info.contrastText
        }}>
          <Typography variant="subtitle1">
            {status === 'CANCELLED' 
              ? t('store.tracking.cancelled') 
              : t('store.tracking.returned')}
          </Typography>
          {(status === 'RETURNED' && deliveredAt) && (
            <Typography variant="body2">
              {t('store.tracking.delivered')}: {formatDate(deliveredAt)}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }
  
  return (
    <Box sx={{ mb: theme.spacing(4) }}>
      <Typography variant="h6" gutterBottom>
        {t('store.tracking.statusTitle')}
      </Typography>
      
      {/* Linear progress indicator */}
      <LinearProgress 
        variant="determinate" 
        value={calculateProgress()} 
        sx={{ 
          mb: theme.spacing(2),
          height: 10,
          borderRadius: 5
        }}
      />
      
      {/* Order status steps */}
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel={!isMobile}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        sx={{ mt: theme.spacing(2) }}
      >
        {orderStatuses.map((stepStatus, index) => {
          const date = getDateForStatus(stepStatus);
          const isEstimated = 
            (stepStatus === 'DELIVERED' && !deliveredAt && estimatedDeliveryDate);
          
          return (
            <Step key={stepStatus}>
              <StepLabel>
                <Typography variant="body2" fontWeight="medium">
                  {getStatusLabel(stepStatus)}
                </Typography>
                {(date || (isEstimated && estimatedDeliveryDate)) && (
                  <Typography variant="caption" color="text.secondary">
                    {isEstimated 
                      ? `${t('store.tracking.expectedDelivery', { date: formatDate(estimatedDeliveryDate) })}` 
                      : date
                    }
                  </Typography>
                )}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
};
