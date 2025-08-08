'use client';

import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

interface VerticalQuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity?: number;
  minQuantity?: number;
}

/**
 * Vertical quantity selector component for mobile views
 * Shows increment/decrement buttons stacked vertically with quantity in the middle
 * 
 * @param props - Component props
 * @returns React component
 */
export const VerticalQuantitySelector = ({
  quantity,
  onQuantityChange,
  maxQuantity,
  minQuantity
}: VerticalQuantitySelectorProps): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  // Use safe defaults if values aren't provided
  const effectiveMaxQuantity = typeof maxQuantity === 'number' ? maxQuantity : 99;
  const effectiveMinQuantity = typeof minQuantity === 'number' ? minQuantity : 1;

  // Debug logging
  console.log('VerticalQuantitySelector:', {
    quantity,
    maxQuantity,
    minQuantity,
    effectiveMaxQuantity,
    effectiveMinQuantity,
    incrementDisabled: quantity >= effectiveMaxQuantity,
    decrementDisabled: quantity <= effectiveMinQuantity
  });

  const handleIncrement = (): void => {
    if (quantity < effectiveMaxQuantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = (): void => {
    if (quantity > effectiveMinQuantity) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '40px',
      }}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={handleIncrement}
        disabled={quantity >= effectiveMaxQuantity}
        aria-label={t('store.product.incrementQuantity', 'Increment Quantity')}
        sx={{
          minWidth: '32px',
          width: '32px',
          height: '32px',
          padding: 0,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main
          }
        }}
      >
        <AddIcon fontSize="small" />
      </Button>
      
      <Typography 
        variant="body2" 
        sx={{ 
          py: 0.5,
          fontWeight: 'medium',
          textAlign: 'center'
        }}
      >
        {quantity}
      </Typography>
      
      <Button
        variant="outlined"
        size="small"
        onClick={handleDecrement}
        disabled={quantity <= effectiveMinQuantity}
        aria-label={t('store.product.decrementQuantity', 'Decrement Quantity')}
        sx={{
          minWidth: '32px',
          width: '32px',
          height: '32px',
          padding: 0,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main
          }
        }}
      >
        <RemoveIcon fontSize="small" />
      </Button>
    </Box>
  );
};

export default VerticalQuantitySelector;
