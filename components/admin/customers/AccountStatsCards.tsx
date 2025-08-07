"use client";

/**
 * Account Statistics Cards Component
 * 
 * Displays analytics cards for account statistics
 */
import * as React from 'react';
import { Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFetchAccountStats } from '@/app/hooks/api/customers';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import AddchartIcon from '@mui/icons-material/Addchart';
import { AnalyticsCard } from '@/app/components/common/AnalyticsCard';

// Interface for the stats data
interface AccountStatsData {
  total_accounts: {
    count: number;
    change_percentage: number;
  };
  active_accounts: {
    count: number;
    change_percentage: number;
  };
  inactive_accounts: {
    count: number;
    change_percentage: number;
  };
  new_accounts_this_month: {
    count: number;
    change_percentage: number;
    previous_month_count: number;
  };
  as_of_date: string;
  comparison_period: {
    start: string;
    end: string;
  };
}

/**
 * Component for displaying account statistics in card format
 */
export const AccountStatsCards = (): React.ReactElement => {
  const { t } = useTranslation();
  const { data: stats, isLoading, isError } = useFetchAccountStats();

  // Default values for when API is not available
  const defaultStats: AccountStatsData = {
    total_accounts: { count: 0, change_percentage: 0 },
    active_accounts: { count: 0, change_percentage: 0 },
    inactive_accounts: { count: 0, change_percentage: 0 },
    new_accounts_this_month: { 
      count: 0, 
      change_percentage: 0,
      previous_month_count: 0 
    },
    as_of_date: new Date().toISOString().split('T')[0],
    comparison_period: {
      start: '',
      end: ''
    }
  };

  // Use actual data or default values
  const displayStats = stats ? {
    ...defaultStats,
    ...stats,
    // Ensure all required fields are present
    total_accounts: {
      ...defaultStats.total_accounts,
      ...(stats as any).total_accounts || {}
    },
    active_accounts: {
      ...defaultStats.active_accounts,
      ...(stats as any).active_accounts || {}
    },
    inactive_accounts: {
      ...defaultStats.inactive_accounts,
      ...(stats as any).inactive_accounts || {}
    },
    new_accounts_this_month: {
      ...defaultStats.new_accounts_this_month,
      ...(stats as any).new_accounts_this_month || {}
    }
  } : defaultStats;

  // Card definitions with their properties
  const cards = [
    {
      id: 'total',
      title: t('accountListPage.cards.total'),
      value: displayStats.total_accounts.count,
      icon: <PeopleIcon />,
      color: 'primary.main',
      percentChange: Math.abs(displayStats.total_accounts.change_percentage || 0),
      subtitle: displayStats.total_accounts.change_percentage !== undefined 
        ? `${displayStats.total_accounts.change_percentage >= 0 ? '+' : ''}${displayStats.total_accounts.change_percentage}% from last month`
        : ''
    },
    {
      id: 'active',
      title: t('accountListPage.cards.active'),
      value: displayStats.active_accounts.count,
      icon: <CheckCircleIcon />,
      color: 'success.main',
      percentChange: Math.abs(displayStats.active_accounts.change_percentage),
      subtitle: displayStats.active_accounts.change_percentage !== undefined 
        ? `${displayStats.active_accounts.change_percentage >= 0 ? '+' : ''}${displayStats.active_accounts.change_percentage}% from last month`
        : ''
    },
    {
      id: 'inactive',
      title: t('accountListPage.cards.inactive'),
      value: displayStats.inactive_accounts.count,
      icon: <PersonIcon />,
      color: 'warning.main',
      percentChange: Math.abs(displayStats.inactive_accounts.change_percentage),
      subtitle: displayStats.inactive_accounts.change_percentage !== undefined 
        ? `${displayStats.inactive_accounts.change_percentage >= 0 ? '+' : ''}${displayStats.inactive_accounts.change_percentage}% from last month`
        : ''
    },
    {
      id: 'newThisMonth',
      title: t('accountListPage.cards.newThisMonth'),
      value: displayStats.new_accounts_this_month.count,
      icon: <AddchartIcon />,
      color: 'info.main',
      percentChange: Math.abs(displayStats.new_accounts_this_month.change_percentage),
      subtitle: displayStats.new_accounts_this_month.change_percentage !== undefined 
        ? `${displayStats.new_accounts_this_month.change_percentage >= 0 ? '+' : ''}${displayStats.new_accounts_this_month.change_percentage}% from last month`
        : ''
    }
  ];

  // Always show cards with placeholder data even if there's an error

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {cards.map((card) => (
        <Grid size={{xs:12 , sm:6, md:3}} key={card.id}>
          <AnalyticsCard
            title={card.title}
            value={card.value}
            percentChange={card.percentChange}
            icon={card.icon}
            color={card.color}
            isLoading={isLoading}
            subtitle={card.subtitle}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default AccountStatsCards;
