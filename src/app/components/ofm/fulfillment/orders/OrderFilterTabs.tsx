'use client';

import React from 'react';
import { Tabs, Tab, Box, Skeleton, Alert } from '@mui/material';
import { useTranslation } from 'next-i18next';
import useGetFulfillmentFilterOptions from '@/app/hooks/api/useGetFulfillmentFilterOptions';

interface OrderFilterTabsProps {
  currentStatusFilter: string | null;
  onStatusChange: (newStatusKey: string | null) => void;
}

/**
 * Component that displays selectable tabs based on order fulfillment statuses
 */
const OrderFilterTabs: React.FC<OrderFilterTabsProps> = ({
  currentStatusFilter,
  onStatusChange,
}) => {
  const { t } = useTranslation('ofm');
  const { data: filterOptions, isLoading, error } = useGetFulfillmentFilterOptions();

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    onStatusChange(newValue === 'all' ? null : newValue);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Skeleton variant="rectangular" height={48} width="100%" />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {t('ofm:common.errors.loadingFiltersFailed')}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Tabs
        value={currentStatusFilter ?? 'all'}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={t('ofm:orders.filters.statusFilterAriaLabel')}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          label={t('ofm:orders.filters.allStatuses')}
          value="all"
          data-testid="filter-tab-all"
        />
        
        {filterOptions?.statuses.map((status) => (
          <Tab
            key={status.key}
            label={t(`ofm:status.${status.key}`, { count: status.count })}
            value={status.key}
            data-testid={`filter-tab-${status.key}`}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default OrderFilterTabs;
