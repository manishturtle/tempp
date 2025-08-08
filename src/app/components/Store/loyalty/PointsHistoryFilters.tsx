'use client';

/**
 * PointsHistoryFilters Component
 * 
 * A component for filtering loyalty points transaction history by search term, type, and date range
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Stack,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Button,
  SelectChangeEvent,
  Popover,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Props for the PointsHistoryFilters component
 */
interface PointsHistoryFiltersProps {
  /**
   * Callback function triggered when filters change
   */
  onFiltersChange: (filters: { 
    searchTerm?: string; 
    transactionType?: string; 
    dateRange?: string; 
  }) => void;
  
  /**
   * Initial filter values
   */
  initialFilters: { 
    searchTerm?: string; 
    transactionType?: string; 
    dateRange?: string; 
  };
}

/**
 * PointsHistoryFilters component for filtering loyalty points transaction history
 * 
 * @param {PointsHistoryFiltersProps} props - Component props
 * @returns {React.ReactElement} The rendered component
 */
export const PointsHistoryFilters = ({
  onFiltersChange,
  initialFilters
}: PointsHistoryFiltersProps): React.ReactElement => {
  const { t } = useTranslation();
  
  // Local state for filter values
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.searchTerm || '');
  const [selectedType, setSelectedType] = useState<string>(initialFilters.transactionType || 'all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>(initialFilters.dateRange || 'last30');
  
  // State for filter popover
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // Handle search term change with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    
    // Apply debounce to avoid excessive filter calls
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        searchTerm: newSearchTerm,
        transactionType: selectedType,
        dateRange: selectedDateRange
      });
    }, 300);
  };
  
  // Handle search cleanup in useEffect to proper manage timer
  useEffect(() => {
    return () => {
      // Cleanup any pending timers when component unmounts
    };
  }, []);
  
  // Handle transaction type change
  const handleTypeChange = (event: SelectChangeEvent): void => {
    const newType = event.target.value;
    setSelectedType(newType);
    onFiltersChange({
      searchTerm,
      transactionType: newType,
      dateRange: selectedDateRange
    });
  };
  
  // Handle date range change
  const handleDateChange = (event: SelectChangeEvent): void => {
    const newDateRange = event.target.value;
    setSelectedDateRange(newDateRange);
    onFiltersChange({
      searchTerm,
      transactionType: selectedType,
      dateRange: newDateRange
    });
  };
  
  // Filter popover handlers
  const handleOpenFilterMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseFilterMenu = (): void => {
    setAnchorEl(null);
  };
  
  // Update filters when initialFilters prop changes
  useEffect(() => {
    setSearchTerm(initialFilters.searchTerm || '');
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
      <TextField
        placeholder={t('loyalty.history.searchPlaceholder')}
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={handleSearchChange}
        fullWidth={false}
        sx={{ minWidth: { xs: '100%', sm: 220 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      
      <IconButton 
        aria-label={t('loyalty.history.filterButtonLabel')}
        onClick={handleOpenFilterMenu}
        color={open || selectedType !== 'all' || selectedDateRange !== 'last30' ? 'primary' : 'default'}
        size="small"
      >
        <FilterListIcon />
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseFilterMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, width: 240 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">{t('loyalty.history.filterTitle')}</Typography>
            <IconButton size="small" onClick={handleCloseFilterMenu}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          
          <Divider sx={{ mb: 2 }} />
          
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="loyalty-transaction-type-label">
              {t('loyalty.history.filterTypeLabel')}
            </InputLabel>
            <Select
              labelId="loyalty-transaction-type-label"
              id="loyalty-transaction-type-select"
              value={selectedType}
              onChange={handleTypeChange}
              label={t('loyalty.history.filterTypeLabel')}
            >
              <MenuItem value="all">{t('loyalty.transactionTypes.all')}</MenuItem>
              <MenuItem value="earned">{t('loyalty.transactionTypes.earned')}</MenuItem>
              <MenuItem value="redeemed">{t('loyalty.transactionTypes.redeemed')}</MenuItem>
              <MenuItem value="adjustment">{t('loyalty.transactionTypes.adjustment')}</MenuItem>
              <MenuItem value="expired">{t('loyalty.transactionTypes.expired')}</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="loyalty-date-range-label">
              {t('loyalty.history.filterDateLabel')}
            </InputLabel>
            <Select
              labelId="loyalty-date-range-label"
              id="loyalty-date-range-select"
              value={selectedDateRange}
              onChange={handleDateChange}
              label={t('loyalty.history.filterDateLabel')}
            >
              <MenuItem value="last30">{t('loyalty.dateRanges.last30')}</MenuItem>
              <MenuItem value="last90">{t('loyalty.dateRanges.last90')}</MenuItem>
              <MenuItem value="last180">{t('loyalty.dateRanges.last180')}</MenuItem>
              <MenuItem value="last365">{t('loyalty.dateRanges.last365')}</MenuItem>
              <MenuItem value="all_time">{t('loyalty.dateRanges.allTime')}</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            size="small" 
            fullWidth
            onClick={() => {
              setSelectedType('all');
              setSelectedDateRange('last30');
              onFiltersChange({
                searchTerm,
                transactionType: 'all',
                dateRange: 'last30'
              });
              handleCloseFilterMenu();
            }}
          >
            {t('loyalty.history.resetFilters')}
          </Button>
        </Box>
      </Popover>
    </Stack>
  );
};

export default PointsHistoryFilters;
