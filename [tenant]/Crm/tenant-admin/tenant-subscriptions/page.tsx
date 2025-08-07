'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Box, Container, CircularProgress, Alert } from '@mui/material';
import { SubscriptionList } from '../../../../components/TenantAdmin/tenant_subscriptions/SubscriptionList';
import { fetchTenantSubscriptions, type TenantSubscription, type TenantApplication } from '../../../../services/tenantApi';
import { CloudQueue, AutoAwesome, Campaign, Badge } from '@mui/icons-material';

const getAppIcon = (appName: string) => {
  const icons: Record<string, React.ReactNode> = {
    'CRM': <CloudQueue />,
    'AI Platform': <AutoAwesome />,
    'Campaign': <Campaign />,
    'Default': <Badge />
  };

  const appKey = Object.keys(icons).find(key => 
    appName.toLowerCase().includes(key.toLowerCase())
  );
  
  return appKey ? icons[appKey] : icons['Default'];
};

const getAppColor = (appName: string) => {
  const colors: Record<string, string> = {
    'CRM': '#1976d2',
    'AI': '#9c27b0',
    'Campaign': '#2e7d32',
    'Default': '#666666'
  };

  const colorKey = Object.keys(colors).find(key => 
    appName.toLowerCase().includes(key.toLowerCase())
  );
  
  return colorKey ? colors[colorKey] : colors['Default'];
};

export default function TenantSubscriptionsPage() {
  const tenantSlug = useParams().tenant;
  const [subscriptions, setSubscriptions] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantSubscriptions(tenantSlug as string);
        setSubscriptions(data.applications || []);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError('Failed to load subscriptions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantSlug]);

  // Transform API data to match SubscriptionCard props
  const subscriptionCards = subscriptions.map(app => {
    const subscription = app.subscription;
    const isTrial = subscription.license_status.toLowerCase() === 'trial';
    const isActive = subscription.license_status.toLowerCase() === 'active';
    const isPending = subscription.license_status.toLowerCase() === 'pending';
    
    // Format metrics
    const metrics = [
      { 
        label: 'Users', 
        current: app.user_count,
        limit: 100, // Default limit, adjust based on your plan
        unit: ''
      },
      {
        label: 'Storage',
        current: 30, // Default value, replace with actual storage usage
        limit: 50,   // Default limit, adjust based on your plan
        unit: 'GB'
      }
    ];

    return {
      id: app.app_id.toString(),
      title: app.name,
      plan: subscription.plan_name || 'No Plan',
      status: isTrial ? 'trial' : isActive ? 'active' : isPending ? 'pending' : 'cancelled',
      icon: getAppIcon(app.name),
      iconColor: getAppColor(app.name),
      metrics,
      renewInfo: subscription.valid_until 
        ? `Renews on: ${new Date(subscription.valid_until).toLocaleDateString()}` 
        : 'No renewal date',
      cost: isTrial ? 'Free Trial' : `$${subscription.subscription_plan?.price || '0'}/month`
    };
  });

  // Fallback data if no subscriptions are found
  const fallbackSubscriptions = [
    {
      id: '1',
      title: 'CRM Application',
      plan: 'Pro Plan',
      status: 'active' as const,
      icon: <CloudQueue />,
      iconColor: '#1976d2',
      metrics: [
        { label: 'Users', current: 30, limit: 50, unit: '' },
        { label: 'Storage', current: 30, limit: 50, unit: 'GB' },
      ],
      renewInfo: 'Renews on: July 15, 2025',
      cost: '$349/month',
    },
    {
      id: '2',
      title: 'AI Platform',
      plan: 'Standard Plan',
      status: 'trial' as const,
      icon: <AutoAwesome />,
      iconColor: '#9c27b0',
      metrics: [
        { label: 'Users', current: 10, limit: 20, unit: '' },
        { label: 'Storage', current: 15, limit: 50, unit: 'GB' },
      ],
      renewInfo: 'Trial ends in 12 days',
      cost: 'Free Trial',
    },
  ];

  const displaySubscriptions = subscriptionCards.length > 0 ? subscriptionCards : fallbackSubscriptions;

  return (
      <>
        <>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          ) : (
            <SubscriptionList subscriptions={displaySubscriptions} />
          )}
        </>
      </>
  );
}