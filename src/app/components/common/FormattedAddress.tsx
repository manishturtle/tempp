'use client';

import { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AddressSummary } from '@/app/types/account';

interface FormattedAddressProps {
  address?: AddressSummary | null;
  variant?: 'body1' | 'body2' | 'caption';
  color?: string;
}

/**
 * Displays a formatted address with proper line breaks
 */
export const FormattedAddress: FC<FormattedAddressProps> = ({
  address,
  variant = 'body2',
  color = 'text.primary'
}) => {
  const { t } = useTranslation();

  if (!address) {
    return (
      <Typography variant={variant} color="text.secondary">
        {t('common.notSpecified')}
      </Typography>
    );
  }

  // Use pre-formatted address if available
  if (address.formatted_address) {
    return (
      <Typography variant={variant} color={color} sx={{ whiteSpace: 'pre-line' }}>
        {address.formatted_address}
      </Typography>
    );
  }

  // Format the address manually
  const addressLines = [];
  
  if (address.street_1) {
    addressLines.push(address.street_1);
  }
  
  const cityStateZip = [
    address.city,
    address.state,
    address.postal_code
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) {
    addressLines.push(cityStateZip);
  }
  
  if (address.country) {
    addressLines.push(address.country);
  }
  
  return (
    <Typography variant={variant} color={color} sx={{ whiteSpace: 'pre-line' }}>
      {addressLines.join('\n')}
    </Typography>
  );
};

export default FormattedAddress;
