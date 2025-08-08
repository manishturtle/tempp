'use client';

/**
 * LoyaltyTransactionItem Component
 * 
 * A component to display a single loyalty transaction in a table row.
 */
import React from 'react';
import { 
  TableCell, 
  TableRow, 
  Typography, 
  Chip, 
  IconButton,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { LoyaltyTransaction } from '@/app/types/store/loyaltyTypes';

/**
 * Props for the LoyaltyTransactionItem component
 */
interface LoyaltyTransactionItemProps {
  /**
   * The transaction to display
   */
  transaction: LoyaltyTransaction;
}

/**
 * Determines the color to use for the transaction type chip
 * 
 * @param {LoyaltyTransactionType} type - The transaction type
 * @returns {string} The MUI color to use for the chip
 */
const getChipColor = (type: string): "success" | "primary" | "warning" | "info" => {
  switch (type) {
    case 'earned':
      return 'success';
    case 'redeemed':
      return 'primary';
    case 'expired':
      return 'warning';
    case 'adjustment':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * Determines if the chip should have a variant applied
 * 
 * @param {string} type - The transaction type
 * @returns {ChipProps['variant']} The variant to use for the chip
 */
const getChipVariant = (type: string): 'filled' | 'outlined' => {
  return type === 'expired' ? 'outlined' : 'filled';
};

/**
 * LoyaltyTransactionItem component displays a single loyalty transaction in a table row
 * 
 * @param {LoyaltyTransactionItemProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const LoyaltyTransactionItem = ({
  transaction,
}: LoyaltyTransactionItemProps): React.ReactElement => {
  const { t } = useTranslation();
  
  return (
    <TableRow 
      hover
      sx={(theme) => ({
        '& td': {
          transition: theme.transitions.create(['background-color']),
        }
      })}
    >
      {/* Date */}
      <TableCell>
        <Typography variant="body2">
          {transaction.date}
        </Typography>
      </TableCell>
      
      {/* Type */}
      <TableCell>
        <Chip 
          label={t(transaction.typeTextKey)}
          size="small"
          color={getChipColor(transaction.type)}
          variant={getChipVariant(transaction.type)}
        />
      </TableCell>
      
      {/* Details */}
      <TableCell>
        <Typography variant="body2">
          {transaction.details}   {transaction.relatedOrderUrl && (
          <Link href={transaction.relatedOrderUrl} passHref>
            <IconButton
              aria-label={t('loyalty.history.viewOrderTooltip')}
              size="small"
              color="primary"
              sx={(theme) => ({
                ml: 1,
                p: 0.5,
                transition: theme.transitions.create(['color', 'background-color']),
              })}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Link>
        )}
        </Typography>
      
      </TableCell>
      
      {/* Points Change */}
      <TableCell align="right">
        <Typography 
          variant="body1" 
          fontWeight="medium"
          color={transaction.isCredit ? 'success.main' : 'error.main'}
        >
          {transaction.pointsChangeFormatted}
        </Typography>
      </TableCell>
      
      {/* Expiry Date */}
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {transaction.expiryDate || '-'}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

export default LoyaltyTransactionItem;
