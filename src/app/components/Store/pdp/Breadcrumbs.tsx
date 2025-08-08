'use client';

import React from 'react';
import { Box, Breadcrumbs as MuiBreadcrumbs, Typography, Link, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';

interface BreadcrumbsProps {
  category?: string;
  productName: string;
}

/**
 * Breadcrumbs component for product detail page navigation
 * 
 * @param props - Component props
 * @returns React component
 */
export const Breadcrumbs = ({
  category,
  productName
}: BreadcrumbsProps): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const params = useParams();
  const tenant = params?.tenant as string || '';

  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-ol': {
            alignItems: 'center'
          }
        }}
      >
        <Link 
          component={NextLink} 
          href="/"
          underline="hover"
          color="inherit"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '0.875rem'
          }}
        >
          {t('Home', 'Home')}
        </Link>
        
        <Link 
          component={NextLink} 
          href={`/${tenant}`}
          underline="hover"
          color="inherit"
          sx={{ fontSize: '0.875rem', textTransform: 'capitalize' }}
        >
          {tenant || t('store.title', 'Store')}
        </Link>
        
        <Link 
          component={NextLink} 
          href={`/${tenant}/store`}
          underline="hover"
          color="inherit"
          sx={{ fontSize: '0.875rem' }}
        >
          {t('store.title', 'Store')}
        </Link>
        
        <Link 
          component={NextLink} 
          href={`/${tenant}/store/product`}
          underline="hover"
          color="inherit"
          sx={{ fontSize: '0.875rem' }}
        >
          {t('store.products', 'Products')}
        </Link>
        
        {category && (
          <Link 
            component={NextLink} 
            href={`/${tenant}/store?category=${encodeURIComponent(category)}`}
            underline="hover"
            color="inherit"
            sx={{ fontSize: '0.875rem' }}
          >
            {category}
          </Link>
        )}
        
        <Typography 
          color="text.primary" 
          sx={{ 
            fontSize: '0.875rem',
            fontWeight: 500,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {productName}
        </Typography>
      </MuiBreadcrumbs>
    </Box>
  );
};
