'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  FormHelperText
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  PaymentMethod, 
  SavePaymentMethodPayload 
} from '@/app/types/store/checkout';
import { isFeatureEnabled, WALLET, LOYALTY } from '@/app/utils/featureFlags';
import { useAuth } from '@/app/hooks/useAuth';
import { CardPaymentForm } from './payment/CardPaymentForm';
import { PaypalPaymentForm } from './payment/PaypalPaymentForm';

interface PaymentMethodSectionProps {
  clientId: string;
  tenantConfig: Record<string, any> | null | undefined;
  onPaymentMethodChange: (
    methodId: string,
    applyWallet: boolean,
    redeemedPoints: number,
    loyaltyDiscountAmount: number,
    walletAmount: number
  ) => void;
  onProceedToReview?: () => void; // Added prop to handle proceeding to review
}

/**
 * Payment Method Section component for the checkout page
 * Handles selection of payment methods, wallet funds, and loyalty points
 */
export function PaymentMethodSection({
  clientId,
  tenantConfig,
  onPaymentMethodChange,
  onProceedToReview
}: PaymentMethodSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isAuthenticated, user } = useAuth();
  
  // State for payment method selection
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [applyWallet, setApplyWallet] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<string>('');
  const [appliedPoints, setAppliedPoints] = useState<number>(0);
  const [loyaltyDiscountAmount, setLoyaltyDiscountAmount] = useState<number>(0);
  const [useShippingAsBilling, setUseShippingAsBilling] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    open: boolean;
  }>({ message: '', type: 'info', open: false });
  
  // Check if features are enabled
  const isWalletEnabled = isFeatureEnabled(WALLET, clientId, tenantConfig);
  const isLoyaltyEnabled = isFeatureEnabled(LOYALTY, clientId, tenantConfig);
  
  // Payment methods data - only including Pay in Delivery
  const paymentMethods = [
    {
      id: 'cod',
      code: 'cod',
      name: 'Pay On Delivery',
      description: 'Pay when you receive your order',
      is_default: true,
      type: 'cod',
      requires_additional_info: false
    }
  ] as PaymentMethod[];

  // Hardcoded wallet and loyalty points balance
  const walletBalance = { balance: 500, currency: 'USD' };
  const loyaltyPointsBalance = { points: 1000, currency: 'USD', value_per_point: 0.1 };
  const isLoadingPaymentMethods = false;
  const isErrorPaymentMethods = false;
  const isLoadingWallet = false;
  const isLoadingLoyalty = false;

  // Mock save payment method function
  const savePaymentMethod = {
    mutate: (data: any) => {
      console.log('Saving payment method:', data);
      return Promise.resolve({ success: true });
    }
  };
  
  // Set default payment method when component mounts
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.find(method => method.is_default) || paymentMethods[0];
      setSelectedPaymentMethodId(defaultMethod.id);
    }
  }, []); // Only run once on mount
  
  // Handle payment method selection
  const handlePaymentMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const methodId = event.target.value;
    setSelectedPaymentMethodId(methodId);
    
    // Reset wallet and loyalty points when changing payment method
    setApplyWallet(false);
    setPointsToRedeem('');
    setAppliedPoints(0);
    setLoyaltyDiscountAmount(0);
    
    // Find the selected payment method
    const selectedMethod = paymentMethods.find(method => method.id === methodId);
    
    // Notify parent component of payment method change
    onPaymentMethodChange(methodId, false, 0, 0, 0);
    
    // Automatically proceed to review after a short delay
    setTimeout(() => {
      if (onProceedToReview) {
        onProceedToReview();
      }
    }, 500);
  };
  
  // Handle wallet toggle
  const handleWalletToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApplyWallet(event.target.checked);
  };
  
  // Handle loyalty points input
  const handlePointsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const maxPoints = loyaltyPointsBalance?.points || 0;
    
    // Make sure it's a valid number
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxPoints) {
      setPointsToRedeem(value);
    } else if (value === '') {
      setPointsToRedeem('');
    }
  };
  
  // Apply loyalty points
  const handleApplyPoints = () => {
    if (loyaltyPointsBalance && pointsToRedeem) {
      const points = parseInt(pointsToRedeem, 10);
      if (points <= 0 || points > loyaltyPointsBalance.points) {
        setNotification({
          message: t('common:store.checkout.invalidPointsAmount'),
          type: 'error',
          open: true
        });
        return;
      }
      
      // Calculate discount amount (hardcoded conversion rate of 0.1)
      const discount = points * 0.1; // $0.10 per point
      
      setAppliedPoints(points);
      setLoyaltyDiscountAmount(discount);
      
      setNotification({
        message: t('common:store.checkout.pointsApplied', { 
          points, 
          value: formatCurrency(discount, loyaltyPointsBalance.currency) 
        }),
        type: 'success',
        open: true
      });
    }
  };
  
  // Handle billing address selection
  const handleBillingAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseShippingAsBilling(event.target.value === 'same');
  };
  
  // Format currency for display
  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency 
    }).format(amount);
  };
  
  // Determine which payment method form to render
  const renderPaymentMethodForm = () => {
    if (!selectedPaymentMethodId || !paymentMethods) return null;
    
    const selectedMethod = paymentMethods.find(method => method.id === selectedPaymentMethodId);
    if (!selectedMethod || !selectedMethod.requires_additional_info) return null;
    
    switch (selectedMethod.type) {
      case 'card':
        return <CardPaymentForm />;
      case 'paypal':
        return <PaypalPaymentForm />;
      default:
        return null;
    }
  };
  
  // Loading state
  if (isLoadingPaymentMethods) {
    return (
      <Paper 
        elevation={0}
        sx={{ 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px'
        }}
      >
        <CircularProgress size={24} />
      </Paper>
    );
  }
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius
      }}
    >
      {/* Error state */}
      {isErrorPaymentMethods && (
        <Alert severity="error" sx={{ mb: theme.spacing(2) }}>
          {t('store.checkout.errorLoadingPaymentMethods')}
        </Alert>
      )}
      
      {/* Wallet section */}
      {isAuthenticated && 
       isWalletEnabled && 
       walletBalance && 
       walletBalance.balance > 0 && (
        <Box sx={{ mb: theme.spacing(3) }}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={applyWallet}
                onChange={handleWalletToggle}
              />
            }
            label={
              <Typography variant="body1">
                {t('store.checkout.useWalletBalance', {
                  balance: formatCurrency(walletBalance.balance, walletBalance.currency)
                })}
              </Typography>
            }
          />
        </Box>
      )}
      
      {/* Loyalty points section */}
      {isAuthenticated && 
       isLoyaltyEnabled && 
       loyaltyPointsBalance && 
       loyaltyPointsBalance.points > 0 && (
        <Box sx={{ mb: theme.spacing(3) }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('store.checkout.availableLoyaltyPoints', {
              points: loyaltyPointsBalance.points
            })}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1 }}>
            <TextField
              label={t('store.checkout.redeemPoints')}
              value={pointsToRedeem}
              onChange={handlePointsInputChange}
              type="number"
              size="small"
              InputProps={{
                inputProps: { min: 0, max: loyaltyPointsBalance.points }
              }}
              sx={{ width: '150px' }}
            />
            
            <Button 
              variant="outlined"
              onClick={handleApplyPoints}
              disabled={!pointsToRedeem || parseInt(pointsToRedeem, 10) <= 0}
            >
              {t('store.checkout.applyPoints')}
            </Button>
          </Box>
          
          {appliedPoints > 0 && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {t('store.checkout.appliedPointsValue', {
                points: appliedPoints,
                value: formatCurrency(loyaltyDiscountAmount, loyaltyPointsBalance.currency)
              })}
            </Alert>
          )}
        </Box>
      )}
      
      {/* Payment methods section */}
      {paymentMethods && paymentMethods.length > 0 && (
        <>
          <RadioGroup
            value={selectedPaymentMethodId}
            onChange={handlePaymentMethodChange}
          >
            {paymentMethods.map(method => (
              <Box 
                key={method.id}
                sx={{
                  mb: 2,
                  p: 2,
                  border: `1px solid ${
                    selectedPaymentMethodId === method.id 
                      ? theme.palette.primary.main 
                      : theme.palette.divider
                  }`,
                  borderRadius: 1,
                  '&:hover': {
                    borderColor: theme.palette.primary.light
                  },
                  bgcolor: 'background.paper'
                }}
              >
                <FormControlLabel
                  value={method.id}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">
                        {t(`store.checkout.paymentMethods.${method.code}`, {
                          defaultValue: method.name
                        })}
                      </Typography>
                      {method.description && (
                        <Typography variant="body2" color="text.secondary">
                          {method.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Box>
            ))}
          </RadioGroup>
          
          {/* {renderPaymentMethodForm()} */}
        </>
      )}
      
      {/* Billing address section */}
      {/* <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('store.checkout.billingAddressTitle')}
        </Typography>
        
        <RadioGroup
          value={useShippingAsBilling ? 'same' : 'different'}
          onChange={handleBillingAddressChange}
        >
          <FormControlLabel
            value="same"
            control={<Radio />}
            label={t('store.checkout.sameAsShippingAddress')}
          />
          
          <FormControlLabel
            value="different"
            control={<Radio />}
            label={t('store.checkout.differentBillingAddress')}
          />
        </RadioGroup>
      </Box> */}
      
      {/* Proceed button */}
      {selectedPaymentMethodId && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => {
              // Show success notification
              setNotification({
                message: t('store.checkout.proceedToReview'),
                type: 'success',
                open: true
              });
              
              // Call the onProceedToReview callback to open the review section
              if (onProceedToReview) {
                onProceedToReview();
              }
            }}
          >
            {t('common:store.checkout.proceedToReview')}
          </Button>
        </Box>
      )}

      {/* Notification */}
      {notification.open && (
        <Alert 
          severity={notification.type}
          sx={{ mt: 2 }}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      )}
    </Paper>
  );
}
