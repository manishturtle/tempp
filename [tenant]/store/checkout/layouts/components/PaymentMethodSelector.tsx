'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Radio, 
  RadioGroup, 
  FormControlLabel,
  Link,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { useParams } from 'next/navigation';
import { useStorePaymentMethods } from '../../../../../../../src/app/hooks/api/store/useStorePaymentMethods';

/**
 * Payment method options
 */
export type PaymentMethod = string;

/**
 * Tax details interface
 */
export interface TaxDetails {
  gstin?: string;
  exemptionCertificate?: File;
  orderNotes?: string;
}

/**
 * Props for the PaymentMethodSelector component
 */
interface PaymentMethodSelectorProps {
  onPaymentMethodSelected: (method: string) => void;
  selectedMethod?: string;
  onPlaceOrder: () => void;
  onTaxDetailsChange?: (taxDetails: TaxDetails) => void;
}

/**
 * Component for selecting a payment method during checkout
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  onPaymentMethodSelected,
  selectedMethod,
  onPlaceOrder,
  onTaxDetailsChange
// Update prop type for selectedMethod to string (not PaymentMethod)
}) => {
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const { data: paymentMethods, isLoading, isError } = useStorePaymentMethods(tenantSlug);
  
  // Show only first 5 records and set first as default
  const limitedPaymentMethods = paymentMethods?.slice(0, 5) || [];
  const defaultSelectedId = limitedPaymentMethods.length > 0 ? limitedPaymentMethods[0].id.toString() : '';
  
  const [paymentMethod, setPaymentMethod] = useState<string>(selectedMethod || defaultSelectedId);

  // Update default selection when data loads
  React.useEffect(() => {
    if (limitedPaymentMethods.length > 0 && !selectedMethod) {
      const firstMethodId = limitedPaymentMethods[0].id.toString();
      setPaymentMethod(firstMethodId);
      onPaymentMethodSelected(firstMethodId);
      console.log('Default selected payment method ID:', firstMethodId);
    }
  }, [limitedPaymentMethods, selectedMethod, onPaymentMethodSelected]);

  const handlePaymentMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const methodId = event.target.value;
    setPaymentMethod(methodId);
    onPaymentMethodSelected(methodId);
    
    // Find the selected method details for logging
    const selectedMethodDetails = limitedPaymentMethods.find(m => m.id.toString() === methodId);
    console.log('Selected payment method ID:', methodId);
    console.log('Selected payment method details:', selectedMethodDetails);
  };

  return (
    <Box>
      <RadioGroup
        value={paymentMethod}
        onChange={handlePaymentMethodChange}
      >
        {isLoading && <div>Loading payment methods...</div>}
        {isError && <div>Error loading payment methods.</div>}
        {limitedPaymentMethods.map((method: any) => (
          <Box key={method.id} mb={1.5}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: paymentMethod === method.id.toString() ? 'primary.main' : 'divider',
                borderRadius: 1,
                backgroundColor: paymentMethod === method.id.toString() ? 'action.hover' : 'background.paper'
              }}
            >
              <FormControlLabel
                value={method.id.toString()}
                control={<Radio />}
                label={method.payment_type_display}
                disabled={!method.is_active || !method.is_visible_on_store}
                sx={{ margin: 0 }}
              />
            </Paper>
          </Box>
        ))}
      </RadioGroup>

      {/* Security Message */}
      <Box display="flex" alignItems="center" mb={2} mt={1.5} gap={0.5}>
        <SecurityIcon color="primary" fontSize="small" />
        <Typography variant="caption" color="text.secondary">
        We protect your payment information using encryption to provide bank-level security.
        </Typography>
      </Box>

      {/* Place Order button removed - now using the combined button in Layout1.tsx */}

      {/* Terms */}
      <Typography variant="caption" color="text.secondary" align="center" mt={1.5} sx={{ display: 'block' }}>
        By continuing, you agree to our
        <Link href="#" color="primary">Privacy Policy</Link>,{' '}
        <Link href="#" color="primary">Refund Policy</Link> and{' '}
        <Link href="#" color="primary">Terms of Service</Link>.
      </Typography>
    </Box>
  );
};

export default PaymentMethodSelector;
