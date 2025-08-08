'use client';

import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { ShippingAddressFormData, BillingAddressFormData, ShippingMethod, PaymentMethod } from '@/app/types/store/checkout';
import { formatAddress } from '@/app/utils/formatters';

interface OrderReviewSectionProps {
  isAuthenticated: boolean;
  shippingAddress: ShippingAddressFormData | null;
  billingAddress: BillingAddressFormData | null;
  useShippingAsBilling: boolean;
  selectedPaymentMethod: PaymentMethod | null;
  applyWallet: boolean;
  redeemedPoints: number;
  appliedWalletAmount: number;
  loyaltyDiscountAmount: number;
  isPlacingOrder: boolean;
  orderError: string | null;
  onPlaceOrder: () => void;
}

/**
 * Order Review Section component displaying all selected options and final submit button
 */
export const OrderReviewSection: FC<OrderReviewSectionProps> = ({
  isAuthenticated,
  shippingAddress,
  billingAddress,
  useShippingAsBilling,
  selectedPaymentMethod,
  applyWallet,
  redeemedPoints,
  appliedWalletAmount,
  loyaltyDiscountAmount,
  isPlacingOrder,
  orderError,
  onPlaceOrder
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // Check if all required information is present
  // Note: Shipping method and payment method requirements temporarily relaxed
  const canPlaceOrder = 
    shippingAddress && 
    (useShippingAsBilling || billingAddress);
    // No longer requiring shipping method or payment method selection
    // selectedShippingMethod &&  // Temporarily disabled
    // selectedPaymentMethod;  // Temporarily disabled

  // Determine the payment breakdown for display
  const hasWalletPayment = applyWallet && appliedWalletAmount > 0;
  const hasLoyaltyPayment = redeemedPoints > 0 && loyaltyDiscountAmount > 0;
  const hasCardOrPaypalPayment = selectedPaymentMethod && 
    ['card', 'paypal'].includes(selectedPaymentMethod.type);

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius
      }}
    >
      {/* <Typography variant="h6" gutterBottom>
        {t('store.checkout.reviewOrder')}
      </Typography>
      <Divider sx={{ mb: theme.spacing(3) }} /> */}

      {/* Shipping Address */}
      <Box sx={{ mb: theme.spacing(3) }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('store.checkout.shippingAddressLabel')}
        </Typography>
        {shippingAddress && (
          <Typography variant="body2">
            {formatAddress(shippingAddress)}
          </Typography>
        )}
      </Box>

      {/* Billing Address */}
      <Box sx={{ mb: theme.spacing(3) }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('store.checkout.billingAddressLabel')}
        </Typography>
        {useShippingAsBilling ? (
          <Box>
            <Typography variant="body2">
              {t('store.checkout.sameAsShippingAddress')}
            </Typography>
            {shippingAddress && (
              <Typography variant="body2" color="text.secondary">
                {formatAddress(shippingAddress)}
              </Typography>
            )}
          </Box>
        ) : (
          billingAddress && (
            <Typography variant="body2">
              {formatAddress(billingAddress)}
            </Typography>
          )
        )}
      </Box>

      {/* Shipping Method
      <Box sx={{ mb: theme.spacing(3) }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('store.checkout.shippingMethodLabel')}
        </Typography>
        {selectedShippingMethod && (
          <Box>
            <Typography variant="body2">
              {selectedShippingMethod.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedShippingMethod.estimated_delivery_time}
            </Typography>
          </Box>
        )}
      </Box> */}

      {/* Payment Method */}
      <Box sx={{ mb: theme.spacing(3) }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('store.checkout.paymentMethodTitle')}
        </Typography>
      <Typography variant="body2">
        Pay On Delivery
      </Typography>
      </Box>

      {/* Error message if present */}
      {orderError && (
        <Alert severity="error" sx={{ mb: theme.spacing(3) }}>
          {orderError}
        </Alert>
      )}

      {/* Place Order Button */}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        disabled={!canPlaceOrder || isPlacingOrder}
        onClick={onPlaceOrder}
        sx={{ mt: theme.spacing(2) }}
      >
        {t('store.checkout.placeOrder')}
      </Button>
    </Paper>
  );
};
