'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { Add, MoreVert } from '@mui/icons-material';

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard';
  last4: string;
  isDefault: boolean;
  expires?: string;
}

export const PaymentMethods = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const paymentMethods: PaymentMethod[] = [
    {
      id: '1',
      type: 'visa',
      last4: '4242',
      isDefault: true,
    },
    {
      id: '2',
      type: 'mastercard',
      last4: '8888',
      isDefault: false,
      expires: '05/27',
    },
  ];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cardId: string) => {
    setSelectedCard(cardId);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCard(null);
  };

  const handleSetDefault = () => {
    // Handle set as default logic here
    handleMenuClose();
  };

  const handleRemove = () => {
    // Handle remove card logic here
    handleMenuClose();
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" component="h2">
            Payment Methods
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            size="small"
            onClick={() => {}}
          >
            Add New
          </Button>
        </Box>

        <Box display="flex" flexDirection="column" gap={2}>
          {paymentMethods.map((method) => (
            <Box
              key={method.id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              p={2}
              border={1}
              borderColor="divider"
              borderRadius={1}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar
                  src={
                    method.type === 'visa'
                      ? '/visa-logo.png'
                      : '/mastercard-logo.png'
                  }
                  variant="square"
                  sx={{ width: 40, height: 'auto' }}
                />
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {method.type.charAt(0).toUpperCase() + method.type.slice(1)} ending in {method.last4}
                  </Typography>
                  {method.isDefault ? (
                    <Typography variant="body2" color="success.main">
                      ✓ Default
                    </Typography>
                  ) : method.expires ? (
                    <Typography variant="body2" color="text.secondary">
                      Expires {method.expires}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
              <Box>
                {method.isDefault ? (
                  <IconButton onClick={(e) => handleMenuOpen(e, method.id)}>
                    <MoreVert />
                  </IconButton>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSetDefault}
                  >
                    Set Default
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl && selectedCard)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleSetDefault}>Set as default</MenuItem>
        <MenuItem onClick={handleRemove}>Remove card</MenuItem>
      </Menu>
    </Card>
  );
};
