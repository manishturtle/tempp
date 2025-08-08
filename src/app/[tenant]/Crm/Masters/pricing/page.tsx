"use client";

/**
 * Pricing Index Page
 * 
 * This page serves as a navigation hub for all pricing-related pages
 */
import React from 'react';
import { Typography, Box, Grid, Paper, Card, CardContent, CardActionArea, useTheme, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import GroupIcon from '@mui/icons-material/Group';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PublicIcon from '@mui/icons-material/Public';
import PercentIcon from '@mui/icons-material/Percent';
import ReceiptIcon from '@mui/icons-material/Receipt';

export default function PricingIndexPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const sections = [
    {
      title: t('pricing.customerGroups', 'Customer Groups'),
      description: t('pricing.customerGroups.description', 'Manage customer groups and their pricing rules'),
      icon: <GroupIcon fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      path: '/Masters/pricing/customer-groups'
    },
    {
      title: t('pricing.sellingChannels', 'Selling Channels'),
      description: t('pricing.sellingChannels.description', 'Manage selling channels for your products'),
      icon: <StorefrontIcon fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      path: '/Masters/pricing/selling-channels'
    },
    {
      title: t('pricing.taxRegions', 'Tax Regions'),
      description: t('pricing.taxRegions.description', 'Configure tax regions for different geographic areas'),
      icon: <PublicIcon fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      path: '/Masters/pricing/tax-regions'
    },
    {
      title: t('pricing.taxRates', 'Tax Rates'),
      description: t('pricing.taxRates.description', 'Manage tax rates applicable to your products'),
      icon: <PercentIcon fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      path: '/Masters/pricing/tax-rates'
    },
    {
      title: t('pricing.taxRateProfiles', 'Tax Rate Profiles'),
      description: t('pricing.taxRateProfiles.description', 'Configure tax rate profiles for different scenarios'),
      icon: <ReceiptIcon fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      path: '/Masters/pricing/tax-rate-profiles'
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('common.pricing', 'Pricing')}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
          {t('pricing.indexDescription', 'Manage pricing settings, tax configurations, and customer groups for your products')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {sections.map((section) => (
          <Grid item xs={12} sm={6} md={4} key={section.path}>
            <Card 
              elevation={2}
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}
            >
              <CardActionArea 
                onClick={() => router.push(section.path)}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <CardContent sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center',
                  height: '100%'
                }}>
                  <Box sx={{ 
                    mb: 2, 
                    p: 1.5, 
                    borderRadius: '50%', 
                    backgroundColor: `${theme.palette.primary.main}10`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {section.icon}
                  </Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
