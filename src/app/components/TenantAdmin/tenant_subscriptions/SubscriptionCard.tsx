"use client";

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
  useTheme,
  IconButton,
  Grid,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Campaign,
  Badge,
  MoreVert,
  AccountBalance,
  TrendingUp,
} from '@mui/icons-material';

// --- Reusable Components based on your provided code ---

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  borderRadius: '16px',
  border: '1px solid rgba(0,0,0,0.08)',
  '&:hover': {
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  },
}));

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bgcolor',
})<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  padding: theme.spacing(1.5),
  backgroundColor: `${bgcolor}2a`,
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  marginRight: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    color: bgcolor,
    fontSize: 24,
  },
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: '0.75rem',
  fontWeight: 600,
  borderRadius: '6px',
  '& .MuiChip-label': {
    padding: '0 10px',
  },
}));

type SubscriptionStatus = 'active' | 'pending' | 'trial' | 'cancelled';

interface Metric {
    label: string;
    value?: string;  // Old format
    current?: number; // New format
    limit?: number;   // New format
    unit?: string;    // New format
}

interface SubscriptionCardProps {
  title: string;
  plan: string;
  status: SubscriptionStatus;
  icon: React.ReactNode;
  iconColor: string;
  metrics: Array<Metric>;
  renewInfo?: string;
  cost?: string;
}

export const SubscriptionCard = ({
  title,
  plan,
  status,
  icon,
  iconColor,
  metrics,
  renewInfo,
  cost,
}: SubscriptionCardProps) => {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return { bg: theme.palette.success.light, text: theme.palette.success.dark };
      case 'pending':
        return { bg: theme.palette.warning.light, text: theme.palette.warning.dark };
      case 'trial':
        return { bg: theme.palette.info.light, text: theme.palette.info.dark };
      case 'cancelled':
        return { bg: theme.palette.grey[300], text: theme.palette.grey[700] };
      default:
        return { bg: theme.palette.grey[300], text: theme.palette.grey[700] };
    }
  };

  const statusColors = getStatusColor();
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <StyledCard>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={2}>
          <IconWrapper bgcolor={iconColor}>
            {icon}
          </IconWrapper>
          <Box ml={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                {title}
              </Typography>
              <StatusChip
                label={statusText}
                size="small"
                sx={{
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {plan}
            </Typography>
          </Box>
        </Box>

        {/* Metrics and Actions in a single row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {/* Metrics */}
          <Box sx={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {metrics.map((metric, index) => (
              <Box key={index} sx={{ minWidth: '160px' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {metric.label}
                </Typography>
                {metric.value ? (
                  <Typography variant="subtitle2" fontWeight={600}>
                    {metric.value}
                  </Typography>
                ) : (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={metric.current && metric.limit ? (metric.current / metric.limit) * 100 : 0}
                      sx={{ height: 8, borderRadius: 5, my: 1, maxWidth: '200px' }}
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {metric.current?.toLocaleString()}
                      {metric.limit && `/${metric.limit.toLocaleString()}`}
                      {metric.unit && ` ${metric.unit}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, ml: 'auto' }}>
            <Button 
              variant="contained" 
              size="small"
              sx={{ textTransform: 'none', borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              Manage Users
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => window.open('https://devstore.turtleit.in/turtlesoftware/store/product', '_blank', 'noopener,noreferrer')}
              sx={{ textTransform: 'none', borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              Change Plan
            </Button>
            <Button 
              variant="text" 
              size="small" 
              color="error" 
              sx={{ textTransform: 'none', borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              Cancel
            </Button>
          </Box>
        </Box>

        {/* Footer: Renewal Info */}
        {(renewInfo || cost) && (
          <Typography variant="body2" color="text.secondary" textAlign={{xs: 'center', md: 'left'}} sx={{mt: 2}}>
              {renewInfo && <span>{renewInfo}</span>}
              {renewInfo && cost && <span> • </span>}
              {cost && <strong>{cost}</strong>}
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  );
};

// --- Main Page Component ---
// export default function SubscriptionsPage() {
//   const [activeFilter, setActiveFilter] = useState('All Subscriptions');
  
//   const filters = ['All Subscriptions', 'Active', 'Trial', 'Cancelled'];
//   const theme = useTheme();

//   const subscriptionsData = [
//     {
//       appName: 'CRM Application',
//       planName: 'Pro Plan',
//       status: 'active',
//       icon: <AccountBalance />,
//       iconColor: theme.palette.primary.main,
//       usage: [
//         { label: 'Users Assigned', current: 30, limit: 35, unit: '' },
//         { label: 'Storage Used', current: 30, limit: 50, unit: 'GB' },
//       ],
//       renewalInfo: 'Renews on July 15, 2025',
//       costInfo: 'Cost: $149/month'
//     },
//     {
//       appName: 'AI Platform',
//       planName: 'Standard Plan → Enterprise Plan',
//       status: 'pending',
//       icon: <TrendingUp />,
//       iconColor: theme.palette.secondary.main,
//       usage: [
//         { label: 'API Calls', current: 1200000, limit: 2000000, unit: '' },
//         { label: 'Processing Credits', current: 75000, limit: 100000, unit: 'K' },
//       ],
//       renewalInfo: 'Upgrade effective: August 1, 2025',
//       costInfo: 'New cost: $299/month'
//     },
//     {
//       appName: 'Campaign Management Platform',
//       planName: 'Business Plan',
//       status: 'active',
//       icon: <Campaign />,
//       iconColor: theme.palette.success.main,
//       usage: [
//         { label: 'Contacts Stored', current: 75000, limit: 100000, unit: 'K' },
//         { label: 'Emails Sent', current: 150000, limit: 250000, unit: 'K' },
//       ],
//       renewalInfo: 'Renews on July 20, 2025',
//       costInfo: 'Cost: $199/month'
//     },
//     {
//       appName: 'HR Platform',
//       planName: 'Basic Plan',
//       status: 'trial',
//       icon: <Badge />,
//       iconColor: theme.palette.warning.main,
//       usage: [
//         { label: 'Employee Records', current: 10, limit: 50, unit: '' },
//         { label: 'Trial Days Left', current: 12, limit: 30, unit: 'days' },
//       ],
//       renewalInfo: '',
//       costInfo: ''
//     },
//   ];

//   return (
//     <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
//       {/* Header */}
//       <Box sx={{ mb: 4 }}>
//         <Typography variant="h4" fontWeight="bold" gutterBottom>
//           My Subscriptions
//         </Typography>
//         <Typography variant="body1" color="text.secondary">
//           Manage your subscription plans, user assignments, and plan changes.
//         </Typography>
//       </Box>

//       {/* Filter Buttons */}
//       <Stack direction="row" spacing={1} sx={{ mb: 4 }} flexWrap="wrap" gap={1}>
//         {filters.map((filter) => (
//           <Button
//             key={filter}
//             variant={activeFilter === filter ? 'contained' : 'outlined'}
//             onClick={() => setActiveFilter(filter)}
//             sx={{ borderRadius: '20px', textTransform: 'none', px: 2.5 }}
//           >
//             {filter}
//           </Button>
//         ))}
//       </Stack>

//       {/* Subscription Cards */}
//       <Box>
//         {subscriptionsData.map((sub, index) => (
//           <SubscriptionCard 
//             key={index} 
//             title={sub.appName}
//             plan={sub.planName}
//             status={sub.status as SubscriptionStatus}
//             icon={sub.icon}
//             iconColor={sub.iconColor}
//             metrics={sub.usage}
//             renewInfo={sub.renewalInfo}
//             cost={sub.costInfo}
//           />
//         ))}
//       </Box>
//     </Box>
//   );
// }
