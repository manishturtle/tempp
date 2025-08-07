"use client";

/**
 * Account Status Tabs Component
 * 
 * Displays tabs for filtering accounts by status
 */
import * as React from 'react';
import { Box, Tabs, Tab, useTheme, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface AccountStatusTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: {
    total: number;
    active: number;
    inactive: number;
    prospect: number;
  };
}

/**
 * Component for displaying and managing account status filter tabs
 */
export const AccountStatusTabs = ({
  activeTab,
  onTabChange,
  counts = { total: 0, active: 0, inactive: 0, prospect: 0 }
}: AccountStatusTabsProps): React.ReactElement => {
  const { t } = useTranslation();
  const theme = useTheme();

  // Tab definitions with their properties
  const tabs = [
    {
      id: 'all',
      label: t('status.all'),
      count: counts.total,
    },
    {
      id: 'active',
      label: t('status.active'),
      count: counts.active,
    },
    {
      id: 'inactive',
      label: t('status.inactive'),
      count: counts.inactive,
    },
    {
      id: 'prospect',
      label: t('status.prospect'),
      count: counts.prospect,
    },
  ];

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    onTabChange(newValue);
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        mb: 3
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleChange}
        aria-label={t('accountListPage.statusTabsAriaLabel')}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            minWidth: 'auto',
            px: 4,
            py: 1.5,
            fontWeight: 500,
            fontSize: '0.875rem',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
              fontWeight: 600,
            },
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
          }
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={tab.label}
          />
        ))}
      </Tabs>
      <Divider />
    </Box>
  );
};

export default AccountStatusTabs;
