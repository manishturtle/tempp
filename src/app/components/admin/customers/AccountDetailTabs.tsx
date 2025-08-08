import { FC, useState, SyntheticEvent } from 'react';
import { Box, Tabs, Tab, Paper, Button, Typography, Grid, Card, CardContent, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import AddressesTabContent from '@/app/components/admin/customers/AddressesTabContent';
import ContactsTabContent from '@/app/components/admin/customers/ContactsTabContent';
import TasksTabContent from '@/app/components/admin/customers/TasksTabContent';
import OrderHistoryTabContent from '@/app/components/admin/customers/OrderHistoryTabContent';
import HierarchyTabContent from '@/app/components/admin/customers/HierarchyTabContent';
import { AddressFormData } from '@/app/components/admin/customers/forms/AddressForm';
import { ContactFormData } from '@/app/components/admin/customers/forms/ContactForm';
import { TaskFormData } from '@/app/components/admin/customers/forms/TaskForm';
import { AccountDetailData } from '@/app/types/account';

interface AccountDetailTabsProps {
  account: AccountDetailData;
  accountId: string;
  activeTab: number | string;
  setActiveTab: (value: number | string) => void;
  openAddressDrawer?: (initialData?: AddressFormData) => void;
  openContactDrawer?: (initialData?: ContactFormData, accountId?: string) => void;
  openTaskDrawer?: (initialData?: TaskFormData, accountId?: string, contactId?: string) => void;
}

/**
 * Tab navigation component for the Account Detail page
 * Displays tabs for Addresses, Contacts, Activities, Tasks, Order History, and Hierarchy
 */
export const AccountDetailTabs: FC<AccountDetailTabsProps> = ({ 
  account, 
  accountId,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  openAddressDrawer = () => {},
  openContactDrawer = () => {},
  openTaskDrawer = () => {}
}) => {
  const { t } = useTranslation();
  
  // Convert string tab value to number if needed
  const activeTab = typeof externalActiveTab === 'string' 
    ? getTabIndexFromString(externalActiveTab) 
    : externalActiveTab;

  // Check if hierarchy tab should be shown
  // Always show the tab if the account is a parent (has child accounts) or has a parent itself
  const childAccounts = account.child_accounts || [];
  // If parent_account is null, this account is a top-level parent
  // We want to show the hierarchy tab in this case too
  const showHierarchyTab = true; // Always show the hierarchy tab for all accounts

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    externalSetActiveTab(newValue);
  };
  
  // Helper function to convert tab names to indices
  function getTabIndexFromString(tabName: string): number {
    switch(tabName) {
      case 'addresses': return 0;
      case 'contacts': return 1;
      case 'activities': return 2;
      case 'tasks': return 3;
      case 'orderHistory': return 4;
      case 'hierarchy': return showHierarchyTab ? 5 : 0; // Default to first tab if hierarchy not available
      default: return 0;
    }
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ 
        backgroundColor: 'background.paper',
        borderBottom: 1, 
        borderColor: 'divider',
        position: 'relative'
      }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t('accountDetailPage.tabs.ariaLabel')}
          sx={{
            '& .MuiTabs-flexContainer': {
              borderBottom: 'none',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              minWidth: 'auto',
              py: 2,
              px: 3,
              fontWeight: 'medium',
              fontSize: '0.875rem',
              '&.Mui-selected': {
                fontWeight: 'bold',
              },
            },
          }}
        >
          <Tab label={t('accountDetailPage.tabs.addresses')} id="account-tab-0" aria-controls="account-tabpanel-0" />
          <Tab label={t('accountDetailPage.tabs.contacts')} id="account-tab-1" aria-controls="account-tabpanel-1" />
          <Tab label={t('accountDetailPage.tabs.activities')} id="account-tab-2" aria-controls="account-tabpanel-2" />
          <Tab label={t('accountDetailPage.tabs.tasks')} id="account-tab-3" aria-controls="account-tabpanel-3" />
          <Tab label={t('accountDetailPage.tabs.orderHistory')} id="account-tab-4" aria-controls="account-tabpanel-4" />
          
          {showHierarchyTab && (
            <Tab label={t('accountDetailPage.tabs.hierarchy')} id="account-tab-5" aria-controls="account-tabpanel-5" />
          )}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Addresses Tab Content */}
        <Box sx={{ p: 3 }}>
          <AddressesTabContent
            accountId={accountId}
            addresses={account.addresses || []}
            openAddressDrawer={openAddressDrawer}
          />
        </Box>
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        {/* Contacts Tab Content */}
        <Box sx={{ p: 3 }}>
          <ContactsTabContent
            accountId={accountId}
            contacts={account.contacts || []}
            openContactDrawer={openContactDrawer}
          />
        </Box>
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        {/* Activities Tab Content Placeholder */}
        <Box sx={{ p: 3 }}>Activities content will go here</Box>
      </TabPanel>
      
      <TabPanel value={activeTab} index={3}>
        {/* Tasks Tab Content */}
        <Box sx={{ p: 3 }}>
          <TasksTabContent
            accountId={accountId}
            openTaskDrawer={openTaskDrawer}
          />
        </Box>
      </TabPanel>
      
      <TabPanel value={activeTab} index={4}>
        {/* Order History Tab Content */}
        <Box sx={{ p: 3 }}>
          <OrderHistoryTabContent accountId={accountId} />
        </Box>
      </TabPanel>
      
      {showHierarchyTab && (
        <TabPanel value={activeTab} index={5}>
          {/* Hierarchy Tab Content */}
          <HierarchyTabContent accountData={account} />
        </TabPanel>
      )}
    </Paper>
  );
};

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

/**
 * TabPanel component for rendering tab content
 */
const TabPanel: FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      style={{ width: '100%' }}
    >
      {value === index && children}
    </div>
  );
};
