'use client';

import { useTranslation } from 'react-i18next';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * PayPal payment form component
 * This is a placeholder for a real PayPal integration
 * In a real implementation, this would use the PayPal SDK
 */
export function PaypalPaymentForm() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t('common:store.checkout.paypalInformation')}
      </Typography>
      
      <Box 
        sx={{ 
          p: theme.spacing(3), 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          bgcolor: theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Button
          variant="contained"
          sx={{ 
            bgcolor: '#0070ba',
            '&:hover': {
              bgcolor: '#005ea6'
            },
            color: 'white',
            px: 4
          }}
        >
          {t('common:store.checkout.payWithPaypal')}
        </Button>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('common:store.checkout.paypalRedirectInfo')}
        </Typography>
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {t('common:store.checkout.securePaymentInfo')}
      </Typography>
    </Box>
  );
}
