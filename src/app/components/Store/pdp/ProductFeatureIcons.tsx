'use client';

import React from 'react';
import { Box, Grid, Typography, Paper, useTheme } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import { useTranslation } from 'react-i18next';

interface FeatureIconProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * Product feature icons component displaying shipping, warranty and support information
 * 
 * @returns React component
 */
export const ProductFeatureIcons = (): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();

  const features: FeatureIconProps[] = [
    {
      icon: <LocalShippingOutlinedIcon fontSize="large" color="primary" />,
      title: t('store.product.freeShipping', 'Free shipping'),
      description: t('store.product.fastDelivery', '3-5 day delivery')
    },
    {
      icon: <VerifiedOutlinedIcon fontSize="large" color="primary" />,
      title: t('store.product.warranty', '2-year warranty'),
      description: t('store.product.warrantyDescription', 'Full coverage')
    },
    {
      icon: <HeadsetMicOutlinedIcon fontSize="large" color="primary" />,
      title: t('store.product.support', '24/7 support'),
      description: t('store.product.supportDescription', 'Always available')
    }
  ];

  const FeatureIcon = ({ icon, title, description }: FeatureIconProps): React.ReactElement => (
    <Grid item xs={12} sm={4}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          height: '100%',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[2]
          }
        }}
      >
        <Box mb={1}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Paper>
    </Grid>
  );

  return (
    <Box my={4}>
      <Grid container spacing={2}>
        {features.map((feature, index) => (
          <FeatureIcon key={index} {...feature} />
        ))}
      </Grid>
    </Box>
  );
};
