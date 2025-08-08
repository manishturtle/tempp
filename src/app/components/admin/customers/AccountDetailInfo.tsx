import { FC } from 'react';
import { Box, Paper, Typography, Divider, Link, Chip, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface AccountDetailInfoProps {
  account: any; // Replace with proper Account interface
}

/**
 * Component for displaying account information in the left column
 * Shows account details, business details, and description
 */
export const AccountDetailInfo: FC<AccountDetailInfoProps> = ({ account }) => {
  const { t } = useTranslation();

  return (
    <Paper sx={{ p: 3, overflow: 'hidden' }}>
      {/* Account Information Section */}
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {t('accountDetailPage.sections.accountInformation')}
      </Typography>
      
      <InfoField 
        label={t('accountDetailPage.fields.accountName')} 
        value={account.name} 
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.customerGroup')} 
        value={account.customer_group?.name} 
        isHighlighted
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.parentAccount')} 
        value={account.parent_account?.name} 
        isLink
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.status')} 
        value={
          <Chip 
            label={account.status} 
            color={account.status === 'Active' ? 'success' : 'default'} 
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />
        } 
        isComponent
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.owner')} 
        value={account.owner} 
        isHighlighted
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.website')} 
        value={account.website} 
        isLink
        isExternal
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.primaryPhone')} 
        value={account.primary_phone} 
      />
      
      <Divider sx={{ my: 3 }} />
      
      {/* Business Details Section */}
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {t('accountDetailPage.sections.businessDetails')}
      </Typography>
      
      <InfoField 
        label={t('accountDetailPage.fields.legalName')} 
        value={account.legal_name} 
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.industry')} 
        value={account.industry} 
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.companySize')} 
        value={account.company_size} 
      />
      
      <InfoField 
        label={t('accountDetailPage.fields.taxId')} 
        value={account.tax_id} 
      />
      
      <Divider sx={{ my: 3 }} />
      
      {/* Description Section */}
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {t('accountDetailPage.sections.description')}
      </Typography>
      
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {account.description || t('common.noData')}
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      {/* System Information */}
      <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        <Typography variant="body2">
          {t('common.createdBy', { name: account.created_by_name })} {t('common.on')} {new Date(account.created_at).toLocaleDateString()}
        </Typography>
        <Typography variant="body2">
          {t('common.lastModifiedBy', { name: account.last_modified_by_name })} {t('common.on')} {new Date(account.updated_at).toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
};

interface InfoFieldProps {
  label: string;
  value: any;
  isLink?: boolean;
  isExternal?: boolean;
  isHighlighted?: boolean;
  isComponent?: boolean;
}

/**
 * Helper component for displaying a label-value pair
 */
const InfoField: FC<InfoFieldProps> = ({ 
  label, 
  value, 
  isLink = false, 
  isExternal = false, 
  isHighlighted = false,
  isComponent = false
}) => {
  if (!value && !isComponent) return null;
  
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      
      {isComponent ? (
        value
      ) : isLink ? (
        <Tooltip title={value} placement="top-start">
          <Link 
            href={isExternal ? value : `#${value}`} 
            target={isExternal ? '_blank' : '_self'}
            rel={isExternal ? 'noopener noreferrer' : ''}
            sx={{ 
              color: 'primary.main', 
              textDecoration: 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            {value}
          </Link>
        </Tooltip>
      ) : (
        <Tooltip title={value} placement="top-start">
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: isHighlighted ? 'medium' : 'regular',
              color: isHighlighted ? 'primary.main' : 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {value || '-'}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
};
