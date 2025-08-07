'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  Button, 
  Stack, 
  Typography, 
  IconButton, 
  Tooltip,
  Paper,
  InputAdornment,
  useTheme,
  SelectChangeEvent,
  Popover,
  FormControl,
  InputLabel,
  Divider,
  Badge,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import { debounce } from 'lodash';

/**
 * Interface for the filter state
 */
export interface FiltersState {
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Props for the OrderFilters component
 */
interface OrderFiltersProps {
  /** Callback when filters are applied */
  onApplyFilters: (filters: FiltersState) => void;
  /** Callback when search term changes */
  onSearch: (searchTerm: string) => void;
  /** Callback when view mode changes */
  onViewChange: (viewMode: 'list' | 'grid') => void;
  /** Current view mode */
  currentViewMode: 'list' | 'grid';
}

/**
 * Order Filters component for filtering, sorting, and searching orders
 * 
 * @param {OrderFiltersProps} props - Component props
 * @returns {React.ReactElement} The OrderFilters component
 */
export const OrderFilters = ({
  onApplyFilters,
  onSearch,
  onViewChange,
  currentViewMode,
}: OrderFiltersProps): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  
  // Local state for filters
  const [status, setStatus] = useState<string>('');
  const [sortValue, setSortValue] = useState<string>('date_desc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Filter popover state
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [tempStatus, setTempStatus] = useState<string>('');
  const [tempSortValue, setTempSortValue] = useState<string>('date_desc');
  const [activeFilterCount, setActiveFilterCount] = useState<number>(0);

  // Debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = React.useCallback(
    debounce((term: string) => {
      onSearch(term);
    }, 500),
    [onSearch]
  );

  // Update search when searchTerm changes
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  // Update active filter count when filters change
  useEffect(() => {
    let count = 0;
    if (status) count++;
    if (sortValue !== 'date_desc') count++;
    setActiveFilterCount(count);
  }, [status, sortValue]);

  // Filter popover handlers
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
    setTempStatus(status);
    setTempSortValue(sortValue);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  // Handle status change in popover
  const handleTempStatusChange = (event: SelectChangeEvent<string>): void => {
    setTempStatus(event.target.value);
  };

  // Handle sort value change in popover
  const handleTempSortChange = (event: SelectChangeEvent<string>): void => {
    setTempSortValue(event.target.value);
  };
  
  // Apply filters from popover
  const handleFilterApply = (): void => {
    setStatus(tempStatus);
    setSortValue(tempSortValue);
    
    // Extract sort order and field from sortValue
    const [field, order] = tempSortValue.split('_');
    
    onApplyFilters({
      status: tempStatus,
      sortBy: field,
      sortOrder: order as 'asc' | 'desc',
    });
    
    handleFilterClose();
  };
  
  // Reset filters
  const handleFilterReset = (): void => {
    setTempStatus('');
    setTempSortValue('date_desc');
  };

  // Handle search term change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };

  // Check if filter popover is open
  const filterOpen = Boolean(filterAnchorEl);
  const filterId = filterOpen ? 'filter-popover' : undefined;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: theme.spacing(2), 
        borderRadius: theme.shape.borderRadius,
        mb: theme.spacing(3),
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      {/* Top Row: Search, Filter, and View Toggle */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', md: 'center' },
          gap: theme.spacing(2),
          mb: theme.spacing(2)
        }}
      >
        {/* Search Field */}
        <TextField
          placeholder={t('orderHistory.searchPlaceholder', 'Search orders')}
          variant="outlined"
          size="small"
          fullWidth
          sx={{ 
            maxWidth: { md: 300 },
            width: '100%',
            mb: { xs: theme.spacing(1), md: 0 }
          }}
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        
        {/* Filter and View Toggle */}
        <Stack 
          direction="row" 
          spacing={theme.spacing(1)} 
          alignItems="center"
          justifyContent={{ xs: 'flex-end', md: 'flex-start' }}
          width={{ xs: '100%', md: 'auto' }}
        >
          {/* Filter Button */}
          <Tooltip title={t('common.filter', 'Filter')}>
            <IconButton 
              size="small"
              onClick={handleFilterClick}
              aria-describedby={filterId}
            >
              <Badge 
                badgeContent={activeFilterCount} 
                color="primary" 
                invisible={activeFilterCount === 0}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}
              >
                <FilterListIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* View Toggle */}
          <Tooltip title={t('orderHistory.listViewTooltip', 'List view')}>
            <IconButton 
              size="small" 
              color={currentViewMode === 'list' ? 'primary' : 'default'}
              onClick={() => onViewChange('list')}
            >
              <ViewListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('orderHistory.gridViewTooltip', 'Grid view')}>
            <IconButton 
              size="small" 
              color={currentViewMode === 'grid' ? 'primary' : 'default'}
              onClick={() => onViewChange('grid')}
            >
              <ViewModuleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      
      {/* Filter Popover */}
      <Popover
        id={filterId}
        open={filterOpen}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 320, 
            p: theme.spacing(2),
            mt: theme.spacing(1)
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {t('common.filters', 'Filters')}
          </Typography>
          <IconButton size="small" onClick={handleFilterClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Filter Options */}
        <Stack spacing={2}>
          {/* Status Filter */}
          <FormControl fullWidth size="small">
            <InputLabel id="status-filter-label">
              {t('orderHistory.filterByStatusLabel', 'Filter by Status')}
            </InputLabel>
            <Select
              labelId="status-filter-label"
              value={tempStatus}
              onChange={handleTempStatusChange}
              label={t('orderHistory.filterByStatusLabel', 'Filter by Status')}
            >
              <MenuItem value="">
                {t('orderHistory.allStatuses', 'All Statuses')}
              </MenuItem>
              <MenuItem value="pending">
                {t('orderHistory.orderStatus.pending', 'Pending')}
              </MenuItem>
              <MenuItem value="pending_payment">
                {t('orderHistory.orderStatus.pending_payment', 'Pending Payment')}
              </MenuItem>
              <MenuItem value="processing">
                {t('orderHistory.orderStatus.processing', 'Processing')}
              </MenuItem>
              <MenuItem value="shipped">
                {t('orderHistory.orderStatus.shipped', 'Shipped')}
              </MenuItem>
              <MenuItem value="delivered">
                {t('orderHistory.orderStatus.delivered', 'Delivered')}
              </MenuItem>
              <MenuItem value="cancelled">
                {t('orderHistory.orderStatus.cancelled', 'Cancelled')}
              </MenuItem>
              <MenuItem value="processing_return">
                {t('orderHistory.orderStatus.processing_return', 'Processing Return')}
              </MenuItem>
              <MenuItem value="returned">
                {t('orderHistory.orderStatus.returned', 'Returned')}
              </MenuItem>
            </Select>
          </FormControl>
          
          {/* Sort By Filter */}
          <FormControl fullWidth size="small">
            <InputLabel id="sort-filter-label">
              {t('orderHistory.sortByLabel', 'Sort By')}
            </InputLabel>
            <Select
              labelId="sort-filter-label"
              value={tempSortValue}
              onChange={handleTempSortChange}
              label={t('orderHistory.sortByLabel', 'Sort By')}
            >
              <MenuItem value="date_desc">
                {t('orderHistory.sortBy.dateNewest', 'Date (newest)')}
              </MenuItem>
              <MenuItem value="date_asc">
                {t('orderHistory.sortBy.dateOldest', 'Date (oldest)')}
              </MenuItem>
              <MenuItem value="total_desc">
                {t('orderHistory.sortBy.totalHighToLow', 'Total (high to low)')}
              </MenuItem>
              <MenuItem value="total_asc">
                {t('orderHistory.sortBy.totalLowToHigh', 'Total (low to high)')}
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Action Buttons */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleFilterReset}
          >
            {t('common.reset', 'Reset')}
          </Button>
          <Button 
            variant="contained" 
            size="small"
            onClick={handleFilterApply}
          >
            {t('common.apply', 'Apply')}
          </Button>
        </Stack>
      </Popover>
      
      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <Stack 
          direction="row" 
          spacing={1} 
          flexWrap="wrap"
          sx={{ mt: 2, gap: theme.spacing(1) }}
        >
          {status && (
            <Chip
              label={`${t('orderHistory.filterByStatusLabel', 'Status')}: ${t(`orderHistory.orderStatus.${status}`, status)}`}
              size="small"
              onDelete={() => {
                setStatus('');
                onApplyFilters({
                  status: '',
                  sortBy: sortValue.split('_')[0],
                  sortOrder: sortValue.split('_')[1] as 'asc' | 'desc',
                });
              }}
            />
          )}
          
          {sortValue !== 'date_desc' && (
            <Chip
              label={`${t('orderHistory.sortByLabel', 'Sort')}: ${t(`orderHistory.sortBy.${sortValue.replace('_', '')}`, sortValue)}`}
              size="small"
              onDelete={() => {
                setSortValue('date_desc');
                onApplyFilters({
                  status,
                  sortBy: 'date',
                  sortOrder: 'desc',
                });
              }}
            />
          )}
        </Stack>
      )}
    </Paper>
  );
};

export default OrderFilters;
