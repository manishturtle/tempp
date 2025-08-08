'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';

interface EventType {
  value: string;
  labelKey: string;
}

interface User {
  id: string;
  name: string;
}

interface FilterState {
  eventType: string;
  userId: string;
}

interface OrderHistoryFiltersProps {
  eventTypes: EventType[];
  users: User[];
  initialFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

/**
 * Order history filters component
 * Provides dropdown filters for event types and users
 */
export function OrderHistoryFilters({
  eventTypes,
  users,
  initialFilters,
  onFilterChange,
}: OrderHistoryFiltersProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Apply initial filters on mount and when they change externally
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleEventTypeChange = (event: SelectChangeEvent<string>) => {
    const newFilters = {
      ...filters,
      eventType: event.target.value,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleUserChange = (event: SelectChangeEvent<string>) => {
    const newFilters = {
      ...filters,
      userId: event.target.value,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Stack direction="row" spacing={2}>
      {/* Event Type Filter */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="event-type-filter-label">
          {t('admin.orders.detail.history.filterEventType', 'Event Type')}
        </InputLabel>
        <Select
          labelId="event-type-filter-label"
          id="event-type-filter"
          value={filters.eventType}
          label={t('admin.orders.detail.history.filterEventType', 'Event Type')}
          onChange={handleEventTypeChange}
        >
          <MenuItem value="">
            {t('admin.orders.detail.history.allEvents', 'All Events')}
          </MenuItem>
          {eventTypes.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {t(type.labelKey, type.value)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* User Filter */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="user-filter-label">
          {t('admin.orders.detail.history.filterUser', 'User')}
        </InputLabel>
        <Select
          labelId="user-filter-label"
          id="user-filter"
          value={filters.userId}
          label={t('admin.orders.detail.history.filterUser', 'User')}
          onChange={handleUserChange}
        >
          <MenuItem value="">
            {t('admin.orders.detail.history.allUsers', 'All Users')}
          </MenuItem>
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}

export default OrderHistoryFilters;
