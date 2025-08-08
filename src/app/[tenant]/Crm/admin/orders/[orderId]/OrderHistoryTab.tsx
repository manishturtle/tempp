'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Pagination,
} from '@mui/material';

// Import the OrderHistoryFilters component
import OrderHistoryFilters from './OrderHistoryFilters';

interface OrderHistoryTabProps {
  orderId: string;
  isLoading?: boolean;
}

interface FilterState {
  eventType: string;
  userId: string;
}

/**
 * Order History Tab component
 * Displays the audit trail and history for an order
 */
export default function OrderHistoryTab({ orderId, isLoading = false }: OrderHistoryTabProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<FilterState>({ eventType: '', userId: '' });

  // Mock data for event types and users
  const mockEventTypes = [
    { value: 'status_change', labelKey: 'admin.orders.detail.history.eventTypes.statusChange' },
    { value: 'payment_event', labelKey: 'admin.orders.detail.history.eventTypes.paymentEvent' },
    { value: 'note_added', labelKey: 'admin.orders.detail.history.eventTypes.noteAdded' },
    { value: 'item_update', labelKey: 'admin.orders.detail.history.eventTypes.itemUpdate' },
  ];

  const mockUsers = [
    { id: '1', name: 'Admin User' },
    { id: '2', name: 'System' },
    { id: '3', name: 'John Doe' },
  ];

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  return (
    <Paper elevation={2} sx={{ p: 2.5 }}>
      {/* Header with title and filters */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        mb={2}
      >
        <Typography variant="h6">
          {t('admin.orders.detail.history.title', 'Order History & Audit Trail')}
        </Typography>
        
        {/* Integrate OrderHistoryFilters component */}
        <Box sx={{ mt: { xs: 2, sm: 0 } }}>
          {!isLoading && (
            <OrderHistoryFilters
              eventTypes={mockEventTypes}
              users={mockUsers}
              initialFilters={filters}
              onFilterChange={handleFilterChange}
            />
          )}
        </Box>
      </Stack>

      {/* Main content - history table */}
      <Box mb={3}>
        {/* OrderHistoryTable will go here */}
        {/* This component will display the list of actions, timestamps, users, etc. */}
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading history data...
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Order history data will be displayed here
          </Typography>
        )}
      </Box>

      {/* Pagination */}
      <Box display="flex" justifyContent="center">
        <Pagination 
          count={10} 
          page={currentPage} 
          onChange={handlePageChange}
          color="primary"
          size="medium"
        />
      </Box>
    </Paper>
  );
}
