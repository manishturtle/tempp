'use client';

/**
 * HierarchyTabContent Component
 * 
 * Displays the account hierarchy (parent and child accounts) in a tree view
 */
import React, { FC } from 'react';
import { Box, Typography, Link, Chip, Paper, Divider } from '@mui/material';
import NextLink from 'next/link';
import { useTranslation } from 'react-i18next';

// Icons
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

// Types
import { AccountDetailData, AccountSummary, ChildAccountSummary } from '@/app/types/account';

interface HierarchyTabContentProps {
  accountData: AccountDetailData;
}

/**
 * HierarchyTabContent component
 * 
 * Displays the account hierarchy using a tree view
 */
const HierarchyTabContent: FC<HierarchyTabContentProps> = ({ accountData }) => {
  const { t } = useTranslation();
  
  // Get status color based on status value
  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'active':
        return { color: 'success.main', bgColor: 'success.lighter' };
      case 'inactive':
        return { color: 'error.main', bgColor: 'error.lighter' };
      case 'new':
        return { color: 'info.main', bgColor: 'info.lighter' };
      case 'prospect':
        return { color: 'warning.main', bgColor: 'warning.lighter' };
      default:
        return { color: 'text.secondary', bgColor: 'action.hover' };
    }
  };
  
  // Ensure child_accounts is always an array
  const childAccounts = accountData.child_accounts || [];
  
  // Check if this is a parent account with no children
  const isParentWithNoChildren = !accountData.parent_account && childAccounts.length === 0;
  
  // Check if this is a top-level parent account (no parent, but has children)
  const isTopLevelParent = !accountData.parent_account && childAccounts.length > 0;
  
  // If this is a parent account with no children yet, show a simplified view
  if (isParentWithNoChildren) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {t('accountDetailPage.hierarchyTab.title')}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        {/* Current Account Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            {t('accountDetailPage.hierarchyTab.currentAccount')}
          </Typography>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              border: '1px solid', 
              borderColor: 'primary.main',
              borderRadius: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                bgcolor: 'primary.main'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                component="img" 
                src="/placeholder-avatar.jpg" 
                alt={accountData.name}
                sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%',
                  mr: 2,
                  bgcolor: 'grey.200'
                }}
              />
              <Box>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {accountData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('accountDetailPage.hierarchyTab.standaloneAccount')}
                </Typography>
              </Box>
              {accountData.status && (
                <Chip
                  label={accountData.status}
                  size="small"
                  sx={{
                    ml: 'auto',
                    bgcolor: getStatusColor(accountData.status).bgColor,
                    color: getStatusColor(accountData.status).color,
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
              )}
            </Box>
          </Paper>
        </Box>
        
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            border: '1px dashed', 
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography sx={{ mb: 1 }}>
              {t('accountDetailPage.hierarchyTab.noHierarchy')}
            </Typography>
          </Box>
          
          {/* Add Child Account Button - Only show if account status is active */}
          {accountData.status && accountData.status.toLowerCase() === 'active' && accountData.id && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Link
                component={NextLink}
                href={`/Masters/customers/accounts/new?parent_id=${accountData.id.toString()}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'primary.main',
                  fontWeight: 500,
                  textDecoration: 'none',
                  py: 1,
                  px: 2,
                  border: '1px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'primary.lighter',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box component="span" sx={{ mr: 0.5, fontSize: '1.25rem' }}>+</Box>
                {t('accountDetailPage.hierarchyTab.addChildAccount')}
              </Link>
            </Box>
          )}
        </Paper>
      </Box>
    );
  }
  
  // No need to determine expanded nodes as we're not using a tree view component
  
  // Parent Account Section
  const renderParentAccountSection = () => {
    if (!accountData.parent_account) return null;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          {t('accountDetailPage.hierarchyTab.parentAccount')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Box 
            component="img" 
            src="/placeholder-avatar.jpg" 
            alt={accountData.parent_account.name}
            sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%',
              mr: 2,
              bgcolor: 'grey.200'
            }}
          />
          <Box>
            <Link
              component={NextLink}
              href={`/Masters/customers/accounts/${accountData.parent_account.id.toString()}`}
              underline="hover"
              color="primary.main"
              sx={{ fontWeight: 500, fontSize: '1rem', display: 'block' }}
            >
              {accountData.parent_account.name}
            </Link>
            <Typography variant="body2" color="text.secondary">
              {t('accountDetailPage.hierarchyTab.globalParentOrganization')}
            </Typography>
          </Box>
          <Chip 
            label={t('accountDetailPage.hierarchyTab.parentCompany')}
            size="small"
            sx={{ 
              ml: 'auto',
              bgcolor: 'primary.lighter',
              color: 'primary.main',
              fontWeight: 500,
              fontSize: '0.75rem'
            }}
          />
        </Box>
      </Box>
    );
  };
  
  // Current Account Section
  const renderCurrentAccountSection = () => {
    return (
      <Box sx={{ mb: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            border: '1px solid', 
            borderColor: 'primary.main',
            borderRadius: 1,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              bgcolor: 'primary.main'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              component="img" 
              src="/placeholder-avatar.jpg" 
              alt={accountData.name}
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%',
                mr: 2,
                bgcolor: 'grey.200'
              }}
            />
            <Box>
              <Typography variant="h6" fontWeight="bold" color="primary.main">
                {accountData.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('accountDetailPage.hierarchyTab.currentAccount')}
              </Typography>
            </Box>
            <Chip
              label={accountData.status}
              size="small"
              sx={{
                ml: 'auto',
                bgcolor: getStatusColor(accountData.status).bgColor,
                color: getStatusColor(accountData.status).color,
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            />
          </Box>
        </Paper>
      </Box>
    );
  };
  
  // Child Accounts Section
  const renderChildAccountsSection = () => {
    if (!accountData.child_accounts || accountData.child_accounts.length === 0) return null;
    
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          {t('accountDetailPage.hierarchyTab.childAccounts')}
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 500, color: '#666', fontSize: '0.875rem' }}>
                  {t('accountDetailPage.hierarchyTab.accountName').toUpperCase()}
                </th>
                <th style={{ textAlign: 'center', padding: '8px 16px', fontWeight: 500, color: '#666', fontSize: '0.875rem' }}>
                  {t('accountDetailPage.hierarchyTab.status').toUpperCase()}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 500, color: '#666', fontSize: '0.875rem' }}>
                  {t('accountDetailPage.hierarchyTab.owner').toUpperCase()}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 500, color: '#666', fontSize: '0.875rem' }}>
                  {t('accountDetailPage.hierarchyTab.location').toUpperCase()}
                </th>
              </tr>
            </thead>
            <tbody>
              {childAccounts.map((child) => (
                <tr key={child.id} style={{ backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        component="img" 
                        src="/placeholder-avatar.jpg" 
                        alt={child.name}
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%',
                          mr: 2,
                          bgcolor: 'grey.200'
                        }}
                      />
                      <Box>
                        <Link
                          component={NextLink}
                          href={`/Masters/customers/accounts/${child.id.toString()}`}
                          underline="hover"
                          color="info.main"
                          sx={{ fontWeight: 500, display: 'block' }}
                        >
                          {child.name}
                        </Link>
                        <Typography variant="body2" color="text.secondary">
                          {t('accountDetailPage.hierarchyTab.regionalBranch')}
                        </Typography>
                      </Box>
                    </Box>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {child.status && (
                      <Chip
                        label={child.status}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(child.status).bgColor,
                          color: getStatusColor(child.status).color,
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Typography variant="body2">
                      {child.owner || t('accountDetailPage.hierarchyTab.noOwner')}
                    </Typography>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Typography variant="body2">
                      {child.location || t('accountDetailPage.hierarchyTab.noLocation')}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    );
  };
  
  // Render visual hierarchy representation
  const renderVisualHierarchy = () => {
    // Always show visual hierarchy, even for top-level parents
    // The visualization will adapt based on the account's position in the hierarchy
    
    // Skip visual hierarchy for parent accounts with no children
    if (isParentWithNoChildren) {
      return null;
    }
    
    return (
      <Box sx={{ my: 4, position: 'relative' }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          {t('accountDetailPage.hierarchyTab.title')}
        </Typography>
        
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider' }}>
          {/* Top-level indicator for accounts with no parent */}
          {!accountData.parent_account && isTopLevelParent && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  bgcolor: 'background.paper',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px dashed',
                  borderColor: 'divider'
                }}
              >
                {t('accountDetailPage.hierarchyTab.topLevelParent')}
              </Typography>
            </Box>
          )}
          
          {/* Parent Account Node */}
          {accountData.parent_account && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  width: 'fit-content', 
                  minWidth: 200,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderRadius: 1,
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 2,
                    height: 24,
                    bgcolor: 'divider'
                  }
                }}
              >
                <BusinessIcon color="primary" />
                <Link
                  component={NextLink}
                  href={`/Masters/customers/accounts/${accountData.parent_account.id.toString()}`}
                  underline="hover"
                  color="primary.main"
                  sx={{ fontWeight: 500 }}
                >
                  {accountData.parent_account.name}
                </Link>
              </Paper>
            </Box>
          )}
          
          {/* Current Account Node */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            mb: accountData.child_accounts?.length ? 4 : 0,
            position: 'relative'
          }}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                width: 'fit-content', 
                minWidth: 250,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: 1,
                bgcolor: 'primary.lighter',
                border: '2px solid',
                borderColor: 'primary.main',
                position: 'relative',
                '&::after': accountData.child_accounts?.length ? {
                  content: '""',
                  position: 'absolute',
                  bottom: -24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 2,
                  height: 24,
                  bgcolor: 'divider'
                } : {}
              }}
            >
              <AccountBalanceIcon color="primary" />
              <Typography fontWeight="bold" color="primary.main">
                {accountData.name}
              </Typography>
              {accountData.status && (
                <Chip
                  label={accountData.status}
                  size="small"
                  sx={{
                    ml: 1,
                    bgcolor: getStatusColor(accountData.status).bgColor,
                    color: getStatusColor(accountData.status).color,
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
              )}
            </Paper>
          </Box>
          
          {/* Child Account Nodes */}
          {childAccounts.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 3,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -24,
                left: '10%',
                right: '10%',
                height: 2,
                bgcolor: 'divider'
              }
            }}>
              {childAccounts.map((child) => (
                <Paper 
                  key={child.id}
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    width: 'fit-content', 
                    minWidth: 180,
                    maxWidth: 250,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRadius: 1,
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -24,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 2,
                      height: 24,
                      bgcolor: 'divider'
                    }
                  }}
                >
                  <AccountTreeIcon color="info" />
                  <Box>
                    <Link
                      component={NextLink}
                      href={`/Masters/customers/accounts/${child.id.toString()}`}
                      underline="hover"
                      color="info.main"
                      sx={{ fontWeight: 500, display: 'block' }}
                    >
                      {child.name}
                    </Link>
                    {child.status && (
                      <Chip
                        label={child.status}
                        size="small"
                        sx={{
                          mt: 0.5,
                          bgcolor: getStatusColor(child.status).bgColor,
                          color: getStatusColor(child.status).color,
                          fontWeight: 500,
                          fontSize: '0.65rem'
                        }}
                      />
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {t('accountDetailPage.hierarchyTab.title')}
        </Typography>
        <Divider />
      </Box>
      
      {/* Main Content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Parent Account Section */}
        {renderParentAccountSection()}
        
        {/* Current Account Section */}
        {renderCurrentAccountSection()}
        
        {/* Visual Hierarchy Representation */}
        {renderVisualHierarchy()}
        
        {/* Child Accounts Section */}
        {renderChildAccountsSection()}
      </Box>
      
      {/* Add Child Account Button - Only show if account status is active */}
      {accountData.status && accountData.status.toLowerCase() === 'active' && accountData.id && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            component={NextLink}
            href={`/Masters/customers/accounts/new?parent_id=${accountData.id.toString()}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'primary.main',
              fontWeight: 500,
              textDecoration: 'none',
              py: 1,
              px: 2,
              border: '1px solid',
              borderColor: 'primary.main',
              borderRadius: 1,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'primary.lighter',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }
            }}
          >
            <Box component="span" sx={{ mr: 0.5, fontSize: '1.25rem' }}>+</Box>
            {t('accountDetailPage.hierarchyTab.addChildAccount')}
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default HierarchyTabContent;
