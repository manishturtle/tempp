'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Stack,
  Tooltip,
  CircularProgress,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grid,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PublicIcon from '@mui/icons-material/Public';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import { Address } from '@/app/types/store/addressTypes';

/**
 * Props for AddressCard component
 */
interface AddressCardProps {
  /** Address data to display */
  address: Address;
  /** Callback for editing the address */
  onEdit: (address: Address) => void;
  /** Callback for deleting the address */
  onDelete: (addressId: string) => void;
  /** Callback for setting the address as default shipping */
  onSetDefaultShipping?: (addressId: string) => void;
  /** Callback for setting the address as default billing */
  onSetDefaultBilling?: (addressId: string) => void;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
}

/**
 * Renders a key-value pair for address details.
 */
const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <Grid item xs={12}>
    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
      <Typography component="span" fontWeight="medium" color="text.primary" sx={{ fontSize: '0.8125rem' }}>
        {label}:
      </Typography>{' '}
      {value}
    </Typography>
  </Grid>
);

/**
 * AddressCard component
 * Displays a single address with a compact, icon-driven, key-value pair UI.
 *
 * @param {AddressCardProps} props - Component props
 * @returns {React.ReactElement} The AddressCard component
 */
export const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefaultShipping,
  onSetDefaultBilling,
  isLoading = false,
}: AddressCardProps): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const handleDelete = () => {
    onDelete(String(address.id));
  };

  const handleEdit = () => {
    onEdit(address);
  };

  const isDefault = address.isDefaultShipping || address.isDefaultBilling;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${
          isDefault ? theme.palette.primary.main : theme.palette.divider
        }`,
        transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[3],
          borderColor: theme.palette.primary.light,
        },
      }}
    >
      <CardContent sx={{ p: 2, flexGrow: 1, position: 'relative' }}>
        {/* --- Header: Name, Chips, Actions --- */}
        <Box sx={{ mb: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" component="div" sx={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                  {address.fullName}
                </Typography>
                {address.isDefaultShipping && (
                  <Chip
                    label={t('addressBook.defaultShippingShort', 'Default')}
                    color="success"
                    size="small"
                    sx={{ '& .MuiButton-startIcon': { mr: 0.5 }, fontSize: '0.75rem' }}
                  />
                )}
                {address.isDefaultBilling && (
                  <Chip
                    label={t('addressBook.defaultBillingShort', 'Default')}
                    color="info"
                    size="small"
                    sx={{ '& .MuiButton-startIcon': { mr: 0.5 }, fontSize: '0.75rem' }}
                  />
                )}
                {!address.isDefaultShipping && onSetDefaultShipping && (
                  <Button
                    size="small"
                    sx={{ '& .MuiButton-startIcon': { mr: 0.5 }, fontSize: '0.75rem' }}
                    onClick={() => onSetDefaultShipping(String(address.id))}
                    disabled={isLoading}
                    variant="outlined"
                    sx={{ p: '2px 8px' }}
                  >
                    {isLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      t('addressBook.setShipping', 'Set Default')
                    )}
                  </Button>
                )}
                {!address.isDefaultBilling && onSetDefaultBilling && (
                  <Button
                    size="small"
                    sx={{ '& .MuiButton-startIcon': { mr: 0.5 }, fontSize: '0.75rem' }}
                    onClick={() => onSetDefaultBilling(String(address.id))}
                    disabled={isLoading}
                    variant="text"
                    sx={{ p: '2px 8px' }}
                  >
                    {isLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      t('addressBook.setBilling', 'Set Default')
                    )}
                  </Button>
                )}
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={t('common.edit', 'Edit')}>
                <IconButton
                  aria-label={t('common.edit', 'Edit')}
                  onClick={handleEdit}
                  size="small"
                  sx={{ mt: -0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete', 'Delete')}>
                <IconButton
                  aria-label={t('common.delete', 'Delete')}
                  onClick={handleDelete}
                  size="small"
                  sx={{ mt: -0.5, color: theme.palette.error.main }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        </Box>

        {/* --- Body: Address Details --- */}
        <Grid container spacing={1}>
          <DetailRow
            label={t('addressBook.address', 'Address')}
            value={address.addressLine1}
          />
          {address.addressLine2 && (
            <DetailRow
              label={t('addressBook.address2', 'Address 2')}
              value={address.addressLine2}
            />
          )}
          <DetailRow
            label={t('addressBook.city', 'City')}
            value={`${address.city}`}
          />
          <DetailRow
            label={t('addressBook.state', 'State')}
            value={`${address.state}`}
          />
          <DetailRow
            label={t('addressBook.country', 'Country')}
            value={address.country}
          />
          <DetailRow
            label={t('addressBook.postalCode', 'Postal Code')}
            value={address.postalCode}
          />
          <DetailRow
            label={t('addressBook.phone', 'Phone')}
            value={address.phoneNumber}
          />
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AddressCard;