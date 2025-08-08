'use client';

/**
 * WalletTransactionItem Component
 * 
 * A component to display a single wallet transaction in the list/table
 */
import React from 'react';
import { 
  TableRow, 
  TableCell, 
  Typography, 
  Chip, 
  Link as MuiLink,
  Box
} from '@mui/material';
import Link from 'next/link';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useTranslation } from 'react-i18next';
import { WalletTransaction } from '@/app/types/store/walletTypes';

interface WalletTransactionItemProps {
  /**
   * Transaction data to display
   */
  transaction: WalletTransaction;
}

/**
 * Determines the color for the transaction type chip
 * 
 * @param type - The transaction type
 * @returns The color and variant for the chip
 */
const getChipProps = (type: string): { 
  color: 'primary' | 'error' | 'success' | 'info' | 'warning' | 'secondary'; 
  variant: 'filled' | 'outlined' 
} => {
  switch (type) {
    case 'recharge':
      return { color: 'primary', variant: 'filled' };
    case 'order_payment':
      return { color: 'error', variant: 'filled' };
    case 'refund':
      return { color: 'success', variant: 'filled' };
    case 'bonus':
      return { color: 'secondary', variant: 'filled' };
    case 'adjustment':
      return { color: 'warning', variant: 'filled' };
    default:
      return { color: 'info', variant: 'filled' };
  }
};

/**
 * WalletTransactionItem component for displaying a single transaction in a table
 * 
 * @param {WalletTransactionItemProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const WalletTransactionItem = ({
  transaction
}: WalletTransactionItemProps): React.ReactElement => {
  const { t } = useTranslation();
  
  // Get chip styling based on transaction type
  const chipProps = getChipProps(transaction.type);
  
  return (
    <TableRow 
      sx={(theme) => ({
        cursor: 'default',
        transition: theme.transitions.create(['background-color']),
        '&:hover': {
          backgroundColor: theme.palette.action.hover
        }
      })}
    >
      {/* Date Cell */}
      <TableCell>
        <Typography variant="body2">
          {transaction.date}
        </Typography>
      </TableCell>
      
      {/* Type Cell */}
      <TableCell>
        <Chip 
          label={t(transaction.typeTextKey)} 
          size="small" 
          {...chipProps}
        />
      </TableCell>
      
      {/* Details/Notes Cell */}
      <TableCell>
        <Typography variant="body2">
          {transaction.details}
        </Typography>
        
        {transaction.relatedEntity && (
          <Box sx={(theme) => ({ 
            display: 'flex', 
            alignItems: 'center', 
            mt: theme.spacing(0.5) 
          })}>
            <Link 
              href={transaction.relatedEntity.url} 
              passHref 
              legacyBehavior
            >
              <MuiLink 
                variant="caption" 
                sx={(theme) => ({ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: theme.palette.primary.main,
                  cursor: 'pointer',
                  transition: theme.transitions.create(['color']),
                  '&:hover': {
                    color: theme.palette.primary.dark,
                    textDecoration: 'none'
                  }
                })}
              >
                {transaction.relatedEntity.displayText}
                <ArrowForwardIosIcon 
                  fontSize="inherit" 
                  sx={(theme) => ({ 
                    ml: theme.spacing(0.5), 
                    fontSize: '0.7rem',
                    transition: theme.transitions.create(['transform']),
                    '.MuiLink-root:hover &': {
                      transform: 'translateX(2px)'
                    }
                  })} 
                />
              </MuiLink>
            </Link>
          </Box>
        )}
        
        {transaction.notes && (
          <Typography 
            variant="caption" 
            color="text.secondary" 
            display="block"
            sx={(theme) => ({ mt: theme.spacing(0.5) })}
          >
            {transaction.notes}
          </Typography>
        )}
      </TableCell>
      
      {/* Amount Cell */}
      <TableCell align="right">
        <Typography 
          variant="body1" 
          fontWeight="medium" 
          color={transaction.isCredit ? 'success.main' : 'error.main'}
          sx={(theme) => ({
            transition: theme.transitions.create(['color', 'transform']),
            '.MuiTableRow-root:hover &': {
              transform: 'scale(1.05)'
            }
          })}
        >
          {transaction.amountFormatted}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

export default WalletTransactionItem;
