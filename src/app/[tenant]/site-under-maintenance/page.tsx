'use client';
// Site-under-maintenance/page.tsx
import React, { type FC, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

/**
 * Renders the tenant's logo based on theme mode and tenant slug from the URL.
 * Falls back to a default logo if not found in localStorage.
 * @param t - translation function for alt text
 */
const TenantLogo: FC<{ t: any }> = ({ t }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState<string>('Tenant logo');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathParts = window.location.pathname.split('/');
    const tenantSlug = pathParts[1] || '';
    if (!tenantSlug) return;
    const themeMode = localStorage.getItem(`${tenantSlug}_themeMode`) || 'light';
    const logoKey = themeMode === 'dark' ? `${tenantSlug}_logoDark` : `${tenantSlug}_logoLight`;
    const logo = localStorage.getItem(logoKey);
    setLogoUrl(logo || '/images/default-logo.png');
    setAltText(t('siteMaintenance.logoAlt', 'Tenant logo'));
  }, [t]);

  return logoUrl ? (
    <Image
      src={logoUrl}
      alt={altText}
      fill
      style={{ objectFit: 'contain' }}
      sizes="80px"
      priority
    />
  ) : null;
};

/**
 * Custom hook to get tenant name from localStorage
 */
const useTenantName = () => {
  const [tenantName, setTenantName] = useState<string>('Sleeknote');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathParts = window.location.pathname.split('/');
    const tenantSlug = pathParts[1] || '';
    if (!tenantSlug) return;
    
    const tenantInfoKey = `${tenantSlug}_tenantInfo`;
    const tenantInfoStr = localStorage.getItem(tenantInfoKey);
    
    if (tenantInfoStr) {
      try {
        const tenantInfo = JSON.parse(tenantInfoStr);
        const schema = tenantInfo.tenant_schema || tenantSlug;
        setTenantName(schema);
      } catch (e) {
        console.error('Error parsing tenant info:', e);
        setTenantName(tenantSlug);
      }
    } else {
      setTenantName(tenantSlug);
    }
  }, []);

  return tenantName;
};


/**
 * Site under maintenance page using MUI (Material UI) components.
 * All text uses translation keys for i18n.
 * @returns {JSX.Element} Maintenance page
 */
const SiteUnderMaintenancePage: FC = () => {
  const { t } = useTranslation();
  const tenantName = useTenantName();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        color: '#4a5568',
        fontFamily: 'Roboto, sans-serif',
        justifyContent: 'space-between',
        p: { xs: 2, sm: 4 },
      }}
      data-testid="site-under-maintenance-root"
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
        sx={{ mb: 4 }}
        component="header"
        aria-label={t('siteMaintenance.headerAria', 'Site logo and name')}
      >
        <Box sx={{ width: 80, height: 80, position: 'relative' }}>
          <TenantLogo t={t} />
        </Box>
      </Stack>
      {/* Main Content */}
      <Container
        maxWidth="sm"
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        component="main"
        aria-label={t('siteMaintenance.mainAria', 'Maintenance message and illustration')}
      >
        <Typography
          variant="h3"
          fontWeight={700}
          color="#2d3748"
          sx={{ mb: 2, fontFamily: 'Roboto, sans-serif', textAlign: 'center' }}
        >
          {t('siteMaintenance.title', "We'll Be Back Soon")}
        </Typography>
        <Typography
          variant="body1"
          sx={{ fontSize: '1.125rem', color: '#718096', maxWidth: 480, mb: 4, textAlign: 'center' }}
        >
          {t('siteMaintenance.subtitle', `${tenantName} is undergoing scheduled maintenance and should be back soon`)}
        </Typography>
        <Box sx={{ width: '100%', maxWidth: 500, mb: 4 }}>
          <Image
            src="/images/site-under-Maintenance.png"
            alt={t('siteMaintenance.illustrationAlt', 'Site under maintenance illustration')}
            width={500}
            height={320}
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            className="illustration"
            priority
          />
        </Box>
      </Container>
      
    </Box>
  );
}
export default SiteUnderMaintenancePage;
