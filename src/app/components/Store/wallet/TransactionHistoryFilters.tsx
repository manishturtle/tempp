'use client';

/**
 * TransactionHistoryFilters Component
 * 
 * A component for filtering transaction history by type and date range
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Stack, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl,
  SelectChangeEvent
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface TransactionHistoryFiltersProps {
  /**
   * Callback function triggered when filters change
   */
  onFiltersChange: (filters: { transactionType: string; dateRange: string }) => void;
  
  /**
   * Initial filter values
   */
  initialFilters: { transactionType: string; dateRange: string };
}

/**
 * TransactionHistoryFilters component for filtering transaction history
 * 
 * @param {TransactionHistoryFiltersProps} props - Component props
 * @returns {JSX.Element} The rendered component
 */
export const TransactionHistoryFilters = ({
  onFiltersChange,
  initialFilters
}: TransactionHistoryFiltersProps): React.ReactElement => {
  const { t } = useTranslation();
  
  // Local state for filter values
  const [selectedType, setSelectedType] = useState<string>(initialFilters.transactionType || 'all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>(initialFilters.dateRange || 'last30');
  
  // Handle transaction type change
  const handleTypeChange = (event: SelectChangeEvent): void => {
    const newType = event.target.value;
    setSelectedType(newType);
    onFiltersChange({
      transactionType: newType,
      dateRange: selectedDateRange
    });
  };
  
  // Handle date range change
  const handleDateChange = (event: SelectChangeEvent): void => {
    const newDateRange = event.target.value;
    setSelectedDateRange(newDateRange);
    onFiltersChange({
      transactionType: selectedType,
      dateRange: newDateRange
    });
  };
  
  // Update filters when initialFilters prop changes
  useEffect(() => {
    setSelectedType(initialFilters.transactionType || 'all');
    setSelectedDateRange(initialFilters.dateRange || 'last30');
  }, [initialFilters]);
  
  return (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={2} 
      justifyContent="flex-end" 
      alignItems={{ xs: 'stretch', sm: 'center' }} 
      sx={(theme) => ({ mb: theme.spacing(2) })}
    >
      <FormControl 
        size="small" 
        sx={(theme) => ({ 
          minWidth: { xs: '100%', sm: 150 },
          '& .MuiInputBase-root': {
            transition: theme.transitions.create(['border-color', 'box-shadow']),
            '&:hover': {
              borderColor: theme.palette.primary.main
            }
          }
        })}
      >
        <InputLabel id="transaction-type-label">
          {t('wallet.history.filterTypeLabel')}
        </InputLabel>
        <Select
          labelId="transaction-type-label"
          id="transaction-type-select"
          value={selectedType}
          onChange={handleTypeChange}
          label={t('wallet.history.filterTypeLabel')}
        >
          <MenuItem value="all">{t('wallet.transactionTypes.all')}</MenuItem>
          <MenuItem value="recharge">{t('wallet.transactionTypes.recharge')}</MenuItem>
          <MenuItem value="order_payment">{t('wallet.transactionTypes.orderPayment')}</MenuItem>
          <MenuItem value="refund">{t('wallet.transactionTypes.refund')}</MenuItem>
          <MenuItem value="bonus">{t('wallet.transactionTypes.bonus')}</MenuItem>
          <MenuItem value="adjustment">{t('wallet.transactionTypes.adjustment')}</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl 
        size="small" 
        sx={(theme) => ({ 
          minWidth: { xs: '100%', sm: 150 },
          mt: { xs: theme.spacing(1), sm: 0 },
          '& .MuiInputBase-root': {
            transition: theme.transitions.create(['border-color', 'box-shadow']),
            '&:hover': {
              borderColor: theme.palette.primary.main
            }
          }
        })}
      >
        <InputLabel id="date-range-label">
          {t('wallet.history.filterDateLabel')}
        </InputLabel>
        <Select
          labelId="date-range-label"
          id="date-range-select"
          value={selectedDateRange}
          onChange={handleDateChange}
          label={t('wallet.history.filterDateLabel')}
        >
          <MenuItem value="last30">{t('wallet.dateRanges.last30')}</MenuItem>
          <MenuItem value="last90">{t('wallet.dateRanges.last90')}</MenuItem>
          <MenuItem value="all_time">{t('wallet.dateRanges.allTime')}</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
};

export default TransactionHistoryFilters;
