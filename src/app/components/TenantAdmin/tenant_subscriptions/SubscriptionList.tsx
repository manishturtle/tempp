import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { SubscriptionCard } from './SubscriptionCard';

export type Subscription = {
  id: string;
  title: string;
  plan: string;
  status: 'active' | 'pending' | 'trial' | 'cancelled';
  icon: React.ReactNode;
  iconColor: string;
  metrics: Array<{ 
    label: string; 
    current?: number;
    limit?: number;
    unit?: string;
    value?: string; // For backward compatibility
  }>;
  renewInfo?: string;
  cost?: string;
};

type FilterType = 'all' | 'active' | 'pending' | 'trial' | 'cancelled';

interface SubscriptionListProps {
  subscriptions: Subscription[];
}

export function SubscriptionList({ subscriptions = [] }: SubscriptionListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleFilterChange = (newFilter: FilterType) => {
    setActiveFilter(newFilter);
  };

  const filteredSubscriptions = activeFilter === 'all' 
    ? subscriptions 
    : subscriptions.filter(sub => sub.status === activeFilter);

  if (subscriptions.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          No subscriptions found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Subscriptions
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Manage your subscription plans, user assignments, and plan changes.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            textTransform: 'none',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'action.hover',
            },
          }}
        >
          Create New Subscription
        </Button>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'All Subscriptions' },
          { value: 'active', label: 'Active' },
          { value: 'trial', label: 'Trial' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map((item) => (
          <Button
            key={item.value}
            variant={activeFilter === item.value ? 'outlined' : 'text'}
            onClick={() => handleFilterChange(item.value as FilterType)}
            sx={{
              textTransform: 'none',
              color: activeFilter === item.value ? 'primary.main' : 'text.secondary',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: activeFilter === item.value ? 'action.hover' : 'transparent',
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filteredSubscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription.id}
            title={subscription.title}
            plan={subscription.plan}
            status={subscription.status}
            icon={subscription.icon}
            iconColor={subscription.iconColor}
            metrics={subscription.metrics}
            renewInfo={subscription.renewInfo}
            cost={subscription.cost}
          />
        ))}
      </Box>
    </Box>
  );
};
