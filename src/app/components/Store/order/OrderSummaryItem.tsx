'use client';

import { FC } from 'react';
import { Box, Typography, Grid, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { OrderItem, OrderItemResponse } from '@/app/types/store/order';
import { formatCurrency } from '@/app/utils/formatters';

interface OrderSummaryItemProps {
  item: OrderItem | {
    id: string;
    product_id: string;
    product_name: string;
    variant_name?: string;
    image_url?: string;
    price: number;
    quantity: number;
    subtotal: number;
  };
  currency?: string;
}

/**
 * Component for displaying an individual order item in the summary
 */
export const OrderSummaryItem: FC<OrderSummaryItemProps> = ({ 
  item, 
  currency = 'USD' 
}) => {
  const theme = useTheme();
  
  return (
    <Grid container spacing={2} sx={{ 
      mb: theme.spacing(2),
      py: theme.spacing(1),
      borderBottom: `1px solid ${theme.palette.divider}`
    }}>
      {/* Product Image */}
      <Grid item xs={2} sm={1}>
        <Avatar
          src={item.image_url}
          alt={item.product_name}
          variant="rounded"
          sx={{ 
            width: 40, 
            height: 40,
            bgcolor: theme.palette.grey[200]
          }}
        >
          {item.product_name.charAt(0)}
        </Avatar>
      </Grid>
      
      {/* Product Details */}
      <Grid item xs={7} sm={8}>
        <Typography variant="body1" fontWeight="medium" noWrap>
          {item.product_name}
        </Typography>
        {item.variant_name && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {item.variant_name}
          </Typography>
        )}
      </Grid>
      
      {/* Quantity */}
      <Grid item xs={1} textAlign="center">
        <Typography variant="body2">
          {item.quantity}
        </Typography>
      </Grid>
      
      {/* Price */}
      <Grid item xs={2} textAlign="right">
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(item.subtotal, currency)}
        </Typography>
      </Grid>
    </Grid>
  );
};
