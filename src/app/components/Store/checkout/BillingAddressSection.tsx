'use client';

import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  Button,
} from '@mui/material';
import { SavedAddressSelector } from './SavedAddressSelector';
import { ShippingAddressForm } from './ShippingAddressForm';
import { SavedAddress, BillingAddressFormData } from '@/app/types/store/checkout';

interface BillingAddressSectionProps {
  isAuthenticated: boolean;
  savedAddresses: SavedAddress[] | undefined;
  isLoadingAddresses: boolean;
  useShippingAsBilling: boolean;
  onUseShippingChange: (useShipping: boolean) => void;
  selectedBillingAddressId: string | null;
  onAddressSelect: (addressId: string | null) => void;
  onSubmitNewAddress: (data: BillingAddressFormData) => void;
  isSubmitting?: boolean;
}

/**
 * Billing address section component for the checkout page
 * Allows users to use shipping address or enter a new billing address
 */
export const BillingAddressSection: FC<BillingAddressSectionProps> = ({
  isAuthenticated,
  savedAddresses,
  isLoadingAddresses,
  useShippingAsBilling,
  onUseShippingChange,
  selectedBillingAddressId,
  onAddressSelect,
  onSubmitNewAddress,
  isSubmitting = false,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius
      }}
    >
      {/* <Typography variant="h6" gutterBottom>
        {t('common:store.checkout.billingInformation')}
      </Typography> */}

      <FormControlLabel
        control={
          <Checkbox
            checked={useShippingAsBilling}
            onChange={(e) => onUseShippingChange(e.target.checked)}
            size="small"
          />
        }
        label={t('common:store.checkout.sameBillingAddress')}
        sx={{ mb: theme.spacing(2) }}
      />

      {!useShippingAsBilling && (
        <Box sx={{ mt: theme.spacing(2) }}>
          {/* Show saved addresses for authenticated users - filter to show only billing addresses */}
          {isAuthenticated && savedAddresses && savedAddresses.filter(address => address.address_type === 'BILLING').length > 0 && (
            <SavedAddressSelector
              addresses={savedAddresses.filter(address => address.address_type === 'BILLING')}
              selectedAddressId={selectedBillingAddressId}
              onChange={onAddressSelect}
              isLoading={isLoadingAddresses}
            />
          )}

          {/* Show form for new address */}
          <Box sx={{ mt: theme.spacing(3) }}>
            {isAuthenticated && savedAddresses && savedAddresses.length > 0 && selectedBillingAddressId === null && (
              <Typography variant="subtitle1" gutterBottom>
                {t('common:store.checkout.useNewAddress')}
              </Typography>
            )}
            
            {/* Only show the form if no saved address is selected */}
            {(!isAuthenticated || !selectedBillingAddressId) && (
              <ShippingAddressForm
                onSubmit={(data) => onSubmitNewAddress(data)}
                isAuthenticated={isAuthenticated}
                formId="billing-address-form" /* Use a dedicated form ID for billing */
              />
            )}
          </Box>
        </Box>
      )}
      
      {/* Continue to Payment button */}
      <Box sx={{ mt: theme.spacing(4) }}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth
          onClick={() => {
            // Case 1: Using shipping address as billing
            if (useShippingAsBilling) {
              onSubmitNewAddress({} as BillingAddressFormData);
              return;
            }
            
            // Case 2: Selected an existing address
            if (selectedBillingAddressId) {
              // Create a proper payload for existing address selection
              // Cast to unknown first to avoid TypeScript errors
              onSubmitNewAddress({ 
                address_id: selectedBillingAddressId,
                use_saved_address: true 
              } as unknown as BillingAddressFormData);
              return;
            }
            
            // Case 3: New address - let the form submit handle it
            // The form will be submitted if no existing address is selected
            if (!selectedBillingAddressId) {
              const formElement = document.getElementById('billing-address-form') as HTMLFormElement;
              if (formElement) {
                formElement.requestSubmit();
              }
            }
          }}
          disabled={isSubmitting || 
            (!useShippingAsBilling && !selectedBillingAddressId && !isAuthenticated)}
        >
          {t('common:store.checkout.continueToPayment')}
        </Button>
      </Box>
    </Paper>
  );
};
