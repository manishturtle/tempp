'use client';

import React, { FC } from 'react';
import { 
  Box, 
  Stack, 
  Typography, 
  Link, 
  Chip, 
  Divider, 
  Paper,
  Grid
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AccountDetailData, AddressSummary, ContactSummary, CustomFieldDefinition } from '@/app/types/account';
import FormattedAddress from '@/app/components/common/FormattedAddress';
import { formatDate, formatDateTime } from '@/app/utils/dateUtils';
import NextLink from 'next/link';

interface AccountDetailsSidebarProps {
  accountData: AccountDetailData;
  setActiveTab: (tabValue: string | number) => void;
  customFieldDefinitions?: CustomFieldDefinition[];
}

/**
 * Sidebar component for the Account Detail page displaying key account information,
 * summaries of related items, custom fields, and system information
 */
export const AccountDetailsSidebar: FC<AccountDetailsSidebarProps> = ({
  accountData,
  setActiveTab,
  customFieldDefinitions = []
}) => {
  const { t } = useTranslation();
  
  // Find primary billing and shipping addresses
  const primaryBillingAddress = accountData.addresses?.find(
    address => address.is_billing && address.is_default
  ) || accountData.addresses?.find(
    address => address.is_billing
  );
  
  const primaryShippingAddress = accountData.addresses?.find(
    address => address.is_shipping && address.is_default
  ) || accountData.addresses?.find(
    address => address.is_shipping
  );
  
  // Find primary contacts (up to 3)
  const keyContacts = accountData.contacts
    ?.filter(contact => contact.is_primary || !!contact.job_title)
    ?.slice(0, 3) || [];
  
  // Determine if we should show business/government section
  const showBusinessSection = accountData.customer_group?.group_type === 'Business' || 
                             accountData.customer_group?.group_type === 'Government';
  
  // Filter custom fields to only show those with values
  const customFields = customFieldDefinitions
    .filter(def => accountData.custom_fields && accountData.custom_fields[def.field_name] !== undefined)
    .map(def => ({
      definition: def,
      value: accountData.custom_fields?.[def.field_name]
    }));
  
  return (
    <Box 
      component={Paper} 
      elevation={0} 
      variant="outlined" 
      sx={{ 
        height: '100%', 
        p: 2,
        borderRadius: 1,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      <Stack spacing={3}>
        {/* Account Information Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t('accountDetailPage.detailsSidebar.accountInformation')}
          </Typography>
          <Grid container spacing={1} sx={{ wordBreak: 'break-word' }}>
            {/* Account Number */}
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                {t('accountFields.accountNumber')}
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {accountData.account_number || t('common.notSpecified')}
              </Typography>
            </Grid>
            
            {/* Owner */}
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                {t('accountFields.owner')}
              </Typography>
            </Grid>
            <Grid item xs={8}>
              {accountData.owner ? (
                <Chip 
                  size="small" 
                  label={accountData.owner.full_name || accountData.owner.username} 
                  component={NextLink}
                  href={`/Masters/users/${accountData.owner.id}`}
                  clickable
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('common.notSpecified')}
                </Typography>
              )}
            </Grid>
            
            {/* Parent Account */}
            {accountData.parent_account && (
              <>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    {t('accountFields.parentAccount')}
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Link 
                    component={NextLink} 
                    href={`/Masters/customers/accounts/${accountData.parent_account.id}`}
                    underline="hover"
                    variant="body2"
                    sx={{ 
                      wordBreak: 'break-word',
                      display: 'inline-block',
                      maxWidth: '100%'
                    }}
                  >
                    {accountData.parent_account.name}
                  </Link>
                </Grid>
              </>
            )}
            
            {/* Website */}
            {accountData.website && (
              <>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    {t('accountFields.website')}
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Link 
                    href={accountData.website.startsWith('http') 
                      ? accountData.website 
                      : `https://${accountData.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="body2"
                    sx={{ 
                      wordBreak: 'break-word',
                      display: 'inline-block',
                      maxWidth: '100%'
                    }}
                  >
                    {accountData.website}
                  </Link>
                </Grid>
              </>
            )}
            
            {/* Primary Phone */}
            {accountData.primary_phone && (
              <>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    {t('accountFields.primaryPhone')}
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Link 
                    href={`tel:${accountData.primary_phone}`}
                    underline="hover"
                    variant="body2"
                    sx={{ 
                      wordBreak: 'break-word',
                      display: 'inline-block',
                      maxWidth: '100%'
                    }}
                  >
                    {accountData.primary_phone}
                  </Link>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
        
        <Divider />
        
        {/* Business/Government Details Section */}
        {showBusinessSection && (
          <>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                {accountData.customer_group?.group_type === 'Business' 
                  ? t('accountDetailPage.detailsSidebar.businessDetails')
                  : t('accountDetailPage.detailsSidebar.governmentDetails')
                }
              </Typography>
              <Grid container spacing={1} sx={{ wordBreak: 'break-word' }}>
                {/* Legal Name */}
                {accountData.legal_name && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        {t('accountFields.legalName')}
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {accountData.legal_name}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {/* Industry */}
                {accountData.industry && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        {t('accountFields.industry')}
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {accountData.industry}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {/* Company Size */}
                {accountData.company_size && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        {t('accountFields.companySize')}
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {accountData.company_size}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {/* Tax ID */}
                {accountData.tax_id && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        {t('accountFields.taxId')}
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {accountData.tax_id}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
            <Divider />
          </>
        )}
        
        {/* Primary Addresses Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t('accountDetailPage.detailsSidebar.primaryAddresses')}
          </Typography>
          
          {/* Primary Billing Address */}
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t('addressFields.primaryBillingAddress')}
            </Typography>
            <FormattedAddress address={primaryBillingAddress} />
          </Box>
          
          {/* Primary Shipping Address */}
          <Box mb={1}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t('addressFields.primaryShippingAddress')}
            </Typography>
            <FormattedAddress address={primaryShippingAddress} />
          </Box>
          
          {/* View All Addresses Link */}
          <Link
            component="button"
            variant="body2"
            onClick={() => setActiveTab('addresses')}
            sx={{ mt: 1, display: 'inline-block' }}
          >
            {t('accountDetailPage.detailsSidebar.viewAllAddresses')}
          </Link>
        </Box>
        
        <Divider />
        
        {/* Key Contacts Summary */}
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t('accountDetailPage.detailsSidebar.keyContacts')}
          </Typography>
          
          {keyContacts.length > 0 ? (
            <>
              <Stack spacing={1} mb={1}>
                {keyContacts.map(contact => (
                  <Box key={contact.id}>
                    <Link
                      component={NextLink}
                      href={`/Masters/customers/contacts/${contact.id}`}
                      underline="hover"
                      variant="body2"
                      sx={{ 
                        wordBreak: 'break-word',
                        display: 'inline-block',
                        maxWidth: '100%'
                      }}
                    >
                      {contact.fullName || `${contact.first_name} ${contact.last_name || ''}`}
                    </Link>
                    {contact.job_title && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {contact.job_title}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
              
              {/* View All Contacts Link */}
              <Link
                component="button"
                variant="body2"
                onClick={() => setActiveTab('contacts')}
                sx={{ mt: 1, display: 'inline-block' }}
              >
                {t('accountDetailPage.detailsSidebar.viewAllContacts')}
              </Link>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {t('accountDetailPage.detailsSidebar.noContactsLinked')}
              </Typography>
              
              {/* View All Contacts Link */}
              <Link
                component="button"
                variant="body2"
                onClick={() => setActiveTab('contacts')}
                sx={{ mt: 1, display: 'inline-block' }}
              >
                {t('accountDetailPage.detailsSidebar.viewAllContacts')}
              </Link>
            </>
          )}
        </Box>
        
        {/* Description Section */}
        {accountData.description && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                {t('accountFields.description')}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {accountData.description}
              </Typography>
            </Box>
          </>
        )}
        
        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                {t('accountDetailPage.detailsSidebar.customFields')}
              </Typography>
              <Grid container spacing={1}>
                {customFields.map(({ definition, value }) => (
                  <React.Fragment key={definition.id}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        {definition.field_label}
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {formatCustomFieldValue(definition, value)}
                      </Typography>
                    </Grid>
                  </React.Fragment>
                ))}
              </Grid>
            </Box>
          </>
        )}
        
        {/* System Information Section */}
        <Divider />
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {t('accountDetailPage.detailsSidebar.systemInfo')}
          </Typography>
          <Grid container spacing={1}>
            {/* Created By */}
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                {t('common.createdBy')}
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {accountData.created_by?.full_name || accountData.created_by?.username || t('common.system')}
              </Typography>
            </Grid>
            
            {/* Created At */}
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                {t('common.createdAt')}
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {formatDateTime(accountData.created_at)}
              </Typography>
            </Grid>
            
            {/* Last Modified By */}
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                {t('common.lastModifiedBy')}
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {accountData.updated_by?.full_name || accountData.updated_by?.username || t('common.system')}
              </Typography>
            </Grid>
            
            {/* Last Modified At */}
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                {t('common.lastModifiedAt')}
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {formatDateTime(accountData.updated_at)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </Box>
  );
};

/**
 * Helper function to format custom field values based on field type
 */
const formatCustomFieldValue = (definition: CustomFieldDefinition, value: any): string => {
  const { t } = useTranslation();
  
  if (value === null || value === undefined) {
    return t('common.notAvailable');
  }
  
  switch (definition.field_type) {
    case 'DATE':
      return formatDate(value);
    case 'DATETIME':
      return formatDateTime(value);
    case 'CHECKBOX':
      return value ? t('common.yes') : t('common.no');
    case 'PICKLIST':
      // Find the label for the picklist value
      const picklistItem = definition.picklist_values?.find(item => item.id === value);
      return picklistItem?.label || value;
    case 'NUMBER':
    case 'CURRENCY':
      return typeof value === 'number' 
        ? value.toLocaleString() 
        : value.toString();
    default:
      return value.toString();
  }
};

export default AccountDetailsSidebar;
