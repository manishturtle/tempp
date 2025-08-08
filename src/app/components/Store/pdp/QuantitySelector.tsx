'use client';

import React from 'react';
import { Box, Button, TextField, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity?: number;
  minQuantity?: number;
}

/**
 * Component for selecting product quantity with increment/decrement buttons
 * 
 * @param props - Component props
 * @returns React component
 */
export const QuantitySelector = ({
  quantity,
  onQuantityChange,
  maxQuantity,
  minQuantity
}: QuantitySelectorProps): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();

  // Use safe defaults if values aren't provided
  const effectiveMaxQuantity = typeof maxQuantity === 'number' ? maxQuantity : 99;
  const effectiveMinQuantity = typeof minQuantity === 'number' ? minQuantity : 1;

  // Debug logging
  console.log('QuantitySelector:', {
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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = parseInt(event.target.value, 10);
    if (!isNaN(newValue) && newValue >= effectiveMinQuantity && newValue <= effectiveMaxQuantity) {
      onQuantityChange(newValue);
    }
  };

  return (
    <>
      {/* <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        {t('store.product.quantity', 'Quantity')}
      </Typography>
       */}
      <Box
        sx={{
          display: 'flex',
          gap: 1
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleDecrement}
          disabled={quantity <= effectiveMinQuantity}
          aria-label={t('store.product.decrementQuantity', 'Decrement Quantity')}
          sx={{
            minWidth: '40px',
            height: '40px',
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
        
        <TextField
          type="number"
          value={quantity}
          onChange={handleInputChange}
          inputProps={{
            min: effectiveMinQuantity,
            max: effectiveMaxQuantity,
            'aria-label': t('store.product.quantity', 'Quantity'),
            sx: {
              textAlign: 'center',
              padding: theme.spacing(1),
              width: '40px',
              // Hide the up/down arrows (spinner) in number input
              '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              '&[type=number]': {
                MozAppearance: 'textfield', // Firefox
              },
            }
          }}
          sx={{
            width: '70px',
            '& .MuiOutlinedInput-root': {
              height: '40px'
            }
          }}
        />
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleIncrement}
          disabled={quantity >= effectiveMaxQuantity}
          aria-label={t('store.product.incrementQuantity', 'Increment Quantity')}
          sx={{
            minWidth: '40px',
            height: '40px',
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
      </Box>
    </>
  );
};
