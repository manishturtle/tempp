'use client';

import { FC } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { OrderAddress } from '@/app/types/store/order';
import { formatAddress } from '@/app/utils/formatters';

interface AddressCardProps {
  address: OrderAddress;
  title: string;
}

/**
 * Component for displaying an address in a card format
 */
export const AddressCard: FC<AddressCardProps> = ({ 
  address, 
  title 
}) => {
  const theme = useTheme();
  
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Paper
        variant="outlined"
        sx={{ 
          p: theme.spacing(2),
          height: '100%'
        }}
      >
        <Typography variant="body2">
          {address.full_name}
        </Typography>
        <Typography variant="body2">
          {address.address_line1}
        </Typography>
        {address.address_line2 && (
          <Typography variant="body2">
            {address.address_line2}
          </Typography>
        )}
        <Typography variant="body2">
          {`${address.city}, ${address.state} ${address.postal_code}`}
        </Typography>
        <Typography variant="body2">
          {address.country}
        </Typography>
        <Typography variant="body2">
          {address.phone_number}
        </Typography>
        {address.email && (
          <Typography variant="body2">
            {address.email}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
