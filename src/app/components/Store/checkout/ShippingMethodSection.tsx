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
  Button,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ShippingMethod } from '@/app/types/store/checkout';
import { useShippingMethods } from '@/app/hooks/api/store/useShippingMethods';
import Notification from '@/app/components/common/Notification';

interface ShippingMethodSectionProps {
  shippingAddressData: any | null;
  onShippingMethodSelected: (method: ShippingMethod) => void;
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Shipping method selection section for the checkout page
 */
export function ShippingMethodSection({
  shippingAddressData,
  onShippingMethodSelected,
  onNotification
}: ShippingMethodSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  
  const {
    shippingMethods,
    isLoading,
    isError,
    saveShippingMethod
  } = useShippingMethods(shippingAddressData);

  // Set default selected method if available
  useEffect(() => {
    if (shippingMethods && shippingMethods.length > 0) {
      const defaultMethod = shippingMethods.find(method => method.is_default) || shippingMethods[0];
      setSelectedMethodId(defaultMethod.id);
      onShippingMethodSelected(defaultMethod);
    }
  }, [shippingMethods, onShippingMethodSelected]);

  const handleMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const methodId = event.target.value;
    setSelectedMethodId(methodId);
    
    const selectedMethod = shippingMethods?.find(method => method.id === methodId);
    if (selectedMethod) {
      onShippingMethodSelected(selectedMethod);
      
      // Save the selected shipping method
      saveShippingMethod.mutate(selectedMethod, {
        onSuccess: () => {
          onNotification(t('common:store.checkout.shippingMethodSaved'), 'success');
        },
        onError: () => {
          onNotification(t('common:error.savingShippingMethod'), 'error');
        }
      });
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Don't render anything if there are no shipping methods and we're not loading
  if (!isLoading && !isError && (!shippingMethods || shippingMethods.length === 0)) {
    return null;
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: theme.spacing(3),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius
      }}
    >
      <Typography variant="h6" gutterBottom>
        {t('common:store.checkout.shippingMethodTitle')}
      </Typography>
      <Divider sx={{ mb: theme.spacing(3) }} />
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: theme.spacing(4) }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      
      
      {!isLoading && !isError && shippingMethods && shippingMethods.length > 0 && (
        <RadioGroup
          value={selectedMethodId}
          onChange={handleMethodChange}
        >
          {shippingMethods.map((method) => (
            <Paper
              key={method.id}
              sx={{
                mb: theme.spacing(2),
                p: theme.spacing(2),
                border: `1px solid ${selectedMethodId === method.id 
                  ? theme.palette.primary.main 
                  : theme.palette.divider}`,
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': {
                  borderColor: selectedMethodId === method.id 
                    ? theme.palette.primary.main 
                    : theme.palette.primary.light,
                  boxShadow: 1
                }
              }}
            >
              <FormControlLabel
                value={method.id}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ ml: theme.spacing(1) }}>
                    <Typography variant="body1" fontWeight="medium">
                      {method.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('common:store.checkout.estimatedDelivery')}: {method.estimated_delivery_date}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ mt: theme.spacing(1) }}>
                      {formatCurrency(method.price)}
                    </Typography>
                  </Box>
                }
                sx={{ 
                  display: 'flex',
                  m: 0,
                  width: '100%'
                }}
              />
            </Paper>
          ))}
        </RadioGroup>
      )}
      

    </Paper>
  );
}
